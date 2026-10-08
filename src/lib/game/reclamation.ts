import {
  BulldozerThreat,
  CurrencyLedgerEntry,
  ReclamationEvent,
  World,
  WorldObject,
} from '@/types/game';
import { GAME_CONFIG } from './config';
import { canAfford, createLedgerEntry } from './economy';
import { gridToWorld } from './worldRules';

export interface ReclamationCheckResult {
  shouldReclaim: boolean;
  inactivityHours: number;
  reason?: string;
}

/**
 * Checks if the world is eligible for reclamation due to user inactivity.
 */
export function checkReclamationEligibility(
  lastFocusCompletedAt: string | null,
  devFastMode = false
): ReclamationCheckResult {
  if (!lastFocusCompletedAt) {
    // If no session ever completed, we check if world has objects to reclaim
    return { shouldReclaim: false, inactivityHours: 0, reason: 'No focus session completed yet' };
  }

  const lastTime = new Date(lastFocusCompletedAt).getTime();
  const now = Date.now();
  const diffMs = now - lastTime;
  const elapsedHours = diffMs / (1000 * 60 * 60);

  const thresholdMs = devFastMode
    ? GAME_CONFIG.reclamation.devFastInactivityMinutes * 60 * 1000
    : GAME_CONFIG.reclamation.inactivityHours * 60 * 60 * 1000;

  if (diffMs >= thresholdMs) {
    return {
      shouldReclaim: true,
      inactivityHours: Number(elapsedHours.toFixed(1)),
    };
  }

  return {
    shouldReclaim: false,
    inactivityHours: Number(elapsedHours.toFixed(1)),
    reason: `Inactivity duration not yet reached (${elapsedHours.toFixed(2)}h / ${
      devFastMode ? '0.08h dev' : '48h'
    })`,
  };
}

export interface ReclamationExecutionResult {
  triggered: boolean;
  affectedObjects: WorldObject[];
  event?: ReclamationEvent;
  updatedWorld?: Partial<World>;
}

/**
 * MOSS OVERGROWTH (TIER 1) - DISABLED IN FAVOR OF BULLDOZER MECHANIC
 */
export function executeReclamation(
  _objects: WorldObject[],
  _lastFocusCompletedAt: string | null,
  _devFastMode = false
): ReclamationExecutionResult {
  // MOSS DISABLED TEMP - Moss logic disabled; replaced with Bulldozer Threat system
  return { triggered: false, affectedObjects: [] };
}

export interface BulldozerReclamationResult {
  triggered: boolean;
  tier: 1 | 2; // 1 = Warning threat (bulldozer arrived, tree marked), 2 = Clearance (tree chopped to stump)
  affectedObjects: WorldObject[];
  bulldozer: BulldozerThreat | null;
  event?: ReclamationEvent;
  ledgerEntry?: CurrencyLedgerEntry;
  updatedWorld?: Partial<World>;
  message?: string;
}

/**
 * Checks whether an active Tier 1 bulldozer threat has waited long enough (24h grace period,
 * or 3m in devFastMode) before escalating to Tier 2 tree clearance.
 */
export function canExecuteBulldozerTier2(
  bulldozer: BulldozerThreat | null | undefined,
  devFastMode = false,
  nowMs: number = Date.now()
): boolean {
  if (!bulldozer || !bulldozer.active) return false;
  if (!bulldozer.spawned_at) return true;

  const spawnedMs = new Date(bulldozer.spawned_at).getTime();
  const elapsedMs = nowMs - spawnedMs;
  const graceHours =
    GAME_CONFIG.reclamation.bulldozer_clear_time_hours - GAME_CONFIG.reclamation.inactivityHours; // 72 - 48 = 24h
  const graceDevMinutes =
    GAME_CONFIG.reclamation.devFastClearMinutes - GAME_CONFIG.reclamation.devFastInactivityMinutes; // 8 - 5 = 3m

  const requiredGraceMs = devFastMode
    ? graceDevMinutes * 60 * 1000
    : graceHours * 60 * 60 * 1000;

  return elapsedMs >= requiredGraceMs;
}

/**
 * Executes Bulldozer Reclamation deterministically:
 * - Tier 1: Picks 1 oldest active tree, marks it 'marked_for_clearing', spawns bulldozer at edge with 2 cones.
 * - Tier 2: If bulldozer is already active upon subsequent inactivity, tree is cleared into a stump.
 */
