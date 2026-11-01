'use client';
import { useEffect,useRef,useState } from 'react';
import { useAuthStore } from '@/lib/auth/useAuthStore';
import { useGameStore } from '@/lib/game/useGameStore';
import { usePreferencesStore } from '@/lib/settings/usePreferencesStore';
import { useCloudSyncStatus,resolveCloudConflict,smartSyncOnLogin } from '@/lib/supabase/cloudSync';
export function CloudSyncNotice({blocked}:{blocked:boolean}){
 const user=useAuthStore(s=>s.user),sync=useCloudSyncStatus();
 const local=useGameStore(s=>s.saveData),active=useGameStore(s=>s.activeSession);
 const isEn=usePreferencesStore(s=>s.language)==='en';
 const [busy,setBusy]=useState(false);const dialog=useRef<HTMLDialogElement>(null);
 const conflict=sync.conflict?.owner===user?.id?sync.conflict:null;
 const open=!!conflict&&sync.showConflict&&!blocked;
 useEffect(()=>{if(open&&!dialog.current?.open)dialog.current?.showModal();else if(!open&&dialog.current?.open)dialog.current.close();},[open]);
 const later=()=>{if(!busy)useCloudSyncStatus.setState({showConflict:false});};
 const choose=async(choice:'local'|'cloud')=>{if(busy)return;setBusy(true);try{await resolveCloudConflict(choice);}finally{setBusy(false);}};
 const retry=async()=>{if(!user||busy)return;if(conflict){useCloudSyncStatus.setState({showConflict:true});return;}
   setBusy(true);try{await smartSyncOnLogin(user.id);}finally{setBusy(false);}};
 if(!user||user.isGuest||local.storage_owner!==user.id||blocked||sync.phase==='idle')return null;
 const label=isEn
   ? ({syncing:'Syncing',pending:'Changes waiting to sync',synced:'Synced',offline:'Sync paused — retry',error:'Sync needs attention',conflict:'Choose your saved progress'}[sync.phase])
   : ({syncing:'Menyinkronkan',pending:'Perubahan menunggu sinkronisasi',synced:'Tersinkron',offline:'Sinkronisasi tertunda — coba lagi',error:'Periksa sinkronisasi',conflict:'Pilih progres tersimpan'}[sync.phase]);
 return <>
   <button disabled={busy||sync.isSyncing} onClick={()=>void retry()} aria-label={label}
     style={{bottom:'max(calc(env(safe-area-inset-bottom, 0px) + 96px), 108px)'}}
     className="fixed left-1/2 z-[80] min-h-11 max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-surface-from)] px-4 py-2 text-xs text-[var(--ink-primary)] shadow-lg backdrop-blur disabled:opacity-70">{label}</button>
   {conflict&&<dialog ref={dialog} aria-labelledby="cloud-conflict-title" onCancel={event=>{event.preventDefault();later();}}
     className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-[var(--glass-border)] bg-[var(--glass-surface-from)] p-6 text-[var(--ink-primary)] shadow-2xl backdrop:bg-[var(--bg-canvas-deep)] backdrop:opacity-80">
     <div className="space-y-4">
       <h2 id="cloud-conflict-title" className="text-xl font-semibold">{isEn?'Choose your saved progress':'Pilih progres tersimpan'}</h2>
       <p className="text-sm leading-relaxed text-[var(--ink-secondary)]">{isEn
         ? 'This device and the cloud have different progress. Choose one complete copy. Both available copies will be saved as snapshots before replacement. Purchases are kept separately.'
         : 'Perangkat ini dan cloud memiliki progres berbeda. Pilih satu salinan utuh. Kedua salinan yang tersedia akan disimpan sebagai snapshot sebelum penggantian. Pembelian tetap terpisah.'}</p>
       <dl className="grid grid-cols-2 gap-3 text-sm">
         <div className="rounded-2xl border border-[var(--accent-forest-border)] p-3"><dt className="font-semibold">{isEn?'This device':'Perangkat ini'}</dt><dd>{local.focus_sessions.length} {isEn?'sessions':'sesi'} · {local.world_objects.length} {isEn?'objects':'objek'}</dd></div>
         <div className="rounded-2xl border border-[var(--accent-forest-border)] p-3"><dt className="font-semibold">Cloud</dt><dd>{conflict.cloudSave?`${conflict.cloudSave.focus_sessions.length} ${isEn?'sessions':'sesi'} · ${conflict.cloudSave.world_objects.length} ${isEn?'objects':'objek'}`:(isEn?'No copy available':'Belum ada salinan')}</dd></div>
       </dl>
       {sync.error&&<p role="alert" className="text-sm">{isEn?'The choice could not finish. Any snapshots already saved remain available.':'Pilihan belum selesai. Snapshot yang sudah tersimpan tetap tersedia.'}</p>}
       {active?.status==='active'&&<p className="text-sm">{isEn?'Finish or cancel the current focus session before loading the cloud copy.':'Selesaikan atau batalkan sesi fokus sebelum memuat salinan cloud.'}</p>}
       <button autoFocus disabled={busy} onClick={()=>void choose('local')} className="w-full rounded-2xl bg-[var(--accent-forest)] px-4 py-3 text-[var(--glass-highlight)] disabled:opacity-50">{isEn?'Keep this device’s progress':'Pakai progres perangkat ini'}</button>
       <button disabled={busy||!conflict.cloudSave||active?.status==='active'} onClick={()=>void choose('cloud')} className="w-full rounded-2xl border border-[var(--accent-forest-border)] px-4 py-3 disabled:opacity-50">{isEn?'Use the cloud copy':'Pakai salinan cloud'}</button>
       <button disabled={busy} onClick={later} className="w-full px-4 py-2">{isEn?'Decide later':'Pilih nanti'}</button>
     </div>
   </dialog>}
 </>;
}
