import { GAME_CONFIG } from './config';
import { createInitialSaveData, saveStorageKey } from './storage';
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

function starterComparable(save: NonNullable<BackupValidationResult['data']>): string {
  // Starter generation varies these timestamps and ledger IDs on each device.
  // Compare everything else conservatively, including names, rewards and balances.
  const comparable = {
    ...save,
    currency_ledger: save.currency_ledger.map(({ id: _id, ...entry }) => entry),
  };
  return JSON.stringify(comparable, (key, value) => {
    if (key === 'created_at' || key === 'last_focus_completed_at') return undefined;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.fromEntries(Object.keys(value).sort().map((k) => [k, value[k]]));
    }
    return value;
  });
}

export async function getProgressMigration(owner: string): Promise<ProgressMigration | null> {
  if (!owner) return null;

  const sources: Array<[ProgressMigration['kind'], string]> = [['legacy', GAME_CONFIG.storageKey]];
  if (owner !== 'guest') sources.push(['guest', saveStorageKey('guest')]);

  for (const [kind, key] of sources) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;

    const validation = validateRimbaBackup(raw);
    // Recheck empty saves on every lookup so later progress is still offered.
    // Invalid sources remain available for original-data export.
    if (validation.isValid && validation.data && !hasMeaningfulProgress(validation.data)) {
      const starter = validateRimbaBackup(createInitialSaveData()).data!;
      if (starterComparable(validation.data) === starterComparable(starter)) continue;
    }

    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
    const fingerprint = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
    if (localStorage.getItem(choiceKey(owner, kind)) === fingerprint) {
      continue;
    }

    return { kind, raw, fingerprint, validation };
  }
  return null;
}

export function rememberProgressChoice(owner: string, source: ProgressMigration): void {
  localStorage.setItem(choiceKey(owner, source.kind), source.fingerprint);
}
