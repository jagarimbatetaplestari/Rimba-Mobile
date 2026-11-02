import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('../src/lib/audio/musicPlayer',()=>({musicPlayer:{stop:vi.fn()}}));
const m = vi.hoisted(() => ({ session: null as any, initialNullEvent: false, signOutError: null as any, signOutOptions: undefined as any }));
vi.mock('../src/lib/supabase/client', () => ({ supabase: {
  functions:{invoke:async()=>({data:{deleted:true,appleRevoked:false},error:null})},
  auth: {
    signInWithPassword: async ({email}: any) => { const user={id:email.split('@')[0],email}; m.session={user}; return {data:{user,session:m.session},error:null}; },
    onAuthStateChange: (callback:any)=>{if(m.initialNullEvent)queueMicrotask(()=>callback('INITIAL_SESSION',null));},
    getSession: async () => ({data:{session:m.session},error:null}),
    getUser: async()=>({data:{user:{...m.session?.user,identities:[{provider:'email'}]}},error:null}),
    signOut: async (options:any) => { m.signOutOptions=options;if(m.signOutError)return {error:m.signOutError};m.session=null; return {error:null}; },
  },
  from: () => ({select: () => ({eq: () => ({maybeSingle: async () => ({data:null,error:null})})}),upsert: async()=>({error:null})}),
} }));
let useAuthStore: typeof import('../src/lib/auth/useAuthStore').useAuthStore;
let useGameStore: typeof import('../src/lib/game/useGameStore').useGameStore;
let createInitialSaveData: typeof import('../src/lib/game/storage').createInitialSaveData;
let saveSaveData: typeof import('../src/lib/game/storage').saveSaveData;
let items: Map<string,string>;
beforeEach(async () => {
  vi.resetModules();
  items=new Map();m.session=null;m.initialNullEvent=false;m.signOutError=null;m.signOutOptions=undefined;vi.stubGlobal('window',{ addEventListener: vi.fn(), removeEventListener: vi.fn() });vi.stubGlobal('localStorage',{
    getItem:(key:string)=>items.get(key)??null,setItem:(key:string,value:string)=>items.set(key,value),removeItem:(key:string)=>items.delete(key),
  });
  Object.assign(window,{localStorage});
  ({useAuthStore}=await import('../src/lib/auth/useAuthStore'));
  ({useGameStore}=await import('../src/lib/game/useGameStore'));
  ({createInitialSaveData,saveSaveData}=await import('../src/lib/game/storage'));
  useAuthStore.setState({user:null}); useGameStore.setState({saveData:createInitialSaveData(),activeSession:null});
});
afterEach(()=>vi.unstubAllGlobals());
const logIn=async(id:string)=>{expect((await useAuthStore.getState().loginWithEmail(id+'@example.test','test-password')).success).toBe(true);};
const rename=(name:string)=>{const data={...useGameStore.getState().saveData,world:{...useGameStore.getState().saveData.world,name}};saveSaveData(data);useGameStore.setState({saveData:data});};
it('ends only this device session and isolates Apple-style account history from guest',async()=>{
  await logIn('apple-owner');rename('Private Apple sanctuary');
  await useAuthStore.getState().logout();
  expect(m.signOutOptions).toEqual({scope:'local'});
  useAuthStore.getState().loginAsGuest();
  expect(useGameStore.getState().saveData.storage_owner).toBe('guest');
  expect(useGameStore.getState().saveData.world.name).not.toBe('Private Apple sanctuary');
});
it('does not pretend logout succeeded when the SDK failed to clear the session',async()=>{
  await logIn('a');rename('A offline progress');m.signOutError=new Error('Storage unavailable');
  await expect(useAuthStore.getState().logout()).rejects.toThrow('Storage unavailable');
  expect(useAuthStore.getState().user?.id).toBe('a');
  expect(useGameStore.getState().saveData.world.name).toBe('A offline progress');
});
it('does not delete an offline account save when logging out and returns to it after B', async()=>{
  await logIn('a');rename('A offline progress');await useAuthStore.getState().logout();
  await logIn('b');expect(useGameStore.getState().saveData.world.name).not.toBe('A offline progress');rename('B progress');
  await useAuthStore.getState().logout();await logIn('a');expect(useGameStore.getState().saveData.world.name).toBe('A offline progress');
});
it('does not silently upload or merge guest data into a different account', async()=>{
  useAuthStore.getState().loginAsGuest();rename('Guest private progress');await logIn('a');
  expect(useGameStore.getState().saveData.world.name).not.toBe('Guest private progress');
  await useAuthStore.getState().logout();useAuthStore.getState().loginAsGuest();
  expect(useGameStore.getState().saveData.world.name).toBe('Guest private progress');
});
it('restores a persisted guest namespace when INITIAL_SESSION races the startup lookup', async()=>{
  m.initialNullEvent=true;
  const guest=createInitialSaveData();guest.world.name='Guest after restart';
  saveSaveData(guest,'guest');
  useAuthStore.setState({user:{id:'old-guest',email:'',name:'Guest',isGuest:true,createdAt:''}});
  await useAuthStore.getState().initAuth();
  expect(useGameStore.getState().saveData.world.name).toBe('Guest after restart');
});
it('preserves current ownership after an explicit backup restore',async()=>{
  await logIn('a');
  const backup=createInitialSaveData();backup.world.name='Explicit restore';
  expect(useGameStore.getState().importSaveData(backup)).toBe(true);
  expect(useGameStore.getState().saveData.storage_owner).toBe('a');
});
it('does not store a late snapshot from A inside B history',async()=>{
  const {createIslandSnapshot,getIslandSnapshots}=await import('../src/lib/game/backupManager');
  await logIn('a');const a=useGameStore.getState().saveData;createIslandSnapshot(a,'A snapshot');
  await logIn('b');expect(getIslandSnapshots()).toEqual([]);
  expect(()=>createIslandSnapshot(a,'Late A snapshot')).toThrow();
  await logIn('a');expect(getIslandSnapshots().map(s=>s.title)).toEqual(['A snapshot']);
});

it('clears the deleted account outbox while retaining another account journal',async()=>{
 await logIn('a');const {syncJournalKey}=await import('../src/lib/supabase/syncJournal');
 items.set(syncJournalKey('a'),'private queued A progress');items.set(syncJournalKey('b'),'private queued B progress');
 await useAuthStore.getState().deleteAccountAndData();
 expect(items.has(syncJournalKey('a'))).toBe(false);expect(items.get(syncJournalKey('b'))).toBe('private queued B progress');
});
