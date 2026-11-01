import { RimbaSaveData } from '@/types/game';
import { validateRimbaBackup } from '../game/backupManager';
import { MAX_BACKUP_BYTES } from '../game/backupSchema';
export interface PendingSaveCommit { id:string; baseRevision:number|null; payload:string; hash:string; }
export interface SyncJournal {
  version:1; initialized:boolean; revision:number|null; baseline:string|null; blocked:boolean; pending:PendingSaveCommit|null;
}
const revisionValid=(value:unknown)=>value===null||(typeof value==='number'&&Number.isSafeInteger(value)&&value>=0);
const hashValid=(value:unknown)=>value===null||(typeof value==='string'&&/^[a-f0-9]{64}$/.test(value));
export const syncJournalKey=(owner:string)=>'rimba_sync_v2:owner:'+encodeURIComponent(owner);
export function readSyncJournal(owner:string):SyncJournal {
  const raw=localStorage.getItem(syncJournalKey(owner));
  if(!raw)return {version:1,initialized:false,revision:null,baseline:null,blocked:false,pending:null};
  try {
    if(raw.length>MAX_BACKUP_BYTES*2+4096)throw new Error('size');
    const state=JSON.parse(raw) as SyncJournal;
    if(!state||state.version!==1||typeof state.initialized!=='boolean'||typeof state.blocked!=='boolean'||
      !revisionValid(state.revision)||!hashValid(state.baseline))throw new Error('schema');
    if(state.pending!==null) {
      const pending=state.pending;
      if(!pending||typeof pending.id!=='string'||!pending.id||!revisionValid(pending.baseRevision)||
        !hashValid(pending.hash)||pending.hash===null||typeof pending.payload!=='string'||
        !validateRimbaBackup(pending.payload).isValid)throw new Error('pending');
    }
    return state;
  }catch {throw new Error('Status sinkronisasi perlu dipulihkan. Progres dan antrean asli dipertahankan.');}
}
export function writeSyncJournal(owner:string,state:SyncJournal):void {
  localStorage.setItem(syncJournalKey(owner),JSON.stringify(state));
}
function sorted(value:any):any {
  if(Array.isArray(value))return value.map(sorted);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().filter(k=>value[k]!==undefined).map(k=>[k,sorted(value[k])]));
  return value;
}
export function canonicalProgress(save:RimbaSaveData):string {
  const result=validateRimbaBackup(save);
  if(!result.isValid||!result.data)throw new Error(result.error||'Game save is invalid.');
  return JSON.stringify(sorted(result.data));
}
export async function progressHash(canonical:string):Promise<string> {
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
export function hasMeaningfulProgress(save:RimbaSaveData):boolean {
  return !!(save.focus_sessions.length||save.todos?.length||save.currency_ledger.length>2||
    save.world.name!=='My Rimba'||(save.islands?.length||0)>1||(save.world.unlocked_tiles?.length||0)!==9||
    save.world_objects.length!==2||save.world_objects.some(o=>
      o.status!=='active'||(o.id!=='obj_tree_starter'&&o.id!=='obj_path_starter')||
      (o.id==='obj_tree_starter'&&(o.grid_x!==3||o.grid_y!==4||o.model_variant!=='tree_oak'))||
      (o.id==='obj_path_starter'&&(o.grid_x!==4||o.grid_y!==5||o.model_variant!=='path_stone'))));
}
export type SyncAction='adopt_cloud'|'upload_local'|'already_synced'|'conflict';
export function reconcileProgress(local:string,remote:string|null,
  journal:Pick<SyncJournal,'initialized'|'baseline'|'revision'>,meaningful:boolean):SyncAction {
  if(local===remote)return 'already_synced';
  if(remote===null)return journal.initialized&&journal.revision!==null?'conflict':'upload_local';
  if(!journal.initialized)return meaningful?'conflict':'adopt_cloud';
  if(local===journal.baseline)return 'adopt_cloud';
  if(remote===journal.baseline)return 'upload_local';
  return 'conflict';
}
