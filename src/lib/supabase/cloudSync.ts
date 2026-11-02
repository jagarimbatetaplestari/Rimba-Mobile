import { create } from 'zustand';
import { supabase } from './client';
import { RimbaSaveData } from '@/types/game';
import { useAuthStore } from '../auth/useAuthStore';
import { useGameStore } from '../game/useGameStore';
import { saveSaveData } from '../game/storage';
import { validateRimbaBackup, createIslandSnapshot } from '../game/backupManager';
import {
  canonicalProgress,
  progressHash,
  hasMeaningfulProgress,
  reconcileProgress,
  readSyncJournal,
  writeSyncJournal,
  SyncJournal,
  PendingSaveCommit,
} from './syncJournal';
import { syncWidgetsWithSaveData } from '../mobile/widgetBridge';

export interface CloudConflict {
  owner: string;
  cloudSave: RimbaSaveData | null;
  revision: number | null;
  updatedAt: string | null;
}

export interface CloudSyncStatus {
  isSyncing: boolean;
  lastSyncedAt: string | null;
  error: string | null;
  phase: 'idle' | 'syncing' | 'pending' | 'synced' | 'offline' | 'conflict' | 'error';
  conflict: CloudConflict | null;
  showConflict: boolean;
}

export const useCloudSyncStatus = create<CloudSyncStatus>(() => ({
  isSyncing: false,
  lastSyncedAt: null,
  error: null,
  phase: 'idle',
  conflict: null,
  showConflict: false,
}));

let syncTimeout: NodeJS.Timeout | null = null;
let lastSyncedTimestamp: string | null = null;
let lastCanonicalByOwner = new Map<string, string>();
let accountRevision = 0;
let accountWatcherStarted = false;
const queues = new Map<string, Promise<boolean>>();

function watchAccountChanges() {
  if (accountWatcherStarted) return;
  accountWatcherStarted = true;
  useAuthStore.subscribe((state, previous) => {
    if (state.user?.id !== previous.user?.id || state.user?.isGuest !== previous.user?.isGuest) {
      invalidateCloudSyncSession();
    }
  });
}

export function invalidateCloudSyncSession(): void {
  accountRevision++;
  lastSyncedTimestamp = null;
  lastCanonicalByOwner.clear();
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = null;
  useCloudSyncStatus.setState({
    isSyncing: false,
    lastSyncedAt: null,
    error: null,
    phase: 'idle',
    conflict: null,
    showConflict: false,
  });
}

function isCurrentAccount(owner: string, generation: number): boolean {
  const user = useAuthStore.getState().user;
  return generation === accountRevision && user?.id === owner && !user.isGuest;
}

function status(owner: string, generation: number, patch: Partial<CloudSyncStatus>) {
  if (isCurrentAccount(owner, generation)) useCloudSyncStatus.setState(patch);
}

export function getLastSyncedAt(): string | null {
  return lastSyncedTimestamp;
}

function synced(owner: string, generation: number, canonicalPayload?: string) {
  if (!isCurrentAccount(owner, generation)) return;
  lastSyncedTimestamp = new Date().toISOString();
  if (canonicalPayload) {
    lastCanonicalByOwner.set(owner, canonicalPayload);
  }
  status(owner, generation, {
    isSyncing: false,
    lastSyncedAt: lastSyncedTimestamp,
    error: null,
    phase: 'synced',
    conflict: null,
    showConflict: false,
  });
}

export async function syncProfileUpdate(updates: { name?: string; avatarUrl?: string; bio?: string }) {
  const auth = useAuthStore.getState();
  const current = useGameStore.getState().saveData;
  const owner = auth.user && !auth.user.isGuest ? auth.user.id : 'guest';
  if (current.storage_owner !== owner) throw new Error('Account changed. Try again.');
  auth.updateProfile(updates);
  const profile = {
    ...current.profile,
    ...(updates.name ? { name: updates.name.trim() } : {}),
    ...(updates.avatarUrl !== undefined ? { avatarUrl: updates.avatarUrl } : {}),
    ...(updates.bio !== undefined ? { bio: updates.bio.trim() } : {}),
  };
  const updated = {
    ...current,
    profile,
    world: { ...current.world, ...(updates.name ? { name: `Suaka ${updates.name.trim()}` } : {}) },
  };
  saveSaveData(updated, owner);
  useGameStore.setState({ saveData: updated });
  void syncWidgetsWithSaveData(updated, useGameStore.getState().activeSession);
  if (auth.user && !auth.user.isGuest) {
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: profile.name,
        avatar_url: profile.avatarUrl,
        bio: profile.bio,
        updated_at: new Date().toISOString(),
      })
      .eq('id', auth.user.id);
    if (error) throw new Error('Profile sync failed. Local progress was kept.');
  }
}

