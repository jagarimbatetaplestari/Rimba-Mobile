import { supabase } from './client';
import { RimbaSaveData } from '@/types/game';
import { useAuthStore } from '../auth/useAuthStore';
import { useGameStore } from '../game/useGameStore';
import { saveSaveData } from '../game/storage';

export interface CloudSyncStatus {
  isSyncing: boolean;
  lastSyncedAt: string | null;
  error: string | null;
}

let syncTimeout: NodeJS.Timeout | null = null;
let lastSyncedTimestamp: string | null = null;

export function getLastSyncedAt(): string | null {
  return lastSyncedTimestamp;
}

/**
 * Menyelaraskan profil user lokal (useGameStore dan useAuthStore) dan mengunggahnya ke Supabase jika login.
 */
export async function syncProfileUpdate(updates: {
  name?: string;
  avatarUrl?: string;
  bio?: string;
}) {
  const authStore = useAuthStore.getState();
  const gameStore = useGameStore.getState();
  const currentUser = authStore.user;

  // 1. Selaraskan Auth Store
  authStore.updateProfile(updates);

  // 2. Selaraskan Game Store
  const currentSave = gameStore.saveData;
  const updatedProfile = {
    ...currentSave.profile,
    ...(updates.name ? { name: updates.name.trim() } : {}),
    ...(updates.avatarUrl !== undefined ? { avatarUrl: updates.avatarUrl } : {}),
    ...(updates.bio !== undefined ? { bio: updates.bio.trim() } : {}),
  };

  const updatedSaveData: RimbaSaveData = {
    ...currentSave,
    profile: updatedProfile,
    world: {
      ...currentSave.world,
      ...(updates.name ? { name: `Suaka ${updates.name.trim()}` } : {}),
    },
  };

  saveSaveData(updatedSaveData);
  useGameStore.setState({ saveData: updatedSaveData });

  // 3. Jika user login ke Supabase (bukan guest), kirim ke cloud
  if (currentUser && !currentUser.isGuest) {
    try {
      await supabase
        .from('profiles')
        .update({
          display_name: updatedProfile.name,
          avatar_url: updatedProfile.avatarUrl,
          bio: updatedProfile.bio,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentUser.id);
    } catch (err) {
      console.warn('Gagal sync profil ke Supabase:', err);
    }
  }
}

/**
 * Mengunggah data suaka (game_saves) ke Supabase.
 */
export async function uploadGameSaveToCloud(saveData: RimbaSaveData): Promise<boolean> {
  const currentUser = useAuthStore.getState().user;
  if (!currentUser || currentUser.isGuest) return false;

  try {
    const { error } = await supabase.from('game_saves').upsert(
      {
        user_id: currentUser.id,
        save_version: saveData.version || 1,
        save_data: saveData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      console.warn('Error saat mengunggah save ke cloud:', error.message);
      return false;
    }

    lastSyncedTimestamp = new Date().toISOString();
    return true;
  } catch (err) {
    console.warn('Network error saat upload cloud save:', err);
    return false;
  }
}

/**
 * Mengambil data suaka dari Supabase untuk user tertentu.
 */
export async function fetchCloudGameSave(userId: string): Promise<{
  saveData: RimbaSaveData | null;
  updatedAt: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('game_saves')
      .select('save_data, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) {
      return { saveData: null, updatedAt: null };
    }

    return {
      saveData: data.save_data as RimbaSaveData,
      updatedAt: data.updated_at,
    };
  } catch (err) {
    console.warn('Error fetching cloud save:', err);
    return { saveData: null, updatedAt: null };
  }
}

/**
 * Smart Sync saat Login:
 * Membandingkan data lokal vs data di Cloud untuk mencegah progress hilang.
 */
export async function smartSyncOnLogin(userId: string): Promise<boolean> {
  try {
    // 1. Ambil profil dari Supabase
    const { data: cloudProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (cloudProfile) {
      // Sinkronkan data profil ke kedua store
      useAuthStore.getState().updateProfile({
        name: cloudProfile.display_name,
        avatarUrl: cloudProfile.avatar_url,
        bio: cloudProfile.bio,
      });

      const currentSave = useGameStore.getState().saveData;
      const updatedSave: RimbaSaveData = {
        ...currentSave,
        profile: {
          ...currentSave.profile,
          name: cloudProfile.display_name,
          avatarUrl: cloudProfile.avatar_url,
          bio: cloudProfile.bio,
        },
      };
      saveSaveData(updatedSave);
      useGameStore.setState({ saveData: updatedSave });
    }

    // 2. Ambil game save dari Supabase
    const { saveData: cloudSave, updatedAt: cloudUpdatedAt } = await fetchCloudGameSave(userId);
    const localSave = useGameStore.getState().saveData;

    if (cloudSave) {
      const localSessions = localSave.focus_sessions || [];
      const cloudSessions = cloudSave.focus_sessions || [];

      const localMins = localSessions
        .filter((s) => s.status === 'completed')
        .reduce((acc, s) => acc + (s.duration_minutes || 25), 0);
      const cloudMins = cloudSessions
        .filter((s) => s.status === 'completed')
        .reduce((acc, s) => acc + (s.duration_minutes || 25), 0);

      const localObjects = localSave.world_objects || [];
      const cloudObjects = cloudSave.world_objects || [];

      // Lossless merge: ensure guest focus sessions, island objects, archipelago, ledger, and lore are never wiped
      const sessionMap = new Map<string, (typeof localSessions)[0]>();
      cloudSessions.forEach((s) => sessionMap.set(s.id, s));
      localSessions.forEach((s) => sessionMap.set(s.id, s));

      const objectMap = new Map<string, (typeof localObjects)[0]>();
      cloudObjects.forEach((o) => objectMap.set(o.id, o));
      localObjects.forEach((o) => objectMap.set(o.id, o));

      // Merge currency ledger
      const localLedger = localSave.currency_ledger || [];
      const cloudLedger = cloudSave.currency_ledger || [];
      const ledgerMap = new Map<string, (typeof localLedger)[0]>();
      cloudLedger.forEach((entry) => ledgerMap.set(entry.id, entry));
      localLedger.forEach((entry) => ledgerMap.set(entry.id, entry));

      // Merge archipelago islands
      const localIslands = localSave.islands || [];
      const cloudIslands = cloudSave.islands || [];
      const islandMap = new Map<string, (typeof localIslands)[0]>();
      cloudIslands.forEach((isl) => islandMap.set(isl.id, isl));
      localIslands.forEach((isl) => islandMap.set(isl.id, isl));

      // Merge unlocked story chapters and wisdom fragments
      const mergedChapters = Array.from(
        new Set([
          ...(cloudSave.claimed_story_chapters || []),
          ...(localSave.claimed_story_chapters || []),
        ])
      );
      const mergedWisdom = Array.from(
        new Set([
          ...(cloudSave.claimed_wisdom_fragments || []),
          ...(localSave.claimed_wisdom_fragments || []),
        ])
      );

      // Merge world unlocked tiles
      const mergedUnlockedTiles = Array.from(
        new Set([
          ...(cloudSave.world?.unlocked_tiles || []),
          ...(localSave.world?.unlocked_tiles || []),
        ])
      );

      const mergedSessions = Array.from(sessionMap.values());
      const mergedObjects = Array.from(objectMap.values());
      const mergedLedger = Array.from(ledgerMap.values());
      const mergedIslands = Array.from(islandMap.values());

      const maxXp = Math.max(localSave.profile?.xp || 0, cloudSave.profile?.xp || 0);
      const maxStreakShields = Math.max(localSave.streak_shields || 0, cloudSave.streak_shields || 0);
      const hasMystery = Boolean(localSave.pioneer_reward_claimed || cloudSave.pioneer_reward_claimed);

      const baseSave = localMins >= cloudMins ? localSave : cloudSave;

      const mergedSave: RimbaSaveData = {
        ...baseSave,
        profile: {
          ...baseSave.profile,
          xp: maxXp,
        },
        streak_shields: maxStreakShields,
        pioneer_reward_claimed: hasMystery,
        focus_sessions: mergedSessions,
        world_objects: mergedObjects,
        currency_ledger: mergedLedger,
        islands: mergedIslands.length > 0 ? mergedIslands : baseSave.islands,
        claimed_story_chapters: mergedChapters,
        claimed_wisdom_fragments: mergedWisdom,
        world: {
          ...baseSave.world,
          unlocked_tiles: mergedUnlockedTiles.length > 0 ? mergedUnlockedTiles : baseSave.world?.unlocked_tiles,
        },
      };

      saveSaveData(mergedSave);
      useGameStore.setState({ saveData: mergedSave });
      await uploadGameSaveToCloud(mergedSave);
    } else {
      // Belum ada save di cloud, unggah save lokal saat ini
      await uploadGameSaveToCloud(localSave);
    }

    lastSyncedTimestamp = new Date().toISOString();
    return true;
  } catch (err) {
    console.warn('Gagal menjalankan smartSyncOnLogin:', err);
    return false;
  }
}

/**
 * Debounced Auto-Sync: Memanggil uploadGameSaveToCloud secara efisien tanpa membebani server
 */
export function scheduleDebouncedCloudSync() {
  const currentUser = useAuthStore.getState().user;
  if (!currentUser || currentUser.isGuest) return;

  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  syncTimeout = setTimeout(() => {
    const saveData = useGameStore.getState().saveData;
    uploadGameSaveToCloud(saveData);
  }, 4000);
}
