import { GAME_CONFIG } from './config';
import { saveStorageKey } from './storage';
import { validateRimbaBackup, BackupValidationResult } from './backupManager';
export interface ProgressMigration {
  kind: 'legacy' | 'guest'; raw: string; fingerprint: string; validation: BackupValidationResult;
}
const choiceKey = (owner: string, kind: ProgressMigration['kind']) =>
  'rimba_progress_choice:' + encodeURIComponent(owner) + ':' + kind;
export async function getProgressMigration(owner: string): Promise<ProgressMigration | null> {
  const sources: Array<[ProgressMigration['kind'],string]> = [['legacy',GAME_CONFIG.storageKey]];
  if (owner !== 'guest') sources.push(['guest',saveStorageKey('guest')]);
  for (const [kind,key] of sources) {
    const raw=localStorage.getItem(key); if(!raw) continue;
    const validation=validateRimbaBackup(raw);
    if(kind==='guest' && validation.isValid) {
      const s=validation.data!;
      if(!s.focus_sessions.length && !(s.todos?.length) && s.world_objects.length<=2 &&
        s.currency_ledger.length<=2 && (s.islands?.length||0)<=1 && (s.world.unlocked_tiles?.length||0)<=9) continue;
    }
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));
    const fingerprint=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    if(localStorage.getItem(choiceKey(owner,kind))===fingerprint) continue;
    return {kind,raw,fingerprint,validation};
  }
  return null;
}
export function rememberProgressChoice(owner:string, source:ProgressMigration):void {
  localStorage.setItem(choiceKey(owner,source.kind),source.fingerprint);
}