export async function fetchCloudGameSave(
  owner: string
): Promise<{ saveData: RimbaSaveData | null; updatedAt: string | null; revision: number | null; failed: boolean }> {
  try {
    const { data, error } = await supabase
      .from('game_saves')
      .select('save_data,updated_at,revision')
      .eq('user_id', owner)
      .maybeSingle();
    if (error) return { saveData: null, updatedAt: null, revision: null, failed: true };
    if (!data) return { saveData: null, updatedAt: null, revision: null, failed: false };
    const checked = validateRimbaBackup(data.save_data);
    if (!checked.isValid || !checked.data || !Number.isSafeInteger(data.revision) || data.revision < 0)
      return { saveData: null, updatedAt: null, revision: null, failed: true };
    return { saveData: checked.data, updatedAt: data.updated_at, revision: data.revision, failed: false };
  } catch {
    return { saveData: null, updatedAt: null, revision: null, failed: true };
  }
}

async function markConflict(
  owner: string,
  generation: number,
  journal: SyncJournal,
  cloud?: Awaited<ReturnType<typeof fetchCloudGameSave>>
) {
  if (!isCurrentAccount(owner, generation)) return;
  writeSyncJournal(owner, { ...journal, blocked: true });
  const remote = cloud ?? (await fetchCloudGameSave(owner));
  if (!isCurrentAccount(owner, generation)) return;
  status(owner, generation, {
    isSyncing: false,
    phase: remote.failed ? 'offline' : 'conflict',
    error: remote.failed ? 'Cloud copy could not be read. Local progress was kept.' : null,
    conflict: remote.failed
      ? null
      : { owner, cloudSave: remote.saveData, revision: remote.revision, updatedAt: remote.updatedAt },
    showConflict: !remote.failed,
  });
}

async function flushPending(owner: string, generation: number, journal: SyncJournal): Promise<SyncJournal | null> {
  const pending = journal.pending;
  if (!pending || !isCurrentAccount(owner, generation)) return null;
  const { data, error } = await supabase.rpc('commit_game_save_v2', {
    p_expected_owner: owner,
    p_expected_revision: pending.baseRevision,
    p_mutation_id: pending.id,
    p_save_data: JSON.parse(pending.payload),
  });
  if (!isCurrentAccount(owner, generation)) return null;
  if (error) {
    status(owner, generation, {
      isSyncing: false,
      phase: 'offline',
      error: 'Cloud sync is unavailable. Progress and the pending request were kept.',
    });
    return null;
  }
  if (data?.committed !== true) {
    await markConflict(owner, generation, journal);
    return null;
  }
  if (!Number.isSafeInteger(data.revision) || data.revision < 1) throw new Error('Invalid sync acknowledgement');
  const acknowledged = {
    ...journal,
    initialized: true,
    revision: data.revision,
    baseline: pending.hash,
    pending: null,
    blocked: false,
  };
  writeSyncJournal(owner, acknowledged);
  return acknowledged;
}

function requestId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function uploadOwned(owner: string, generation: number): Promise<boolean> {
  if (!isCurrentAccount(owner, generation)) return false;
  try {
    let journal = readSyncJournal(owner);
    if (!journal.initialized || journal.blocked) return false;
    status(owner, generation, { isSyncing: true, phase: 'syncing', error: null });
    if (journal.pending) {
      const result = await flushPending(owner, generation, journal);
      if (!result) return false;
      journal = result;
    }
    if (!isCurrentAccount(owner, generation)) return false;
    const current = useGameStore.getState().saveData;
    if (current.storage_owner !== owner) return false;
    const payload = canonicalProgress(current);
    const hash = await progressHash(payload);
    if (!isCurrentAccount(owner, generation)) return false;
    if (hash === journal.baseline) {
      if (canonicalProgress(useGameStore.getState().saveData) !== payload) {
        status(owner, generation, { isSyncing: false, phase: 'pending' });
        scheduleDebouncedCloudSync();
        return false;
      }
      synced(owner, generation, payload);
      return true;
    }
    const pending: PendingSaveCommit = { id: requestId(), baseRevision: journal.revision, payload, hash };
    journal = { ...journal, pending };
    writeSyncJournal(owner, journal);
    const result = await flushPending(owner, generation, journal);
    if (!result) return false;
    const latest = useGameStore.getState().saveData;
    if (!isCurrentAccount(owner, generation)) return false;
    if (canonicalProgress(latest) !== payload) {
      status(owner, generation, { isSyncing: false, phase: 'pending' });
      scheduleDebouncedCloudSync();
      return false;
    }
    synced(owner, generation, payload);
    return true;
  } catch {
    status(owner, generation, {
      isSyncing: false,
      phase: 'error',
      error: 'Sync could not finish. Local progress and original sync data were kept.',
    });
    return false;
  }
}

