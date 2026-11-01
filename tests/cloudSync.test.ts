import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ user: { id: 'a', isGuest: false } as { id: string; isGuest: boolean } | null, read: vi.fn(), upsert: vi.fn(), persist: vi.fn(), setState: vi.fn(), updateProfile: vi.fn(), listeners: [] as Array<(state: any, previous: any) => void>, save: { version: 1, profile: {}, world: {} } }));
vi.mock('../src/lib/auth/useAuthStore', () => ({ useAuthStore: { getState: () => ({ user: m.user, updateProfile: m.updateProfile }), subscribe: (listener: any) => { m.listeners.push(listener); return () => {}; } } }));
vi.mock('../src/lib/game/useGameStore', () => ({ useGameStore: { getState: () => ({ saveData: m.save }), setState: m.setState } }));
vi.mock('../src/lib/game/storage', () => ({ saveSaveData: m.persist }));
vi.mock('../src/lib/supabase/client', () => ({ supabase: { from: (table: string) => ({ select: () => ({ eq: () => ({ maybeSingle: () => m.read(table) }) }), upsert: m.upsert }) } }));
import { scheduleDebouncedCloudSync, smartSyncOnLogin, uploadGameSaveToCloud } from '../src/lib/supabase/cloudSync';
function switchUser(id: string) {
  const previous = { user: m.user };
  m.user = { id, isGuest: false };
  m.listeners.forEach(listener => listener({ user: m.user }, previous));
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
beforeEach(() => { vi.clearAllMocks(); switchUser('a'); m.read.mockResolvedValue({ data: null, error: null }); m.upsert.mockResolvedValue({ error: null }); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });
describe('cloud sync account isolation', () => {
  it('discards a profile response after switching accounts', async () => {
    const pending = deferred<any>(); m.read.mockReturnValueOnce(pending.promise);
    const sync = smartSyncOnLogin('a'); switchUser('b');
    pending.resolve({ data: { display_name: 'Account A' }, error: null });
    expect(await sync).toBe(false);
    expect(m.updateProfile).not.toHaveBeenCalled(); expect(m.persist).not.toHaveBeenCalled(); expect(m.upsert).not.toHaveBeenCalled();
  });
  it('does not upload local progress when cloud read failed', async () => {
    m.read.mockImplementation(async (table: string) => ({ data: null, error: table === 'game_saves' ? new Error('Offline') : null }));
    expect(await smartSyncOnLogin('a')).toBe(false); expect(m.upsert).not.toHaveBeenCalled();
  });
  it('reports failed upload instead of claiming sync success', async () => {
    m.upsert.mockResolvedValue({ error: { message: 'Denied' } });
    expect(await smartSyncOnLogin('a')).toBe(false);
  });
  it('does not let an old timer upload another account', async () => {
    vi.useFakeTimers(); scheduleDebouncedCloudSync(); switchUser('b');
    await vi.advanceTimersByTimeAsync(4000); expect(m.upsert).not.toHaveBeenCalled();
  });
  it('invalidates old work even after switching back to the same account', async () => {
    const pending = deferred<any>(); m.read.mockReturnValueOnce(pending.promise);
    const sync = smartSyncOnLogin('a'); switchUser('b'); switchUser('a');
    pending.resolve({ data: null, error: null });
    expect(await sync).toBe(false); expect(m.upsert).not.toHaveBeenCalled();
  });
  it('does not report an upload as current after changing accounts', async () => {
    const pending = deferred<any>(); m.upsert.mockReturnValueOnce(pending.promise);
    const upload = uploadGameSaveToCloud(m.save as any); switchUser('b'); pending.resolve({ error: null });
    expect(await upload).toBe(false);
    expect(m.upsert.mock.calls[0][0].user_id).toBe('a');
  });
  it('uploads successfully when the cloud confirms no save exists', async () => {
    expect(await smartSyncOnLogin('a')).toBe(true); expect(m.upsert.mock.calls[0][0].user_id).toBe('a');
  });
});
