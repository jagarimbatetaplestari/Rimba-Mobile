import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import { createInitialSaveData } from '../src/lib/game/storage';
let items:Map<string,string>;
beforeEach(()=>{items=new Map();vi.stubGlobal('localStorage',{getItem:(k:string)=>items.get(k)??null,setItem:(k:string,v:string)=>items.set(k,v)});});
afterEach(()=>vi.unstubAllGlobals());
it('keeps pending request identity and payload durable across reload',async()=>{
 const {readSyncJournal,writeSyncJournal}=await import('../src/lib/supabase/syncJournal');
 const journal=readSyncJournal('a');journal.initialized=true;journal.pending={id:'request-a',baseRevision:null,payload:JSON.stringify(createInitialSaveData()),hash:'a'.repeat(64)};
 writeSyncJournal('a',journal);expect(readSyncJournal('a')).toEqual(journal);expect(readSyncJournal('b').pending).toBeNull();
});
it('refuses malformed sync state without replacing its original bytes',async()=>{
 const {readSyncJournal,syncJournalKey}=await import('../src/lib/supabase/syncJournal');items.set(syncJournalKey('a'),'{broken');
 expect(()=>readSyncJournal('a')).toThrow();expect(items.get(syncJournalKey('a'))).toBe('{broken');
});
it('canonicalizes game progress without transferring identity or Pro',async()=>{
 const {canonicalProgress}=await import('../src/lib/supabase/syncJournal');const a=createInitialSaveData();
 const b={...a,storage_owner:'foreign',profile:{...a.profile,name:'Different'},subscription:{...a.subscription!,isPro:true}};
 expect(canonicalProgress(a)).toBe(canonicalProgress(b));expect(canonicalProgress(b)).not.toContain('storage_owner');expect(canonicalProgress(b)).not.toContain('subscription');
});
it('selects a whole-copy conflict instead of unioning divergent progress',async()=>{
 const {reconcileProgress}=await import('../src/lib/supabase/syncJournal');
 expect(reconcileProgress('local','remote',{initialized:true,baseline:'base',revision:4},true)).toBe('conflict');
});
it('adopts remote only when local is unchanged or the first local save is empty',async()=>{
 const {reconcileProgress}=await import('../src/lib/supabase/syncJournal');
 expect(reconcileProgress('base','remote',{initialized:true,baseline:'base',revision:4},true)).toBe('adopt_cloud');
 expect(reconcileProgress('new','remote',{initialized:false,baseline:null,revision:null},false)).toBe('adopt_cloud');
 expect(reconcileProgress('meaningful','remote',{initialized:false,baseline:null,revision:null},true)).toBe('conflict');
});
it('uploads local only against an unchanged or confirmed-empty cloud base',async()=>{
 const {reconcileProgress}=await import('../src/lib/supabase/syncJournal');
 expect(reconcileProgress('local','base',{initialized:true,baseline:'base',revision:4},true)).toBe('upload_local');
 expect(reconcileProgress('local',null,{initialized:false,baseline:null,revision:null},true)).toBe('upload_local');
 expect(reconcileProgress('local',null,{initialized:true,baseline:'old',revision:4},true)).toBe('conflict');
});
it('recognizes matching copies regardless of old base metadata',async()=>{
 const {reconcileProgress}=await import('../src/lib/supabase/syncJournal');
 expect(reconcileProgress('same','same',{initialized:true,baseline:'older',revision:2},true)).toBe('already_synced');
});
it('does not mark an outbox durable after quota failure',async()=>{
 const {readSyncJournal,writeSyncJournal}=await import('../src/lib/supabase/syncJournal');
 vi.stubGlobal('localStorage',{getItem:()=>null,setItem:()=>{throw new Error('Quota');}});
 expect(()=>writeSyncJournal('a',readSyncJournal('a'))).toThrow();
});
