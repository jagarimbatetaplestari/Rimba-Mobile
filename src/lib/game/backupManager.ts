'use client';

import { RimbaSaveData } from '@/types/game';
import { calculateBalances } from './economy';
import { calculateAnalytics } from './analytics';

const SNAPSHOTS_STORAGE_KEY = 'rimba_island_snapshots';

export interface BackupValidationResult {
  isValid: boolean;
  error?: string;
  data?: RimbaSaveData;
  summary?: {
    worldName: string;
    treesCount: number;
    gold: number;
    xp: number;
    level: number;
    totalFocusMinutes: number;
    sessionsCount: number;
    unlockedTilesCount: number;
  };
}

export interface IslandSnapshot {
  id: string;
  title: string;
  createdAt: string;
  treesCount: number;
  gold: number;
  xp: number;
  level: number;
  totalFocusMinutes: number;
  sessionsCount: number;
  data: RimbaSaveData;
}

/**
 * Validates whether an uploaded string/object is a legitimate Rimba backup
 */
export function validateRimbaBackup(raw: string | unknown): BackupValidationResult {
  try {
    const parsed: Partial<RimbaSaveData> = typeof raw === 'string' ? JSON.parse(raw) : raw;

    if (!parsed || typeof parsed !== 'object') {
      return { isValid: false, error: 'Berkas tidak berformat JSON yang valid.' };
    }

    if (!parsed.profile || !parsed.world || !Array.isArray(parsed.world_objects)) {
      return {
        isValid: false,
        error: 'Struktur data tidak lengkap. Komponen profile, world, atau objek pulau hilang.',
      };
    }

    // Normalize and sanitize fields
    const sessions = Array.isArray(parsed.focus_sessions) ? parsed.focus_sessions : [];
    const worldObjects = Array.isArray(parsed.world_objects) ? parsed.world_objects : [];
    const ledger = Array.isArray(parsed.currency_ledger) ? parsed.currency_ledger : [];

    const balances = calculateBalances(ledger);
    const analytics = calculateAnalytics(sessions);

    const treesCount = worldObjects.filter(
      (o) => o.object_type === 'tree' && o.status === 'active'
    ).length;

    const currentXp = parsed.profile.xp ?? balances.xp;
    const currentGold = parsed.profile.goldCached ?? balances.gold;
    const level = Math.floor(currentXp / 100) + 1;

    const validatedData: RimbaSaveData = {
      version: parsed.version || 1,
      profile: {
        id: parsed.profile.id || 'local-user',
        xp: currentXp,
        goldCached: currentGold,
      },
      world: {
        id: parsed.world.id || 'world_imported',
        name: parsed.world.name || 'Suaka Rimba',
        last_focus_completed_at: parsed.world.last_focus_completed_at || null,
        last_reclamation_at: parsed.world.last_reclamation_at || null,
        unlocked_tiles: Array.isArray(parsed.world.unlocked_tiles)
          ? parsed.world.unlocked_tiles
          : ['3,3', '3,4', '3,5', '4,3', '4,4', '4,5', '5,3', '5,4', '5,5'],
      },
      focus_sessions: sessions,
      world_objects: worldObjects,
      currency_ledger: ledger,
      reclamation_events: Array.isArray(parsed.reclamation_events)
        ? parsed.reclamation_events
        : [],
      todos: Array.isArray(parsed.todos) ? parsed.todos : [],
      claimed_quests: Array.isArray(parsed.claimed_quests) ? parsed.claimed_quests : [],
      animal_interactions: parsed.animal_interactions || {},
      claimed_achievements: Array.isArray(parsed.claimed_achievements)
        ? parsed.claimed_achievements
        : [],
    };

    return {
      isValid: true,
      data: validatedData,
      summary: {
        worldName: validatedData.world.name,
        treesCount,
        gold: currentGold,
        xp: currentXp,
        level,
        totalFocusMinutes: analytics.totalFocusMinutes,
        sessionsCount: sessions.length,
        unlockedTilesCount: (validatedData.world.unlocked_tiles || []).length,
      },
    };
  } catch (err) {
    return {
      isValid: false,
      error: 'Gagal memproses berkas JSON: ' + (err instanceof Error ? err.message : String(err)),
    };
  }
}

/**
 * Downloads the current save data as a formatted JSON backup
 */
export function downloadSaveDataBackup(saveData: RimbaSaveData): void {
  if (typeof window === 'undefined') return;

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const fileName = `rimba_suaka_backup_${dateStr}_${timeStr}.json`;

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(saveData, null, 2));
  const anchor = document.createElement('a');
  anchor.setAttribute('href', dataStr);
  anchor.setAttribute('download', fileName);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

/**
 * Retrieves all saved local island snapshots
 */
export function getIslandSnapshots(): IslandSnapshot[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(SNAPSHOTS_STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * Creates and stores a new snapshot of current island state
 */
export function createIslandSnapshot(
  saveData: RimbaSaveData,
  customTitle?: string
): IslandSnapshot {
  const existing = getIslandSnapshots();

  const sessions = saveData.focus_sessions || [];
  const worldObjects = saveData.world_objects || [];
  const analytics = calculateAnalytics(sessions);
  const treesCount = worldObjects.filter(
    (o) => o.object_type === 'tree' && o.status === 'active'
  ).length;

  const level = Math.floor(saveData.profile.xp / 100) + 1;

  const newSnapshot: IslandSnapshot = {
    id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title:
      customTitle?.trim() ||
      `Snapshot ${saveData.world.name} (Lv.${level} • ${treesCount} Pohon)`,
    createdAt: new Date().toISOString(),
    treesCount,
    gold: saveData.profile.goldCached,
    xp: saveData.profile.xp,
    level,
    totalFocusMinutes: analytics.totalFocusMinutes,
    sessionsCount: sessions.length,
    data: JSON.parse(JSON.stringify(saveData)), // Deep copy
  };

  const updated = [newSnapshot, ...existing].slice(0, 10); // Keep last 10 snapshots max
  localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(updated));

  return newSnapshot;
}

/**
 * Deletes an island snapshot by ID
 */
export function deleteIslandSnapshot(snapshotId: string): IslandSnapshot[] {
  const existing = getIslandSnapshots();
  const updated = existing.filter((s) => s.id !== snapshotId);
  localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