function queueOwner(owner: string, operation: () => Promise<boolean>): Promise<boolean> {
  const run = (queues.get(owner) ?? Promise.resolve(false)).catch(() => false).then(operation);
  queues.set(owner, run);
  void run.finally(() => {
    if (queues.get(owner) === run) queues.delete(owner);
  });
  return run;
}

export async function uploadGameSaveToCloud(
  saveData: RimbaSaveData,
  expectedUserId?: string,
  expectedRevision?: number
): Promise<boolean> {
  watchAccountChanges();
  const user = useAuthStore.getState().user;
  const generation = expectedRevision ?? accountRevision;
  if (!user || user.isGuest || saveData.storage_owner !== user.id || !isCurrentAccount(expectedUserId ?? user.id, generation))
    return false;
  const owner = user.id;
  return queueOwner(owner, () => uploadOwned(owner, generation));
}

function applyCloudSave(owner: string, cloud: RimbaSaveData) {
  const current = useGameStore.getState().saveData;
  if (current.storage_owner !== owner) throw new Error('Account changed');
  const authUser = useAuthStore.getState().user;
  const resolvedName =
    (authUser && authUser.id === owner && authUser.name && authUser.name !== 'Penjaga Rimba'
      ? authUser.name
      : cloud.profile?.name) || current.profile.name;
  const resolvedAvatar =
    (authUser && authUser.id === owner && authUser.avatarUrl ? authUser.avatarUrl : cloud.profile?.avatarUrl) ||
    current.profile.avatarUrl;
  const resolvedBio =
    (authUser && authUser.id === owner && authUser.bio ? authUser.bio : cloud.profile?.bio) || current.profile.bio;

  const restored: RimbaSaveData = {
    ...cloud,
    storage_owner: owner,
    profile: {
      ...current.profile,
      ...cloud.profile,
      id: owner,
      name: resolvedName,
      avatarUrl: resolvedAvatar,
      bio: resolvedBio,
      xp: cloud.profile.xp,
      goldCached: cloud.profile.goldCached,
    },
    subscription: current.subscription,
  };
  saveSaveData(restored, owner);
  const activeSession = restored.focus_sessions.find((s) => s.status === 'active') || null;
  useGameStore.setState({
    saveData: restored,
    activeSession,
    activeBiome: restored.active_biome || 'meadow',
    selectedObject: null,
    selectedCatalogItem: null,
    selectedTool: null,
  });
  void syncWidgetsWithSaveData(restored, activeSession);
}

export function smartSyncOnLogin(owner: string): Promise<boolean> {
  watchAccountChanges();
  const generation = accountRevision;
  return queueOwner(owner, () => reconcileOwned(owner, generation));
}

