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
import { findEmptyTileNearCenter } from './worldRules';

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

  if (!durationMinutes || durationMinutes < 5 || durationMinutes === 25) {
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
}

export function startFocusSession({
  durationSeconds = GAME_CONFIG.focus.defaultDurationSec,
  tag = 'Belajar',
  species = 'oak',
  strictMode = false,
  taskNote,
  todoId,
  isStopwatch = false,
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
  };
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
  unlockedTiles?: Set<string>
): CompleteSessionResult {
  const now = Date.now();
  const expectedEnd = new Date(session.expected_end_at).getTime();

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

  // 2. Strict timestamp verification
  // Small 1.5s tolerance for clock jitter/rounding
  if (!session.is_stopwatch && now < expectedEnd - 1500) {
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
    Math.round((now - new Date(session.started_at).getTime()) / 60000)
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
  const { gold: rewardGold, xp: rewardXp } = calculateFocusRewards(minutesForReward);

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

  // 5. Spawn a persistent tree at empty center tile with selected species variant
  const emptyTile = findEmptyTileNearCenter(existingObjects, unlockedTiles);
  let newWorldObject: WorldObject | undefined;

  if (emptyTile) {
    const species = session.species || 'oak';
    const speciesCfg = TREE_SPECIES_CONFIG.find((s) => s.id === species);
    const variant = speciesCfg?.modelVariant || 'tree_oak';

    newWorldObject = {
      id: `obj_tree_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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
      task_note: session.task_note,
      focus_tag: session.tag,
      focus_duration: session.duration_minutes,
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
