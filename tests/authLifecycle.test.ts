import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ callback: null as any, read: vi.fn(), sync: vi.fn(), clearWidgets: vi.fn(), session: null as any }));
vi.mock('../src/lib/mobile/widgetBridge', () => ({ clearWidgetCacheOnSignOut: m.clearWidgets, syncWidgetsWithSaveData: vi.fn() }));
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
    expect(m.clearWidgets).toHaveBeenCalledOnce();
  });
});
it('keeps a verified purchase current across token refresh for the same account',async()=>{
  m.callback('SIGNED_IN',session('a'));await vi.runAllTimersAsync();
  const {getAuthSessionRevision}=await import('../src/lib/auth/useAuthStore');
  const {isStoreResultCurrent}=await import('../src/lib/subscription/revenueCatService');
  const paidResult={success:true,ownerId:'a',sessionRevision:getAuthSessionRevision()};
  m.callback('TOKEN_REFRESHED',session('a'));
  expect(isStoreResultCurrent(paidResult)).toBe(true);
});
it('keeps a verified purchase current across a duplicate signed-in event for the same account',async()=>{
  m.callback('SIGNED_IN',session('a'));await vi.runAllTimersAsync();
  const {getAuthSessionRevision}=await import('../src/lib/auth/useAuthStore');
  const {isStoreResultCurrent}=await import('../src/lib/subscription/revenueCatService');
  const paidResult={success:true,ownerId:'a',sessionRevision:getAuthSessionRevision()};
  m.callback('SIGNED_IN',session('a'));
  expect(isStoreResultCurrent(paidResult)).toBe(true);
});
it('still invalidates a verified purchase after sign-out and sign-in to the same account',async()=>{
  m.callback('SIGNED_IN',session('a'));await vi.runAllTimersAsync();
  const {getAuthSessionRevision}=await import('../src/lib/auth/useAuthStore');
  const {isStoreResultCurrent}=await import('../src/lib/subscription/revenueCatService');
  const oldResult={success:true,ownerId:'a',sessionRevision:getAuthSessionRevision()};
  m.callback('SIGNED_OUT',null);m.callback('SIGNED_IN',session('a'));await vi.runAllTimersAsync();
  expect(isStoreResultCurrent(oldResult)).toBe(false);
});
it('discards an older same-owner profile response without invalidating purchase ownership',async()=>{
  m.callback('SIGNED_IN',session('a'));await vi.runAllTimersAsync();
  let resolve!:(value:any)=>void;
  m.read.mockReturnValueOnce(new Promise(r=>{resolve=r;}));
  m.callback('TOKEN_REFRESHED',session('a'));await vi.advanceTimersByTimeAsync(0);
  m.read.mockResolvedValue({data:{display_name:'Latest profile'}});
  m.callback('TOKEN_REFRESHED',session('a'));await vi.advanceTimersByTimeAsync(0);
  resolve({data:{display_name:'Stale profile'}});await vi.runAllTimersAsync();
  expect(store.getState().user?.name).toBe('Latest profile');
});
it('invalidates an old purchase across A to B to A before profile hydration finishes',async()=>{
  m.callback('SIGNED_IN',session('a'));await vi.runAllTimersAsync();
  const {getAuthSessionRevision}=await import('../src/lib/auth/useAuthStore');
  const {isStoreResultCurrent}=await import('../src/lib/subscription/revenueCatService');
  const oldResult={success:true,ownerId:'a',sessionRevision:getAuthSessionRevision()};
  m.callback('SIGNED_IN',session('b'));m.callback('SIGNED_IN',session('a'));await vi.runAllTimersAsync();
  expect(store.getState().user?.id).toBe('a');expect(isStoreResultCurrent(oldResult)).toBe(false);
});
