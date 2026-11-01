import { RimbaSaveData } from '@/types/game';
import { GAME_CONFIG, STARTER_UNLOCKED_TILES } from './config';
import { calculateBalances, createLedgerEntry } from './economy';

export function createInitialSaveData(): RimbaSaveData {
  const now = new Date();
  // 1 hour ago for last focus
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

  // Initial starter ledger entries
  const initialGold = createLedgerEntry('gold', 60, 'starter_bonus', 'init');
  const initialXp = createLedgerEntry('xp', 50, 'starter_bonus', 'init');
  const ledger = [initialGold, initialXp];
  const { gold, xp } = calculateBalances(ledger);

  // Initial starter objects placed comfortably inside the 3x3 center hub [3..5, 3..5]
  const starterTree = {
    id: 'obj_tree_starter',
    object_type: 'tree' as const,
    grid_x: 3,
    grid_y: 4,
    rotation: 0.5,
    scale: 1.1,
    status: 'active' as const,
    created_at: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
    reclaimed_at: null,
    model_variant: 'tree_oak',
  };

  const starterPath = {
    id: 'obj_path_starter',
    object_type: 'path' as const,
    grid_x: 4,
    grid_y: 5,
    rotation: 0,
    scale: 1.0,
    status: 'active' as const,
    created_at: new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString(),
    reclaimed_at: null,
    model_variant: 'path_stone',
  };

  return {
    version: 1,
    profile: {
      id: 'local-user',
      xp,
      goldCached: gold,
      name: 'Penjaga Rimba',
      avatarUrl: '🦌',
      bio: 'Penjaga Hutan Suaka',
    },
    world: {
      id: 'world_local_default',
      name: 'My Rimba',
      last_focus_completed_at: oneHourAgo,
      last_reclamation_at: null,
      unlocked_tiles: [...STARTER_UNLOCKED_TILES],
      sealed_tiles: [],
    },
    focus_sessions: [],
    world_objects: [starterTree, starterPath],
    currency_ledger: ledger,
    reclamation_events: [],
    todos: [],
    custom_tags: [],
    claimed_quests: [],
    animal_interactions: {},
    claimed_achievements: [],
    streak_shields: 0,
    used_shield_dates: [],
    claimed_story_chapters: [],
    claimed_wisdom_fragments: [],
    active_island_id: 'island_default',
    islands: [
      {
        id: 'island_default',
        name: 'Suaka Utama',
        biome: 'meadow',
        created_at: now.toISOString(),
        world: {
          id: 'world_local_default',
          name: 'My Rimba',
          last_focus_completed_at: oneHourAgo,
          last_reclamation_at: null,
          unlocked_tiles: [...STARTER_UNLOCKED_TILES],
          sealed_tiles: [],
        },
        world_objects: [starterTree, starterPath],
      },
    ],
    subscription: {
      tier: 'free',
      status: 'none',
      isPro: false,
      expiresAt: null,
      originalPurchaseDate: now.toISOString(),
      store: 'promo',
      realTreesPledged: 0,
      pioneerBadge: false,
    },
  };
}

/**
 * Loads validated progress. Unreadable data must be recovered, never silently reset.
 */
export function loadSaveData(): RimbaSaveData {
  if (typeof window === 'undefined') {
    return createInitialSaveData();
  }

  try {
    const raw = localStorage.getItem(GAME_CONFIG.storageKey);
    if (!raw) {
      const initial = createInitialSaveData();
      saveSaveData(initial);
      return initial;
    }

    const parsed: RimbaSaveData = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || !parsed.profile || !parsed.world ||
      !Array.isArray(parsed.currency_ledger) || !Array.isArray(parsed.focus_sessions) ||
      !Array.isArray(parsed.world_objects) || parsed.currency_ledger.some(entry =>
        !entry || !Number.isFinite(entry.amount) || !['gold', 'xp'].includes(entry.currency))) {
      throw new Error('Save data is damaged or uses an unsupported version.');
    }

    // Normalize collections to guarantee safe references
    parsed.world = parsed.world || {
      id: 'world_local_default',
      name: 'My Rimba',
      last_focus_completed_at: null,
      last_reclamation_at: null,
      unlocked_tiles: [...STARTER_UNLOCKED_TILES],
      sealed_tiles: [],
    };
    parsed.world.unlocked_tiles = parsed.world.unlocked_tiles || [...STARTER_UNLOCKED_TILES];
    parsed.world.sealed_tiles = parsed.world.sealed_tiles || [];
    parsed.focus_sessions = parsed.focus_sessions || [];
    parsed.world_objects = (parsed.world_objects || []).filter(
      (obj) =>
        obj.model_variant !== 'rock_largeA' &&
        obj.model_variant !== 'rock_large' &&
        obj.model_variant !== 'nature_rock_large'
    );
    parsed.currency_ledger = parsed.currency_ledger || [];
    parsed.reclamation_events = parsed.reclamation_events || [];
    parsed.todos = parsed.todos || [];
    parsed.custom_tags = parsed.custom_tags || [];
    parsed.claimed_quests = parsed.claimed_quests || [];
    parsed.animal_interactions = parsed.animal_interactions || {};
    parsed.claimed_achievements = parsed.claimed_achievements || [];
    parsed.streak_shields = typeof parsed.streak_shields === 'number' ? parsed.streak_shields : 0;
    parsed.used_shield_dates = parsed.used_shield_dates || [];
    parsed.claimed_story_chapters = parsed.claimed_story_chapters || [];
    parsed.claimed_wisdom_fragments = parsed.claimed_wisdom_fragments || [];

    // Multi-island safe migration for existing users
    if (!parsed.islands || parsed.islands.length === 0) {
      const defaultIsland = {
        id: parsed.active_island_id || 'island_default',
        name: parsed.world?.name || 'Suaka Utama',
        biome: parsed.active_biome || 'meadow',
        created_at: new Date().toISOString(),
        world: parsed.world,
        world_objects: parsed.world_objects || [],
      };
      parsed.islands = [defaultIsland];
      parsed.active_island_id = defaultIsland.id;
    } else {
      parsed.active_island_id = parsed.active_island_id || parsed.islands[0].id;
    }

    if (!parsed.subscription) {
      parsed.subscription = {
        tier: 'free',
        status: 'none',
        isPro: false,
        expiresAt: null,
        originalPurchaseDate: new Date().toISOString(),
        store: 'promo',
        realTreesPledged: 0,
        pioneerBadge: false,
      };
    }

    // Refresh cached gold/xp from ledger to guarantee accuracy
    const balances = calculateBalances(parsed.currency_ledger);
    parsed.profile.goldCached = balances.gold;
    parsed.profile.xp = balances.xp;

    return parsed;
  } catch {
    throw new Error('Progres lokal belum dapat dibaca. Data asli dipertahankan; jangan hapus data aplikasi.');
  }
}

/**
 * Writes a cloned save atomically. Storage failure is surfaced without pruning history.
 */
export function saveSaveData(data: RimbaSaveData): void {
  if (typeof window === 'undefined') return;

  try {
    // Ensure cached gold matches ledger before writing without in-place mutation of the input object
    const balances = calculateBalances(data.currency_ledger);
    const safeData: RimbaSaveData = {
      ...data,
      profile: {
        ...data.profile,
        goldCached: balances.gold,
        xp: balances.xp,
      },
    };

    localStorage.setItem(GAME_CONFIG.storageKey, JSON.stringify(safeData));
  } catch {
    // Never discard history or claim a write succeeded after storage failure.
    throw new Error('Progres belum tersimpan. Periksa ruang penyimpanan dan coba lagi.');
  }
}