export function triggerBulldozerReclamation(
  objects: WorldObject[],
  currentBulldozer: BulldozerThreat | null | undefined,
  lastFocusCompletedAt: string | null,
  devFastMode = false
): BulldozerReclamationResult {
  const eligibility = checkReclamationEligibility(lastFocusCompletedAt, devFastMode);
  if (!eligibility.shouldReclaim) {
    return {
      triggered: false,
      tier: 1,
      affectedObjects: objects,
      bulldozer: currentBulldozer || null,
    };
  }

  const now = new Date().toISOString();

  // TIER 2: If bulldozer is already on site and inactivity persists, clear the marked tree into a stump & seal its tile
  if (currentBulldozer && currentBulldozer.active) {
    const targetTree = objects.find(
      (o) => o.id === currentBulldozer.target_tree_id && o.status === 'marked_for_clearing'
    );

    if (targetTree) {
      const sealedTileCoord =
        currentBulldozer.threatened_tile || `${targetTree.grid_x},${targetTree.grid_y}`;

      const updatedObjects: WorldObject[] = objects.map((obj) => {
        if (obj.id === targetTree.id) {
          return {
            ...obj,
            object_type: 'rock' as const, // Stump treated as decorative timber/rock that can be restored
            model_variant: 'nature_stump',
            status: 'reclaimed' as const,
            reclaimed_at: now,
          };
        }
        return obj;
      });

      const event: ReclamationEvent = {
        id: `bulldozer_cleared_${Date.now()}`,
        triggered_at: now,
        inactivity_hours: eligibility.inactivityHours,
        objects_affected: [targetTree.id],
      };

      const ledgerEntry: CurrencyLedgerEntry = {
        id: `ledger_clear_${Date.now()}`,
        currency: 'gold',
        amount: 0,
        reason: 'bulldozer_cleared',
        reference_id: targetTree.id,
        created_at: now,
        severity: 'error',
        message: 'Kru Bulldozer menebang pohon menjadi tunggul & menyegel petak akibat inaktif 72 jam',
      };

      return {
        triggered: true,
        tier: 2,
        affectedObjects: updatedObjects,
        bulldozer: null, // Bulldozer leaves after clearing
        event,
        ledgerEntry,
        message: `Kru Bulldozer menebang pohon menjadi tunggul & menyegel petak (${sealedTileCoord}) karena inaktif >72 jam!`,
        updatedWorld: {
          bulldozer: null,
          last_reclamation_at: now,
          sealed_tiles: [sealedTileCoord],
        },
      };
    }
  }

  // TIER 1: Spawn Bulldozer Warning Threat (48h Inactivity)
  // Check if any tree is already marked
  const alreadyMarked = objects.find((o) => o.status === 'marked_for_clearing');
  if (alreadyMarked && currentBulldozer?.active) {
    // Only 1 bulldozer threat at a time
    return {
      triggered: false,
      tier: 1,
      affectedObjects: objects,
      bulldozer: currentBulldozer,
    };
  }

  // Pick 1 oldest active tree (not already marked)
  const candidateTrees = objects.filter(
    (o) => o.object_type === 'tree' && o.status === 'active'
  );

  if (candidateTrees.length === 0) {
    return {
      triggered: false,
      tier: 1,
      affectedObjects: objects,
      bulldozer: null,
      message: 'No active trees to survey.',
    };
  }

  // Sort deterministically by created_at ASC (oldest first)
  const oldestTree = [...candidateTrees].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )[0];

  const [treeX, , treeZ] = gridToWorld(oldestTree.grid_x, oldestTree.grid_y, 0.05);

  // Position bulldozer at island edge (x = 4.25 or -4.25) facing the tree
  const edgeX = treeX >= 0 ? 4.25 : -4.25;
  const edgeZ = Math.max(-4.2, Math.min(4.2, treeZ));
  const rotY = Math.atan2(treeX - edgeX, treeZ - edgeZ);

  // 2 construction cones around the tree
  const conePositions: [[number, number, number], [number, number, number]] = [
    [treeX + 0.42, 0.05, treeZ + 0.38],
    [treeX - 0.42, 0.05, treeZ - 0.38],
  ];

  const threatenedCoord = `${oldestTree.grid_x},${oldestTree.grid_y}`;

  const bulldozer: BulldozerThreat = {
    active: true,
    target_tree_id: oldestTree.id,
    threatened_tile: threatenedCoord,
    position: [edgeX, 0.05, edgeZ],
    rotation: rotY,
    cone_positions: conePositions,
    spawned_at: now,
  };

  const affectedObjects = objects.map((obj) => {
    if (obj.id === oldestTree.id) {
      return {
        ...obj,
        status: 'marked_for_clearing' as const,
      };
    }
    return obj;
  });

  const event: ReclamationEvent = {
    id: `bulldozer_threat_${Date.now()}`,
    triggered_at: now,
    inactivity_hours: eligibility.inactivityHours,
    objects_affected: [oldestTree.id],
  };

  const ledgerEntry: CurrencyLedgerEntry = {
    id: `ledger_threat_${Date.now()}`,
    currency: 'gold',
    amount: 0,
    reason: 'bulldozer_threat',
    reference_id: oldestTree.id,
    created_at: now,
    severity: 'warning',
    message: 'Kru Bulldozer menyurvei hutan & mengancam menyegel petak karena inaktif 48 jam',
  };

  return {
    triggered: true,
    tier: 1,
    affectedObjects,
    bulldozer,
    event,
    ledgerEntry,
    message: `⚠️ Inaktif 48 Jam: Kru Bulldozer memasang cone di petak (${threatenedCoord})! Selesaikan 1 sesi fokus untuk mengusirnya.`,
    updatedWorld: {
      bulldozer,
      last_reclamation_at: now,
    },
  };
}

