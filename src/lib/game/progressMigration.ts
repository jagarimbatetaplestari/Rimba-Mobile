import { GAME_CONFIG } from './config';
import { saveStorageKey } from './storage';
import { validateRimbaBackup, BackupValidationResult } from './backupManager';
import { hasMeaningfulProgress } from '../supabase/syncJournal';

export interface ProgressMigration {
  kind: 'legacy' | 'guest';
  raw: string;
  fingerprint: string;
  validation: BackupValidationResult;
}

const choiceKey = (owner: string, kind: ProgressMigration['kind']) =>
  'rimba_progress_choice:' + encodeURIComponent(owner) + ':' + kind;

const choiceDoneKey = (owner: string, kind: ProgressMigration['kind']) =>
  'rimba_progress_choice_done:' + encodeURIComponent(owner) + ':' + kind;

export async function getProgressMigration(owner: string): Promise<ProgressMigration | null> {
  if (!owner) return null;

  // If the active owner already has their own saved sessions, do not nag with migration prompts
  try {
    const ownerRaw = localStorage.getItem(saveStorageKey(owner));
    if (ownerRaw) {
      const ownerVal = validateRimbaBackup(ownerRaw);
      if (ownerVal.isValid && ownerVal.data && hasMeaningfulProgress(ownerVal.data)) {
        return null;
      }
    }
  } catch {}

  const sources: Array<[ProgressMigration['kind'], string]> = [['legacy', GAME_CONFIG.storageKey]];
  if (owner !== 'guest') sources.push(['guest', saveStorageKey('guest')]);

  for (const [kind, key] of sources) {
    if (localStorage.getItem(choiceDoneKey(owner, kind)) === '1') continue;

    const raw = localStorage.getItem(key);
    if (!raw) continue;

    const validation = validateRimbaBackup(raw);
    if (!validation.isValid || !validation.data) {
      // Do not block login for empty/stale legacy keys; remember dismissal automatically
      localStorage.setItem(choiceDoneKey(owner, kind), '1');
      continue;
    }

    const s = validation.data;
    // Skip starter/empty saves for BOTH legacy and guest
    if (!hasMeaningfulProgress(s)) {
      localStorage.setItem(choiceDoneKey(owner, kind), '1');
      continue;
    }

    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
    const fingerprint = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
    if (localStorage.getItem(choiceKey(owner, kind)) === fingerprint) {
      localStorage.setItem(choiceDoneKey(owner, kind), '1');
      continue;
    }

    return { kind, raw, fingerprint, validation };
  }
  return null;
}

export function rememberProgressChoice(owner: string, source: ProgressMigration): void {
  localStorage.setItem(choiceKey(owner, source.kind), source.fingerprint);
  localStorage.setItem(choiceDoneKey(owner, source.kind), '1');
  if (source.kind === 'legacy') {
    try {
      localStorage.removeItem(GAME_CONFIG.storageKey);
    } catch {}
  }
}
