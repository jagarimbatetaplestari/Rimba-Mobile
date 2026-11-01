'use client';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/lib/auth/useAuthStore';
import { useGameStore } from '@/lib/game/useGameStore';
import { getActiveSaveOwner } from '@/lib/game/storage';
import { getProgressMigration, rememberProgressChoice, ProgressMigration } from '@/lib/game/progressMigration';
import { createIslandSnapshot, downloadSaveDataBackup } from '@/lib/game/backupManager';
import { usePreferencesStore } from '@/lib/settings/usePreferencesStore';

export function ProgressMigrationModal({ owner }: { owner: string }) {
  const isEn = usePreferencesStore(s => s.language) === 'en';
  const activeSession = useGameStore(s => s.activeSession);
  const [source,setSource] = useState<ProgressMigration | null>(null);
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    let current=true;
    setSource(null);setError('');
    void getProgressMigration(owner).then(value=>{if(current)setSource(value);}).catch(()=>{
      if(current)setError(isEn?'Device progress could not be checked. Keep app data and try again.':'Progres perangkat belum dapat diperiksa. Pertahankan data aplikasi dan coba lagi.');
    });
    return ()=>{current=false;};
  },[owner,isEn]);
  useEffect(()=>{if((source||error)&&dialog.current&&!dialog.current.open)dialog.current.showModal();},[source,error]);
  const currentOwner = () => {
    const user=useAuthStore.getState().user;
    return getActiveSaveOwner()===owner && (user?.isGuest?'guest':user?.id)===owner;
  };
  const choose = async (restore:boolean) => {
    if(!source||busy||!currentOwner())return;
    setBusy(true);setError('');let restored=false;
    try {
      const latest=await getProgressMigration(owner);
      if(!currentOwner())return;
      if(latest?.fingerprint!==source.fingerprint){setSource(latest);return;}
      if(restore) {
        if(!source.validation.isValid||!source.validation.data)return;
        createIslandSnapshot(useGameStore.getState().saveData,isEn?'Before restoring device progress':'Sebelum memulihkan progres perangkat');
        if(!useGameStore.getState().importSaveData(source.validation.data))throw new Error('Restore declined');
        restored=true;
      }
      rememberProgressChoice(owner,source);
      const next=await getProgressMigration(owner);
      if(currentOwner())setSource(next);
    } catch {
      setError(restored
        ? (isEn?'Progress was restored, but the choice could not be remembered. Keep a backup.':'Progres sudah dipulihkan, tetapi pilihan belum tersimpan. Simpan cadangan.')
        : (isEn?'The choice could not be completed. Current progress and the original copy were kept.':'Pilihan belum dapat diselesaikan. Progres saat ini dan salinan asli dipertahankan.'));
    } finally {setBusy(false);}
  };
  const cancel=async()=>{if(!busy&&currentOwner())await useAuthStore.getState().logout();};
  if(!source&&!error)return null;
  return <dialog ref={dialog} aria-labelledby="progress-migration-title" onCancel={event=>{event.preventDefault();void cancel();}}
    className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-[var(--glass-border)] bg-[var(--glass-surface-from)] p-6 text-[var(--ink-primary)] shadow-2xl backdrop:bg-[var(--bg-canvas-deep)] backdrop:opacity-80">
    <div className="space-y-4">
      <h2 id="progress-migration-title" className="text-xl font-semibold">{isEn?'Choose your progress':'Pilih progres Anda'}</h2>
      <p className="text-sm leading-relaxed text-[var(--ink-secondary)]">{isEn
        ? `Progress from ${source?.kind==='guest'?'guest play':'an earlier app version'} is still on this device. Restore it only if it belongs to you. Restoring replaces this account’s sanctuary; a snapshot is saved first. Purchases are not transferred.`
        : `Progres ${source?.kind==='guest'?'guest':'dari versi sebelumnya'} masih ada di perangkat. Pulihkan hanya jika progres ini milik Anda. Pemulihan mengganti suaka akun ini; snapshot akan dibuat lebih dulu. Pembelian tidak dipindahkan.`}</p>
      {source&&!source.validation.isValid&&<p className="text-sm" role="alert">{isEn?'This copy needs recovery. Export the original and contact support.':'Salinan ini perlu dipulihkan. Ekspor data asli dan hubungi dukungan.'}</p>}
      {error&&<p role="alert" className="text-sm">{error}</p>}
      {source&&<>
        <button autoFocus disabled={busy||!source.validation.isValid||activeSession?.status==='active'} onClick={()=>void choose(true)}
          className="w-full rounded-2xl bg-[var(--accent-forest)] px-4 py-3 text-[var(--glass-highlight)] disabled:opacity-50">{isEn?'This progress is mine — restore it':'Progres ini milik saya — pulihkan'}</button>
        <button disabled={busy} onClick={()=>void choose(false)} className="w-full rounded-2xl border border-[var(--accent-forest-border)] px-4 py-3">{isEn?'Use this account’s progress':'Pakai progres akun ini'}</button>
        <button disabled={busy} onClick={()=>void downloadSaveDataBackup(source.raw).catch(()=>setError(isEn?'Export failed. Keep app data.':'Ekspor gagal. Pertahankan data aplikasi.'))}
          className="w-full px-4 py-2 underline">{isEn?'Export original copy':'Ekspor salinan asli'}</button>
      </>}
      <button disabled={busy} onClick={()=>void cancel()} className="w-full px-4 py-2">{isEn?'Cancel and return to sign-in':'Batalkan dan kembali ke layar masuk'}</button>
    </div>
  </dialog>;
}
