'use client';

import { RimbaSaveData } from '@/types/game';
import { calculateBalances } from './economy';
import { assertBackupStructure, MAX_BACKUP_BYTES } from './backupSchema';
import { calculateAnalytics } from './analytics';
import { isNativeMobile } from '@/lib/mobile/nativeBridge';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

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
    if (typeof raw === 'string' && (raw.length > MAX_BACKUP_BYTES || new TextEncoder().encode(raw).byteLength > MAX_BACKUP_BYTES)) {
      return { isValid: false, error: 'Ukuran cadangan maksimal 20 MiB.' };
    }
    const parsed: Partial<RimbaSaveData> = typeof raw === 'string' ? JSON.parse(raw) : raw;
    assertBackupStructure(parsed);

    if (!parsed || typeof parsed !== 'object') {
      return { isValid: false, error: 'Berkas tidak berformat JSON yang valid.' };
    }

    if (parsed.version !== 1 || !parsed.profile || !parsed.world || !Array.isArray(parsed.world_objects)) {
      return {
        isValid: false,
        error: 'Struktur data tidak lengkap. Komponen profile, world, atau objek pulau hilang.',
      };
    }

    const sessions = Array.isArray(parsed.focus_sessions) ? parsed.focus_sessions : [];
    const worldObjects = Array.isArray(parsed.world_objects) ? parsed.world_objects : [];
    const ledger = Array.isArray(parsed.currency_ledger) ? parsed.currency_ledger : [];

    const ledgerIds = new Set<string>();
    for (const entry of ledger) {
      if (!entry || typeof entry.id !== 'string' || !entry.id || ledgerIds.has(entry.id) ||
        !Number.isFinite(entry.amount) || !['gold', 'xp'].includes(entry.currency)) {
        return { isValid: false, error: 'Ledger tidak valid atau memiliki ID duplikat.' };
      }
      ledgerIds.add(entry.id);
    }
    const balances = calculateBalances(ledger);
    const analytics = calculateAnalytics(sessions);

    const treesCount = worldObjects.filter(
      (o) => o.object_type === 'tree' && o.status === 'active'
    ).length;

    const currentXp = balances.xp;
    const currentGold = balances.gold;
    const level = Math.floor(currentXp / 100) + 1;

    const validatedData: RimbaSaveData = {
      version: 1,
      profile: {
        id: 'local-user',
        xp: currentXp,
        goldCached: currentGold,
      },
      world: {
        ...parsed.world,
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
      custom_tags: Array.isArray(parsed.custom_tags) ? parsed.custom_tags : [],
      streak_shields: typeof parsed.streak_shields === 'number' ? parsed.streak_shields : 0,
      used_shield_dates: Array.isArray(parsed.used_shield_dates) ? parsed.used_shield_dates : [],
      claimed_story_chapters: Array.isArray(parsed.claimed_story_chapters) ? parsed.claimed_story_chapters : [],
      claimed_wisdom_fragments: Array.isArray(parsed.claimed_wisdom_fragments) ? parsed.claimed_wisdom_fragments : [],
      islands: Array.isArray(parsed.islands) && parsed.islands.length > 0 ? parsed.islands : undefined,
      active_island_id: parsed.active_island_id || undefined,
      active_biome: parsed.active_biome || 'meadow',
      auto_season_enabled: parsed.auto_season_enabled ?? true,
      pioneer_completed_ids: Array.isArray(parsed.pioneer_completed_ids) ? parsed.pioneer_completed_ids : [],
      pioneer_reward_claimed: parsed.pioneer_reward_claimed === true,
      distraction_source: typeof parsed.distraction_source === 'string' ? parsed.distraction_source : undefined,
      last_monthly_shield_month: typeof parsed.last_monthly_shield_month === 'string' ? parsed.last_monthly_shield_month : undefined,
      subscription: undefined,
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
 * Downloads or shares the current save data as a formatted JSON backup
 * Supports native iOS/Android Capacitor Share Sheet + Web Blob fallback
 */
export async function downloadSaveDataBackup(saveData: RimbaSaveData | string): Promise<void> {
  if (typeof window === 'undefined') return;

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const fileName = `rimba_suaka_backup_${dateStr}_${timeStr}.json`;
  const jsonContent = typeof saveData === 'string' ? saveData : JSON.stringify(saveData, null, 2);

  if (isNativeMobile()) {
    try {
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: jsonContent,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });

      await Share.share({
        title: 'Cadangan Pulau Suaka Rimba',
        text: 'Berkas cadangan pulau dan riwayat fokus Rimba (.json)',
        url: savedFile.uri,
        dialogTitle: 'Simpan Berkas Cadangan Rimba',
      });
      return;
    } catch (nativeErr: any) {
      const msg = String(nativeErr?.message || nativeErr || '').toLowerCase();
      if (msg.includes('cancel') || msg.includes('abort')) {
        return;
      }
      console.warn('Native JSON backup share fallback to web:', nativeErr);
    }
  }

  try {
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.setAttribute('href', url);
    anchor.setAttribute('download', fileName);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  } catch (err) {
    console.warn('Fallback JSON download failed:', err);
  }
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
    if (!Array.isArray(list)) throw new Error('Invalid snapshot history');
    return list;
  } catch {
    throw new Error('Riwayat cadangan belum dapat dibaca. Data asli dipertahankan.');
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
    data: JSON.parse(JSON.stringify(saveData)),
  };

  const updated = [newSnapshot, ...existing].slice(0, 8);
  try {
    localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    throw new Error('Cadangan belum tersimpan. Periksa ruang penyimpanan dan coba lagi.');
  }
  return newSnapshot;
}

/**
 * Deletes an island snapshot by ID
 */
export function deleteIslandSnapshot(snapshotId: string): IslandSnapshot[] {
  if (typeof window === 'undefined') return [];
  const existing = getIslandSnapshots();
  const filtered = existing.filter((s) => s.id !== snapshotId);
  try {
    localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    throw new Error('Perubahan cadangan belum tersimpan. Silakan coba lagi.');
  }
  return filtered;
}
