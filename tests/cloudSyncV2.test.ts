import { afterEach,beforeEach,expect,it,vi } from 'vitest';
const m=vi.hoisted(()=>({user:{id:'a',isGuest:false} as any,save:null as any,remote:null as any,rpc:vi.fn(),direct:vi.fn(),persist:vi.fn(),listeners:[] as any[]}));
vi.mock('../src/lib/auth/useAuthStore',()=>({useAuthStore:{getState:()=>({user:m.user,updateProfile:vi.fn()}),subscribe:(f:any)=>{m.listeners.push(f);return()=>{};}}}));
vi.mock('../src/lib/game/useGameStore',()=>({useGameStore:{getState:()=>({saveData:m.save,activeSession:null,notify:vi.fn()}),setState:(patch:any)=>{if(patch.saveData)m.save=patch.saveData;}}}));
vi.mock('../src/lib/mobile/nativeBridge',()=>({isNativeMobile:()=>false}));
vi.mock('../src/lib/supabase/client',()=>({supabase:{rpc:m.rpc,from:(table:string)=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:table==='game_saves'?m.remote:null,error:null})})}),upsert:m.direct})}}));
let sync:typeof import('../src/lib/supabase/cloudSync');
let journal:typeof import('../src/lib/supabase/syncJournal');
let items:Map<string,string>;
let setItem:ReturnType<typeof vi.fn>;
beforeEach(async()=>{
 vi.resetModules();vi.clearAllMocks();m.listeners=[];m.user={id:'a',isGuest:false};m.remote=null;
 items=new Map();setItem=vi.fn((k:string,v:string)=>{items.set(k,v);});
 const storage={getItem:(k:string)=>items.get(k)??null,setItem};vi.stubGlobal('localStorage',storage);vi.stubGlobal('window',{localStorage:storage});
 const {selectSaveOwner}=await import('../src/lib/game/storage');m.save=selectSaveOwner('a');
 journal=await import('../src/lib/supabase/syncJournal');sync=await import('../src/lib/supabase/cloudSync');
 m.rpc.mockResolvedValue({data:{committed:true,revision:1},error:null});m.direct.mockResolvedValue({error:null});
});
afterEach(()=>{sync?.invalidateCloudSyncSession();vi.unstubAllGlobals();});
async function base(){const hash=await journal.progressHash(journal.canonicalProgress(m.save));journal.writeSyncJournal('a',{...journal.readSyncJournal('a'),initialized:true,revision:1,baseline:hash});}
it('does not bypass the journal by uploading before the initial cloud lookup',async()=>{
 expect(await sync.uploadGameSaveToCloud(m.save)).toBe(false);expect(m.rpc).not.toHaveBeenCalled();expect(m.direct).not.toHaveBeenCalled();
});
it('commits a confirmed-empty cloud through the revision RPC with expected owner',async()=>{
 expect(await sync.smartSyncOnLogin('a')).toBe(true);expect(m.direct).not.toHaveBeenCalled();
 expect(m.rpc.mock.calls[0][0]).toBe('commit_game_save_v2');expect(m.rpc.mock.calls[0][1]).toMatchObject({p_expected_owner:'a',p_expected_revision:null});
 expect(m.rpc.mock.calls[0][1].p_save_data.subscription).toBeUndefined();expect(journal.readSyncJournal('a').revision).toBe(1);
});
it('loads an existing cloud sanctuary into an empty local account without granting cloud Pro',async()=>{
 const remote={...m.save,world:{...m.save.world,name:'Cloud sanctuary'},subscription:{...m.save.subscription,isPro:true}};
 m.remote={save_data:remote,revision:3,updated_at:'2026-11-01T00:00:00Z'};
 expect(await sync.smartSyncOnLogin('a')).toBe(true);expect(m.save.world.name).toBe('Cloud sanctuary');
 expect(m.save.storage_owner).toBe('a');expect(m.save.subscription.isPro).toBe(false);expect(m.rpc).not.toHaveBeenCalled();
});
it('keeps both divergent copies for explicit choice rather than unioning objects',async()=>{
 await base();const remote={...m.save,world:{...m.save.world,name:'Cloud edited'}};
 m.save={...m.save,world:{...m.save.world,name:'Offline edited'}};
 m.remote={save_data:remote,revision:2,updated_at:'2026-11-01T00:00:00Z'};
 expect(await sync.smartSyncOnLogin('a')).toBe(false);expect(m.save.world.name).toBe('Offline edited');expect(m.rpc).not.toHaveBeenCalled();
 expect(sync.useCloudSyncStatus.getState().conflict?.cloudSave?.world.name).toBe('Cloud edited');
});
it('retries the durable identical mutation after an uncertain network response',async()=>{
 await base();m.save={...m.save,world:{...m.save.world,name:'Offline edit'}};
 m.rpc.mockResolvedValueOnce({data:null,error:new Error('Network')}).mockResolvedValueOnce({data:{committed:true,revision:2},error:null});
 expect(await sync.uploadGameSaveToCloud(m.save)).toBe(false);
 const pending=journal.readSyncJournal('a').pending;expect(pending).not.toBeNull();
 expect(await sync.uploadGameSaveToCloud(m.save)).toBe(true);
 expect(m.rpc.mock.calls[0][1].p_mutation_id).toBe(m.rpc.mock.calls[1][1].p_mutation_id);
 expect(journal.readSyncJournal('a').pending).toBeNull();expect(journal.readSyncJournal('a').revision).toBe(2);
});
it('does not send any request if the outbox cannot be saved',async()=>{
 await base();m.save={...m.save,world:{...m.save.world,name:'Dirty before quota failure'}};setItem.mockImplementation((key:string,value:string)=>{if(key===journal.syncJournalKey('a'))throw new Error('Quota');items.set(key,value);});
 expect(await sync.uploadGameSaveToCloud(m.save)).toBe(false);expect(m.rpc).not.toHaveBeenCalled();
});
it('does not claim synced when a new local edit arrives during hashing',async()=>{
 await base();
 let started!:()=>void,release!:()=>void;
 const hashing=new Promise<void>(resolve=>{started=resolve;}),gate=new Promise<void>(resolve=>{release=resolve;});
 const original=crypto.subtle.digest.bind(crypto.subtle);
 const spy=vi.spyOn(crypto.subtle,'digest').mockImplementationOnce(async(...args)=>{
   const result=await original(...args);started();await gate;return result;
 });
 try{
   const uploading=sync.uploadGameSaveToCloud(m.save);await hashing;
   m.save={...m.save,world:{...m.save.world,name:'New edit during hashing'}};release();
   expect(await uploading).toBe(false);expect(m.rpc).not.toHaveBeenCalled();
   expect(sync.useCloudSyncStatus.getState().phase).toBe('pending');
 }finally{spy.mockRestore();}
});
async function divergentCopies(){
 await base();const remote={...m.save,world:{...m.save.world,name:'Cloud edited'}};
 m.save={...m.save,world:{...m.save.world,name:'Offline edited'}};
 m.remote={save_data:remote,revision:2,updated_at:'2026-11-01T00:00:00Z'};
 expect(await sync.smartSyncOnLogin('a')).toBe(false);
}
it('preserves both snapshots before explicitly choosing the cloud copy',async()=>{
 await divergentCopies();expect(await sync.resolveCloudConflict('cloud')).toBe(true);
 expect(m.save.world.name).toBe('Cloud edited');expect(m.save.storage_owner).toBe('a');
 expect(journal.readSyncJournal('a')).toMatchObject({revision:2,blocked:false,pending:null});
 const snapshots=JSON.parse(items.get('rimba_island_snapshots:owner:a')!);
 expect(snapshots).toHaveLength(2);expect(snapshots.map((s:any)=>s.data.world.name)).toEqual(['Cloud edited','Offline edited']);
});
it('uses the reviewed cloud revision when explicitly keeping the local copy',async()=>{
 await divergentCopies();m.rpc.mockResolvedValue({data:{committed:true,revision:3},error:null});
 expect(await sync.resolveCloudConflict('local')).toBe(true);expect(m.save.world.name).toBe('Offline edited');
 expect(m.rpc.mock.calls[0][1]).toMatchObject({p_expected_owner:'a',p_expected_revision:2,p_save_data:{world:{name:'Offline edited'}}});
});
it('requires a new choice if the remote revision changes before confirmation',async()=>{
 await divergentCopies();m.remote={...m.remote,revision:3};
 expect(await sync.resolveCloudConflict('cloud')).toBe(false);expect(m.save.world.name).toBe('Offline edited');
 expect(sync.useCloudSyncStatus.getState().conflict?.revision).toBe(3);expect(m.rpc).not.toHaveBeenCalled();
});
it('reconciles an uncertain commit before sending newer offline changes',async()=>{
 await base();m.save={...m.save,world:{...m.save.world,name:'First edit'}};
 m.rpc.mockImplementationOnce(async(_name,args)=>{m.remote={save_data:args.p_save_data,revision:2,updated_at:'2026-11-01T00:00:00Z'};return {data:null,error:new Error('Lost acknowledgement')};});
 expect(await sync.uploadGameSaveToCloud(m.save)).toBe(false);
 const originalRequest=m.rpc.mock.calls[0][1].p_mutation_id;
 m.save={...m.save,world:{...m.save.world,name:'Later offline edit'}};
 m.rpc.mockResolvedValueOnce({data:{committed:true,revision:2},error:null}).mockResolvedValueOnce({data:{committed:true,revision:3},error:null});
 expect(await sync.smartSyncOnLogin('a')).toBe(true);
 expect(m.rpc.mock.calls[1][1].p_mutation_id).toBe(originalRequest);
 expect(m.rpc.mock.calls[2][1].p_mutation_id).not.toBe(originalRequest);
 expect(m.rpc.mock.calls[2][1]).toMatchObject({p_expected_revision:2,p_save_data:{world:{name:'Later offline edit'}}});
});
it('rejects malformed cloud progress without replacing or uploading local data',async()=>{
 m.remote={save_data:{version:1,profile:{},world:{}},revision:2,updated_at:'2026-11-01'};
 const before=m.save;expect(await sync.smartSyncOnLogin('a')).toBe(false);
 expect(m.save).toBe(before);expect(m.rpc).not.toHaveBeenCalled();expect(sync.useCloudSyncStatus.getState().phase).toBe('offline');
});
it('blocks subsequent writes when the server reports a newer revision',async()=>{
 await base();m.save={...m.save,world:{...m.save.world,name:'Offline edit'}};
 m.remote={save_data:{...m.save,world:{...m.save.world,name:'New cloud edit'}},revision:2,updated_at:'2026-11-01'};
 m.rpc.mockResolvedValue({data:{committed:false,revision:2},error:null});
 expect(await sync.uploadGameSaveToCloud(m.save)).toBe(false);
 expect(journal.readSyncJournal('a').blocked).toBe(true);
 expect(await sync.uploadGameSaveToCloud(m.save)).toBe(false);expect(m.rpc).toHaveBeenCalledTimes(1);
 expect(sync.useCloudSyncStatus.getState().conflict?.cloudSave?.world.name).toBe('New cloud edit');
});
it('does not replace current progress if conflict snapshots cannot be made durable',async()=>{
 await divergentCopies();const before=m.save;
 setItem.mockImplementation((key:string,value:string)=>{if(key.startsWith('rimba_island_snapshots'))throw new Error('Quota');items.set(key,value);});
 expect(await sync.resolveCloudConflict('cloud')).toBe(false);expect(m.save).toBe(before);
 expect(journal.readSyncJournal('a').blocked).toBe(true);expect(m.rpc).not.toHaveBeenCalled();
});
it('serializes login reconciliation behind an in-flight upload for the same owner',async()=>{
 await base();m.save={...m.save,world:{...m.save.world,name:'Queued edit'}};
 let started!:()=>void,release!:()=>void;
 const began=new Promise<void>(r=>{started=r;}),gate=new Promise<void>(r=>{release=r;});
 m.rpc.mockImplementationOnce(async(_name,args)=>{started();await gate;m.remote={save_data:args.p_save_data,revision:2,updated_at:'2026-11-01T00:00:00Z'};return {data:{committed:true,revision:2},error:null};});
 const upload=sync.uploadGameSaveToCloud(m.save);await began;
 const login=sync.smartSyncOnLogin('a');await new Promise(r=>setTimeout(r,10));
 const requestsBeforeAck=m.rpc.mock.calls.length;release();
 await Promise.all([upload,login]);
 expect(requestsBeforeAck).toBe(1);expect(m.rpc).toHaveBeenCalledTimes(1);
 expect(journal.readSyncJournal('a')).toMatchObject({revision:2,pending:null,blocked:false});
});
