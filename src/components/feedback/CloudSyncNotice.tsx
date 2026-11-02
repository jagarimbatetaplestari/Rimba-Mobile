'use client';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/lib/auth/useAuthStore';
import { useGameStore } from '@/lib/game/useGameStore';
import { usePreferencesStore } from '@/lib/settings/usePreferencesStore';
import { useCloudSyncStatus, resolveCloudConflict, smartSyncOnLogin } from '@/lib/supabase/cloudSync';

export function CloudSyncNotice({ blocked }: { blocked: boolean }) {
  const user = useAuthStore((s) => s.user);
  const sync = useCloudSyncStatus();
  const local = useGameStore((s) => s.saveData);
  const active = useGameStore((s) => s.activeSession);
  const isEn = usePreferencesStore((s) => s.language) === 'en';
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  const conflict = sync.conflict?.owner === user?.id ? sync.conflict : null;
  const open = !!conflict && sync.showConflict && !blocked;

  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    else if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);

  const later = () => {
    if (!busy) useCloudSyncStatus.setState({ showConflict: false });
  };

  const choose = async (choice: 'local' | 'cloud') => {
    if (busy) return;
    setBusy(true);
    try {
      await resolveCloudConflict(choice);
    } finally {
      setBusy(false);
    }
  };

  const retry = async () => {
    if (!user || busy) return;
    if (conflict) {
      useCloudSyncStatus.setState({ showConflict: true });
      return;
    }
    setBusy(true);
    try {
      await smartSyncOnLogin(user.id);
    } finally {
      setBusy(false);
    }
  };

  if (!user || user.isGuest || local.storage_owner !== user.id || blocked) return null;

  // Never show intrusive floating "Synced" / "Syncing" / "Pending" pills over the Focus HUD.
  // Only surface an actionable pill when conflict or sync error requires user attention.
  const requiresAttention = sync.phase === 'conflict' || sync.phase === 'error';
  if (!requiresAttention && !conflict) return null;

  const label = isEn
    ? ({
        conflict: 'Choose your saved progress',
        error: 'Sync needs attention · Tap to retry',
      }[sync.phase as 'conflict' | 'error'] || 'Sync notice')
    : ({
        conflict: 'Pilih progres tersimpan',
        error: 'Periksa sinkronisasi · Ketuk coba lagi',
      }[sync.phase as 'conflict' | 'error'] || 'Info sinkronisasi');

  return (
    <>
      {requiresAttention && (
        <button
          disabled={busy || sync.isSyncing}
          onClick={() => void retry()}
          aria-label={label}
          style={{ top: 'max(calc(env(safe-area-inset-top, 0px) + 62px), 74px)' }}
          className="fixed left-1/2 z-[80] min-h-9 max-w-[calc(100%-2rem)] -translate-x-1/2 whitespace-nowrap rounded-full border border-amber-300/80 bg-white/95 px-4 py-1.5 text-xs font-semibold text-[#0D3528] shadow-md backdrop-blur-md disabled:opacity-70"
        >
          {label}
        </button>
      )}
      {conflict && (
        <dialog
          ref={dialog}
          aria-labelledby="cloud-conflict-title"
          onCancel={(event) => {
            event.preventDefault();
            later();
          }}
          className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-[#BCE5D3] bg-white p-6 text-[#0D3528] shadow-2xl backdrop:bg-[#051F18]/80"
        >
          <div className="space-y-4">
            <h2 id="cloud-conflict-title" className="text-xl font-semibold">
              {isEn ? 'Choose your saved progress' : 'Pilih progres tersimpan'}
            </h2>
            <p className="text-sm leading-relaxed text-[#4C7567]">
              {isEn
                ? 'This device and the cloud have different progress. Choose one complete copy. Both available copies will be saved as snapshots before replacement. Purchases are kept separately.'
                : 'Perangkat ini dan cloud memiliki progres berbeda. Pilih satu salinan utuh. Kedua salinan yang tersedia akan disimpan sebagai snapshot sebelum penggantian. Pembelian tetap terpisah.'}
            </p>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border border-[#BCE5D3] bg-[#F4F9F6] p-3">
                <dt className="font-semibold">{isEn ? 'This device' : 'Perangkat ini'}</dt>
                <dd className="mt-0.5 text-xs text-[#4C7567]">
                  {local.focus_sessions.length} {isEn ? 'sessions' : 'sesi'} · {local.world_objects.length}{' '}
                  {isEn ? 'objects' : 'objek'}
                </dd>
              </div>
              <div className="rounded-2xl border border-[#BCE5D3] bg-[#F4F9F6] p-3">
                <dt className="font-semibold">Cloud</dt>
                <dd className="mt-0.5 text-xs text-[#4C7567]">
                  {conflict.cloudSave
                    ? `${conflict.cloudSave.focus_sessions.length} ${isEn ? 'sessions' : 'sesi'} · ${conflict.cloudSave.world_objects.length} ${isEn ? 'objects' : 'objek'}`
                    : isEn
                      ? 'No copy available'
                      : 'Belum ada salinan'}
                </dd>
              </div>
            </dl>
            {sync.error && (
              <p role="alert" className="text-sm text-rose-700">
                {isEn
                  ? 'The choice could not finish. Any snapshots already saved remain available.'
                  : 'Pilihan belum selesai. Snapshot yang sudah tersimpan tetap tersedia.'}
              </p>
            )}
            {active?.status === 'active' && (
              <p className="text-sm text-amber-800">
                {isEn
                  ? 'Finish or cancel the current focus session before loading the cloud copy.'
                  : 'Selesaikan atau batalkan sesi fokus sebelum memuat salinan cloud.'}
              </p>
            )}
            <button
              autoFocus
              disabled={busy}
              onClick={() => void choose('local')}
              className="w-full rounded-2xl bg-[#187557] px-4 py-3 font-semibold text-white disabled:opacity-50"
            >
              {isEn ? 'Keep this device’s progress' : 'Pakai progres perangkat ini'}
            </button>
            <button
              disabled={busy || !conflict.cloudSave || active?.status === 'active'}
              onClick={() => void choose('cloud')}
              className="w-full rounded-2xl border border-[#BCE5D3] bg-[#F4F9F6] px-4 py-3 font-semibold text-[#0D3528] disabled:opacity-50"
            >
              {isEn ? 'Use the cloud copy' : 'Pakai salinan cloud'}
            </button>
            <button disabled={busy} onClick={later} className="w-full px-4 py-2 text-sm text-[#4C7567]">
              {isEn ? 'Decide later' : 'Pilih nanti'}
            </button>
          </div>
        </dialog>
      )}
    </>
  );
}
