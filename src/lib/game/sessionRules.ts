import {
  CurrencyLedgerEntry,
  FocusSession,
  FocusTag,
  TreeSpecies,
  World,
  WorldObject,
} from '@/types/game';
import { FOCUS_PRESETS, GAME_CONFIG, TREE_SPECIES_CONFIG } from './config';
import { createLedgerEntry } from './economy';
import { findEmptyTileNearCenter, isTileOccupied, isValidCoord } from './worldRules';

/**
 * Calculates Gold and XP rewards scaled by focus duration.
 * - 15m -> 15 Gold, 60 XP (0.6x)
 * - 25m (or <5m devFast test) -> 25 Gold, 100 XP (1.0x)
 * - 45m -> 45 Gold, 180 XP (1.8x)
 * - 60m -> 65 Gold, 250 XP (2.5x + marathon bonus)
 */
export function calculateFocusRewards(durationMinutes?: number): { gold: number; xp: number } {
  const baseGold = GAME_CONFIG.focus.baseGold; // 25
  const baseXp = GAME_CONFIG.focus.baseXp; // 100

  // Sessions under 5 minutes do not produce Soul or XP
  if (!durationMinutes || durationMinutes < 5) {
    return { gold: 0, xp: 0 };
  }

  if (durationMinutes === 25) {
    return { gold: baseGold, xp: baseXp };
  }

  if (durationMinutes === 60) {
    return { gold: 65, xp: 250 };
  }

  const preset = FOCUS_PRESETS.find((p) => p.minutes === durationMinutes);
  const multiplier = preset ? preset.rewardMultiplier : durationMinutes / 25;

  return {
    gold: Math.max(5, Math.round(baseGold * multiplier)),
    xp: Math.max(20, Math.round(baseXp * multiplier)),
  };
}

export interface StartSessionParams {
  durationSeconds?: number;
  tag?: FocusTag;
  species?: TreeSpecies;
  strictMode?: boolean;
  taskNote?: string;
  todoId?: string;
  isStopwatch?: boolean;
  targetTile?: { grid_x: number; grid_y: number };
  noTree?: boolean;
}

export function startFocusSession({
  durationSeconds = GAME_CONFIG.focus.defaultDurationSec,
  tag = 'Belajar',
  species = 'oak',
  strictMode = false,
  taskNote,
  todoId,
  isStopwatch = false,
  targetTile,
  noTree = false,
}: StartSessionParams = {}): FocusSession {
  const now = new Date();
  const startedAt = now.toISOString();
  const expectedEndAt = new Date(now.getTime() + durationSeconds * 1000).toISOString();
  const durationMinutes = isStopwatch ? 0 : Math.max(1, Math.round(durationSeconds / 60));
  const cleanNote = taskNote?.trim() ? taskNote.trim() : undefined;

  return {
    id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    started_at: startedAt,
    expected_end_at: expectedEndAt,
    completed_at: null,
    status: 'active',
    rewarded: false,
    tag,
    species,
    strict_mode: strictMode,
    duration_minutes: durationMinutes,
    task_note: cleanNote,
    todo_id: todoId || undefined,
    is_stopwatch: isStopwatch,
    target_tile: targetTile,
    no_tree: noTree,
  };
}

/** Actual focus time, frozen at the current pause and excluding earlier pauses. */
export function getFocusedElapsedMs(session: FocusSession, now = Date.now()): number {
  const reference = session.is_paused && session.paused_at ? Date.parse(session.paused_at) : now;
  const elapsed = reference - Date.parse(session.started_at) - (session.total_paused_ms ?? 0);
  return Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
}

/** Remaining ms for countdown focus, frozen while paused. Returns 0 for stopwatch mode. */
export function getRemainingMs(session: FocusSession, now = Date.now()): number {
  if (session.is_stopwatch) return 0;
  if (session.is_paused) {
    if (typeof session.paused_remaining_ms === 'number' && Number.isFinite(session.paused_remaining_ms)) {
      return Math.max(0, session.paused_remaining_ms);
    }
    const pausedAt = session.paused_at ? Date.parse(session.paused_at) : now;
    const expected = Date.parse(session.expected_end_at);
    return Math.max(0, expected - (Number.isFinite(pausedAt) ? pausedAt : now));
  }
  const expected = Date.parse(session.expected_end_at);
  return Number.isFinite(expected) ? Math.max(0, expected - now) : 0;
}