async function reconcileOwned(owner: string, generation: number): Promise<boolean> {
  if (!isCurrentAccount(owner, generation) || useGameStore.getState().saveData.storage_owner !== owner) return false;
  try {
    let journal = readSyncJournal(owner);
    if (journal.pending && !journal.blocked) {
      const result = await flushPending(owner, generation, journal);
      if (!result) return false;
      journal = result;
    }
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id,display_name,avatar_url,bio')
      .eq('id', owner)
      .maybeSingle();
    if (!isCurrentAccount(owner, generation) || profileError) return false;
    if (profile) {
      useAuthStore.getState().updateProfile({
        name: profile.display_name,
        avatarUrl: profile.avatar_url,
        bio: profile.bio,
      });
    }
    const cloud = await fetchCloudGameSave(owner);
    if (!isCurrentAccount(owner, generation)) return false;
    if (cloud.failed) {
      status(owner, generation, {
        isSyncing: false,
        phase: 'offline',
        error: 'Cloud copy could not be read. Local progress was kept.',
      });
      return false;
    }
    const current = useGameStore.getState().saveData;
    const localPayload = canonicalProgress(current);
    const remotePayload = cloud.saveData ? canonicalProgress(cloud.saveData) : null;
    const localHash = await progressHash(localPayload);
    const remoteHash = remotePayload ? await progressHash(remotePayload) : null;
    if (!isCurrentAccount(owner, generation)) return false;
    if (canonicalProgress(useGameStore.getState().saveData) !== localPayload) {
      scheduleDebouncedCloudSync();
      return false;
    }
    const action =
      useGameStore.getState().activeSession?.status === 'active' && localHash !== remoteHash
        ? 'conflict'
        : reconcileProgress(localHash, remoteHash, journal, hasMeaningfulProgress(current));
    if (action === 'conflict') {
      await markConflict(owner, generation, journal, cloud);
      return false;
    }
    if (action === 'adopt_cloud' && cloud.saveData) applyCloudSave(owner, cloud.saveData);
    journal = {
      ...journal,
      initialized: true,
      revision: cloud.revision,
      baseline: remoteHash,
      pending: null,
      blocked: false,
    };
    writeSyncJournal(owner, journal);
    if (action === 'upload_local') return await uploadOwned(owner, generation);
    synced(owner, generation, remotePayload ?? localPayload);
    return true;
  } catch {
    status(owner, generation, {
      isSyncing: false,
      phase: 'error',
      error: 'Sync could not finish. Original progress and sync data were kept.',
    });
    return false;
  }
}

export function resolveCloudConflict(choice: 'local' | 'cloud'): Promise<boolean> {
  const conflict = useCloudSyncStatus.getState().conflict;
  if (!conflict) return Promise.resolve(false);
  const generation = accountRevision;
  return queueOwner(conflict.owner, () => resolveOwnedConflict(choice, conflict, generation));
}

async function resolveOwnedConflict(
  choice: 'local' | 'cloud',
  conflict: CloudConflict,
  generation: number
): Promise<boolean> {
  const owner = conflict.owner;
  if (!isCurrentAccount(owner, generation)) return false;
  try {
    const cloud = await fetchCloudGameSave(owner);
    if (!isCurrentAccount(owner, generation) || cloud.failed) return false;
    if (cloud.revision !== conflict.revision) {
      await markConflict(owner, generation, readSyncJournal(owner), cloud);
      return false;
    }
    const current = useGameStore.getState().saveData;
    if (choice === 'cloud' && (!cloud.saveData || useGameStore.getState().activeSession?.status === 'active'))
      return false;
    createIslandSnapshot(current, 'Before choosing a cloud conflict copy');
    if (cloud.saveData) createIslandSnapshot({ ...cloud.saveData, storage_owner: owner }, 'Cloud copy before conflict resolution');
    const remotePayload = cloud.saveData ? canonicalProgress(cloud.saveData) : null;
    const remoteHash = remotePayload ? await progressHash(remotePayload) : null;
    if (!isCurrentAccount(owner, generation)) return false;
    if (useGameStore.getState().saveData !== current) {
      status(owner, generation, { error: 'Progress changed. Review both copies again.' });
      return false;
    }
    if (choice === 'cloud' && cloud.saveData) applyCloudSave(owner, cloud.saveData);
    writeSyncJournal(owner, {
      version: 1,
      initialized: true,
      revision: cloud.revision,
      baseline: remoteHash,
      pending: null,
      blocked: false,
    });
    status(owner, generation, { conflict: null, showConflict: false, error: null });
    if (choice === 'local') return await uploadOwned(owner, generation);
    synced(owner, generation, remotePayload ?? undefined);
    return true;
  } catch {
    status(owner, generation, {
      isSyncing: false,
      error: 'Conflict could not be resolved. Keep your data; available snapshots are retained.',
    });
    return false;
  }
}

export function scheduleDebouncedCloudSync() {
  watchAccountChanges();
  const user = useAuthStore.getState().user;
  if (!user || user.isGuest) return;
  try {
    const currentSave = useGameStore.getState().saveData;
    if (currentSave.storage_owner === user.id) {
      const currentCanonical = canonicalProgress(currentSave);
      if (lastCanonicalByOwner.get(user.id) === currentCanonical && !readSyncJournal(user.id).pending) {
        return;
      }
    }
  } catch {
    // Proceed to standard debounced sync if canonical check fails
  }
  if (syncTimeout) clearTimeout(syncTimeout);
  const generation = accountRevision;
  syncTimeout = setTimeout(() => {
    syncTimeout = null;
    if (!isCurrentAccount(user.id, generation)) return;
    void uploadGameSaveToCloud(useGameStore.getState().saveData, user.id, generation);
  }, 4000);
}
