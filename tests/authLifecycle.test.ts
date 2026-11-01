import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ callback: null as any, read: vi.fn(), sync: vi.fn(), session: null as any }));
vi.mock('../src/lib/supabase/client', () => ({ supabase: { auth: { onAuthStateChange: (cb: any) => { m.callback = (event: string, session: any) => { m.session = session; return cb(event, session); }; }, getSession: async () => ({ data: { session: m.session } }) }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: m.read }) }) }) } }));
vi.mock('../src/lib/supabase/cloudSync', () => ({ invalidateCloudSyncSession: vi.fn(), smartSyncOnLogin: m.sync }));
vi.mock('../src/lib/game/storage', () => ({ createInitialSaveData: () => ({}) }));
vi.mock('../src/lib/game/useGameStore', () => ({ useGameStore: { setState: vi.fn() } }));
let store: typeof import('../src/lib/auth/useAuthStore').useAuthStore;
beforeEach(async () => { vi.resetModules(); vi.clearAllMocks(); m.session = null; vi.useFakeTimers(); m.read.mockResolvedValue({ data: null }); m.sync.mockResolvedValue(true); store = (await import('../src/lib/auth/useAuthStore')).useAuthStore; await store.getState().initAuth(); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });
const session = (id: string) => ({ user: { id, email: `${id}@example.test` } });
describe('Supabase auth lifecycle', () => {
  it('returns synchronously from the auth callback and queries after it returns', async () => {
    expect(m.callback('SIGNED_IN', session('a'))).toBeUndefined();
    expect(m.read).not.toHaveBeenCalled();
    await vi.runAllTimersAsync(); expect(store.getState().user?.id).toBe('a');
  });
  it('discards the old profile response after sign-out', async () => {
    let resolve!: (value: any) => void;
    m.read.mockReturnValueOnce(new Promise(r => { resolve = r; }));
    m.callback('SIGNED_IN', session('a')); await vi.advanceTimersByTimeAsync(0);
    m.callback('SIGNED_OUT', null); resolve({ data: { display_name: 'A' } });
    await vi.runAllTimersAsync();
    expect(store.getState().user).toBeNull(); expect(m.sync).not.toHaveBeenCalled();
  });
  it('discards late account A hydration after account B signs in', async () => {
    let resolve!: (value: any) => void;
    m.read.mockReturnValueOnce(new Promise(r => { resolve = r; }));
    m.callback('SIGNED_IN', session('a')); await vi.advanceTimersByTimeAsync(0);
    m.callback('SIGNED_IN', session('b')); await vi.advanceTimersByTimeAsync(0);
    resolve({ data: { display_name: 'A' } }); await vi.runAllTimersAsync();
    expect(store.getState().user?.id).toBe('b'); expect(m.sync).toHaveBeenCalledTimes(1); expect(m.sync).toHaveBeenCalledWith('b');
  });
  it('clears the authenticated UI state on external sign-out', () => {
    store.setState({ user: { id: 'a', name: 'A', email: '', isGuest: false, createdAt: '' } });
    m.callback('SIGNED_OUT', null); expect(store.getState().user).toBeNull();
  });
});
