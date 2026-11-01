import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ user: { id: 'a', isGuest: false } as { id: string; isGuest: boolean } | null, read: vi.fn(), rpc: vi.fn(), persist: vi.fn(), setState: vi.fn(), updateProfile: vi.fn(), listeners: [] as Array<(state: any, previous: any) => void>, save: null as any }));
vi.mock('../src/lib/auth/useAuthStore', () => ({ useAuthStore: { getState: () => ({ user: m.user, updateProfile: m.updateProfile }), subscribe: (listener: any) => { m.listeners.push(listener); return () => {}; } } }));
vi.mock('../src/lib/game/useGameStore', () => ({ useGameStore: { getState: () => ({ saveData: m.save }), setState: m.setState } }));
vi.mock('../src/lib/game/storage', async (importOriginal) => ({...(await importOriginal<typeof import('../src/lib/game/storage')>()),saveSaveData:m.persist}));
vi.mock('../src/lib/supabase/client', () => ({ supabase: { rpc:m.rpc, from: (table: string) => ({ select: () => ({ eq: () => ({ maybeSingle: () => m.read(table) }) }), upsert: vi.fn() }) } }));
import { createInitialSaveData } from '../src/lib/game/storage';
import { readSyncJournal,writeSyncJournal } from '../src/lib/supabase/syncJournal';
import { invalidateCloudSyncSession, scheduleDebouncedCloudSync, smartSyncOnLogin, uploadGameSaveToCloud } from '../src/lib/supabase/cloudSync';
function switchUser(id: string) {
  const previous = { user: m.user };
  m.user = { id, isGuest: false };
  m.listeners.forEach(listener => listener({ user: m.user }, previous));
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
beforeEach(() => {
 vi.clearAllMocks();const items=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>items.get(k)??null,setItem:(k:string,v:string)=>items.set(k,v)});
 m.save={...createInitialSaveData(),storage_owner:'a'};switchUser('a');
 writeSyncJournal('a',{...readSyncJournal('a'),initialized:true});
 m.setState.mockImplementation((patch:any)=>{if(patch.saveData)m.save=patch.saveData;});
 m.read.mockResolvedValue({data:null,error:null});m.rpc.mockResolvedValue({data:{committed:true,revision:1},error:null});
});
afterEach(() => { invalidateCloudSyncSession();vi.clearAllTimers();vi.useRealTimers();vi.unstubAllGlobals(); });
describe('cloud sync account isolation', () => {
  it('discards a profile response after switching accounts', async () => {
    const pending = deferred<any>(); m.read.mockReturnValueOnce(pending.promise);
    const sync = smartSyncOnLogin('a'); switchUser('b');
    pending.resolve({ data: { display_name: 'Account A' }, error: null });
    expect(await sync).toBe(false);
    expect(m.updateProfile).not.toHaveBeenCalled(); expect(m.persist).not.toHaveBeenCalled(); expect(m.rpc).not.toHaveBeenCalled();
  });
  it('does not upload local progress when cloud read failed', async () => {
    m.read.mockImplementation(async (table: string) => ({ data: null, error: table === 'game_saves' ? new Error('Offline') : null }));
    expect(await smartSyncOnLogin('a')).toBe(false); expect(m.rpc).not.toHaveBeenCalled();
  });
  it('reports failed upload instead of claiming sync success', async () => {
    m.rpc.mockResolvedValue({ error: { message: 'Denied' } });
    expect(await smartSyncOnLogin('a')).toBe(false);
  });
  it('does not let an old timer upload another account', async () => {
    vi.useFakeTimers(); scheduleDebouncedCloudSync(); switchUser('b');
    await vi.advanceTimersByTimeAsync(4000); expect(m.rpc).not.toHaveBeenCalled();
  });
  it('invalidates old work even after switching back to the same account', async () => {
    const pending = deferred<any>(); m.read.mockReturnValueOnce(pending.promise);
    const sync = smartSyncOnLogin('a'); switchUser('b'); switchUser('a');
    pending.resolve({ data: null, error: null });
    expect(await sync).toBe(false); expect(m.rpc).not.toHaveBeenCalled();
  });
  it('does not report an upload as current after changing accounts', async () => {
    const pending = deferred<any>();const started=deferred<void>();m.rpc.mockImplementationOnce(()=>{started.resolve();return pending.promise;});
    const upload=uploadGameSaveToCloud(m.save);await started.promise;switchUser('b');pending.resolve({data:{committed:true,revision:1},error:null});
    expect(await upload).toBe(false);
    expect(m.rpc.mock.calls[0][1].p_expected_owner).toBe('a');
  });
  it('uploads successfully when the cloud confirms no save exists', async () => {
    expect(await smartSyncOnLogin('a')).toBe(true); expect(m.rpc.mock.calls[0][1].p_expected_owner).toBe('a');
  });
});

it('never grants Pro from the cloud game-save payload',async()=>{
  const free={tier:'free',status:'none',isPro:false};
  Object.assign(m.save,{subscription:free});
  m.read.mockImplementation(async(table:string)=>({data:table==='game_saves'?{save_data:{...m.save,subscription:{tier:'pioneer_lifetime',status:'lifetime',isPro:true}},updated_at:'2026-11-01',revision:1}:null,error:null}));
  expect(await smartSyncOnLogin('a')).toBe(true);
  expect(m.save.subscription).toEqual(free);
  Object.assign(m.save,{subscription:undefined});
});

it('refuses a payload owned by another account before issuing any upload',async()=>{
  Object.assign(m.save,{storage_owner:'b'});
  expect(await uploadGameSaveToCloud(m.save as any)).toBe(false);
  expect(m.rpc).not.toHaveBeenCalled();
});