/**
 * Display seconds formatted as MM:SS.
 * For countdown: uses Math.ceil on remaining ms so 04:50 remains 04:50 until the full second ticks away.
 * For stopwatch: uses Math.floor on focused elapsed ms.
 */
export function getRemainingDisplaySeconds(session: FocusSession, now = Date.now()): number {
  if (session.is_stopwatch) {
    return Math.floor(getFocusedElapsedMs(session, now) / 1000);
  }
  const remainingMs = getRemainingMs(session, now);
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

/**
 * Normalized progress ratio [0..1] for session progress bars and 3D sapling growth.
 * Properly frozen during pause, accounting for total_paused_ms.
 */
export function getProgressRatio(session: FocusSession, now = Date.now()): number {
  if (session.is_stopwatch) {
    const elapsed = getFocusedElapsedMs(session, now);
    return Math.min(1, Math.max(0, elapsed / 300000));
  }
  const start = Date.parse(session.started_at);
  const expected = Date.parse(session.expected_end_at);
  if (!Number.isFinite(start) || !Number.isFinite(expected)) return 0;
  const total = Math.max(1000, expected - start - (session.total_paused_ms ?? 0));
  const elapsed = getFocusedElapsedMs(session, now);
  return Math.min(1, Math.max(0, elapsed / total));
}
export function abandonFocusSession(session: FocusSession): FocusSession {
  if (session.status !== 'active') {
    return session;
  }

  return {
    ...session,
    status: 'abandoned',
    completed_at: new Date().toISOString(),
    rewarded: false,
  };
}

export interface CompleteSessionResult {
  success: boolean;
  error?: string;
  updatedSession: FocusSession;
  newLedgerEntries: CurrencyLedgerEntry[];
  newWorldObject?: WorldObject;
  updatedWorld?: Partial<World>;
  rewardGold: number;
  rewardXp: number;
}

/**
 * Validates and completes a focus session with strict server/engine rules.
 * Idempotent: duplicate calls with already-rewarded session return success: false without duplicating rewards.
 */
export function completeFocusSession(
  session: FocusSession,
  existingObjects: WorldObject[],
  unlockedTiles?: Set<string>,
  verifiedCampfireBonus = false,
): CompleteSessionResult {
  const now = Date.now();
  const expectedEnd = new Date(session.expected_end_at).getTime();
  const startedAt = new Date(session.started_at).getTime();
  const pausedMs = session.total_paused_ms ?? 0;
  if (session.is_paused || !Number.isFinite(startedAt) || !Number.isFinite(expectedEnd) ||
      !Number.isFinite(pausedMs) || pausedMs < 0 || now < startedAt ||
      expectedEnd < startedAt || pausedMs > now - startedAt) {
    return {
      success: false,
      error: 'Session is paused or its timing cannot be verified.',
      updatedSession: session,
      newLedgerEntries: [],
      rewardGold: 0,
      rewardXp: 0,
    };
  }

  // 1. Idempotency check: Cannot reward if already completed or rewarded
  if (session.status === 'completed' || session.rewarded) {
    return {
      success: false,
      error: 'Session has already been completed and rewarded.',
      updatedSession: session,
      newLedgerEntries: [],
      rewardGold: 0,
      rewardXp: 0,
    };
  }

  if (session.status === 'abandoned') {
    return {
      success: false,
      error: 'Cannot complete an abandoned session.',
      updatedSession: session,
      newLedgerEntries: [],
      rewardGold: 0,
      rewardXp: 0,
    };
  }

  const elapsedSeconds = getFocusedElapsedMs(session, now) / 1000;

  // Special Handling for Durasi Bebas (Stopwatch Mode):
  // User can tap "Selesai" whenever they want, but to sprout a mature tree & earn Soul/XP,
  // the elapsed focus time MUST be at least 5 minutes (300 seconds).
  if (session.is_stopwatch && elapsedSeconds < 300) {
    const elapsedMins = Math.max(1, Math.round(elapsedSeconds / 60));
    return {
      success: true,
      error: 'Sesi di bawah 5 menit tidak menumbuhkan pohon suaka.',
      updatedSession: {
        ...session,
        duration_minutes: elapsedMins,
        status: 'completed',
        completed_at: new Date().toISOString(),
        rewarded: false,
      },
      newLedgerEntries: [],
      newWorldObject: undefined, // NO TREE
      rewardGold: 0,
      rewardXp: 0,
    };
  }

  // 2. Strict timestamp verification
  // 3.0s tolerance for clock jitter/rounding and instant user click
  if (!session.is_stopwatch && now < expectedEnd - 3000) {
    const remainingSec = Math.ceil((expectedEnd - now) / 1000);
    return {
      success: false,
      error: `Focus time not yet reached. ${remainingSec}s remaining.`,
      updatedSession: session,
      newLedgerEntries: [],
      rewardGold: 0,
      rewardXp: 0,
    };
  }

  const completedAt = new Date().toISOString();
  const actualElapsedMinutes = Math.max(
    1,
    Math.round(elapsedSeconds / 60)
  );
  const minutesForReward = session.is_stopwatch
    ? actualElapsedMinutes
    : (session.duration_minutes || actualElapsedMinutes);

  // 3. Mark session as completed and rewarded
  const updatedSession: FocusSession = {
    ...session,
    duration_minutes: minutesForReward,
    status: 'completed',
    completed_at: completedAt,
    rewarded: true,
  };

  // 4. Generate currency ledger entries (+Gold, +XP) scaled by session duration
  let { gold: rewardGold, xp: rewardXp } = calculateFocusRewards(minutesForReward);

  // Fase 5: Sinergi Hangat Api Unggun (+20% Soul & XP bonus)
  if (verifiedCampfireBonus && session.campfire_room_code && rewardGold > 0 && rewardXp > 0) {
    rewardGold = Math.max(5, Math.round(rewardGold * 1.2));
    rewardXp = Math.max(20, Math.round(rewardXp * 1.2));
  }

  const goldEntry = createLedgerEntry(
    'gold',
    rewardGold,
    'focus_session_completed',
    session.id
  );

  const xpEntry = createLedgerEntry(
    'xp',
    rewardXp,
    'focus_session_completed',
    session.id
  );

  // Stable completion identities allow the existing ID merge to deduplicate replay.
  goldEntry.id = 'ledger_focus_' + session.id + '_gold';
  xpEntry.id = 'ledger_focus_' + session.id + '_xp';

  // 5. Spawn a persistent tree at empty center tile with selected species variant
  // A reserved target can become occupied or locked while a session is running.
  const target = session.target_tile;
  const validTarget = target && isValidCoord(target.grid_x, target.grid_y) &&
    (!unlockedTiles || unlockedTiles.has(`${target.grid_x},${target.grid_y}`)) &&
    !isTileOccupied(target.grid_x, target.grid_y, existingObjects);
  const emptyTile = validTarget ? target : findEmptyTileNearCenter(existingObjects, unlockedTiles);
  let newWorldObject: WorldObject | undefined;

  if (!session.no_tree && emptyTile) {
    const species = session.species || 'oak';
    const speciesCfg = TREE_SPECIES_CONFIG.find((s) => s.id === species);
    const variant = speciesCfg?.modelVariant || 'tree_oak';

    const companionSuffix =
      session.companions && session.companions.length > 0
        ? ` (Bersama ${session.companions.join(', ')})`
        : '';
    const initialNote = session.task_note || (session.campfire_room_code ? 'Pohon Persahabatan Api Unggun' : undefined);
    const fullNote = initialNote ? `${initialNote}${companionSuffix}` : undefined;

    newWorldObject = {
      id: `obj_tree_${session.id}`,
      object_type: 'tree',
      grid_x: emptyTile.grid_x,
      grid_y: emptyTile.grid_y,
      rotation: Math.floor(Math.random() * 4) * (Math.PI / 2),
      scale: 0.95 + Math.random() * 0.35,
      status: 'active',
      created_at: completedAt,
      reclaimed_at: null,
      model_variant: variant,
      species,
      task_note: fullNote,
      focus_tag: session.tag,
      focus_duration: minutesForReward,
    };
  }

  return {
    success: true,
    updatedSession,
    newLedgerEntries: [goldEntry, xpEntry],
    newWorldObject,
    updatedWorld: {
      last_focus_completed_at: completedAt,
    },
    rewardGold,
    rewardXp,
  };
}