export interface BribeBulldozerResult {
  success: boolean;
  error?: string;
  updatedObjects: WorldObject[];
  ledgerEntry?: CurrencyLedgerEntry;
  updatedWorld?: Partial<World>;
}

/**
 * Bribes construction crew for 40 Gold to dismiss bulldozer and unmark tree.
 */
export function bribeBulldozer(
  objects: WorldObject[],
  ledger: CurrencyLedgerEntry[],
  bulldozer: BulldozerThreat | null | undefined
): BribeBulldozerResult {
  if (!bulldozer || !bulldozer.active) {
    return { success: false, error: 'No active bulldozer threat.', updatedObjects: objects };
  }

  const cost = GAME_CONFIG.reclamation.bulldozer_mark_cost; // 40 Soul
  if (!canAfford(ledger, cost)) {
    return {
      success: false,
      error: `Soul tidak cukup. Butuh ${cost} Soul untuk menghalau kru konstruksi.`,
      updatedObjects: objects,
    };
  }

  const updatedObjects = objects.map((obj) => {
    if (obj.id === bulldozer.target_tree_id && obj.status === 'marked_for_clearing') {
      return {
        ...obj,
        status: 'active' as const,
      };
    }
    return obj;
  });

  const ledgerEntry = createLedgerEntry(
    'gold',
    -cost,
    'bribe_bulldozer_crew',
    bulldozer.target_tree_id
  );

  return {
    success: true,
    updatedObjects,
    ledgerEntry,
    updatedWorld: {
      bulldozer: null,
    },
  };
}

/**
 * Dismisses bulldozer and unseals any sealed tiles when user completes a mindful focus session.
 */
export function dismissBulldozerViaFocus(
  objects: WorldObject[],
  bulldozer: BulldozerThreat | null | undefined
): { updatedObjects: WorldObject[]; updatedWorld: Partial<World> } {
  if (!bulldozer || !bulldozer.active) {
    return {
      updatedObjects: objects,
      updatedWorld: {
        sealed_tiles: [],
      },
    };
  }

  const updatedObjects = objects.map((obj) => {
    if (obj.id === bulldozer.target_tree_id && obj.status === 'marked_for_clearing') {
      return {
        ...obj,
        status: 'active' as const,
      };
    }
    return obj;
  });

  return {
    updatedObjects,
    updatedWorld: {
      bulldozer: null,
      sealed_tiles: [],
    },
  };
}

export interface RestoreResult {
  success: boolean;
  error?: string;
  updatedObject?: WorldObject;
  ledgerEntry?: CurrencyLedgerEntry;
}

/**
 * Restores a reclaimed object (or withered/bulldozed stump) back to active status for GAME_CONFIG.restore Soul (30 Soul).
 */
export function restoreObject(
  objectId: string,
  objects: WorldObject[],
  ledger: CurrencyLedgerEntry[]
): RestoreResult {
  const target = objects.find((obj) => obj.id === objectId);
  if (!target) {
    return { success: false, error: 'Objek tidak ditemukan di pulau.' };
  }

  if (target.status !== 'reclaimed') {
    return { success: false, error: 'Objek ini tidak dalam kondisi layu/rusak.' };
  }

  const cost = GAME_CONFIG.restore;
  if (!canAfford(ledger, cost)) {
    return {
      success: false,
      error: `Soul tidak cukup. Butuh ${cost} Soul untuk merestorasi petak ini.`,
    };
  }

  const isStump = target.model_variant === 'nature_stump';
  let restoredVariant = target.model_variant;
  if (isStump) {
    const sp = target.species || 'oak';
    if (sp === 'pine') restoredVariant = 'tree_pineDefaultA';
    else if (sp === 'autumn') restoredVariant = 'tree_oak_fall';
    else if (sp === 'palm') restoredVariant = 'tree_palm';
    else if (sp === 'ancient') restoredVariant = 'tree_detailed';
    else restoredVariant = 'tree_oak';
  }

  const updatedObject: WorldObject = {
    ...target,
    object_type: isStump ? 'tree' : target.object_type,
    model_variant: restoredVariant,
    status: 'active',
    reclaimed_at: null,
  };

  const ledgerEntry = createLedgerEntry(
    'gold',
    -cost,
    'restore_reclaimed_object',
    objectId
  );

  return {
    success: true,
    updatedObject,
    ledgerEntry,
  };
}
