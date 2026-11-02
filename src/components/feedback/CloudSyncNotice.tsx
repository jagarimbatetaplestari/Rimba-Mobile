'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/lib/auth/useAuthStore';
import { useGameStore } from '@/lib/game/useGameStore';
import { usePreferencesStore } from '@/lib/settings/usePreferencesStore';
import { useCloudSyncStatus, resolveCloudConflict, smartSyncOnLogin } from '@/lib/supabase/cloudSync';
import { getLevelFromXp } from '@/lib/game/levelRules';
import { Cloud, Smartphone, Check } from 'lucide-react';

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

  const requiresAttention = sync.phase === 'conflict' || sync.phase === 'error';
  if (!requiresAttention && !conflict) return null;

  const label = isEn
    ? ({
        conflict: 'Choose saved progress',
        error: 'Sync retry',
      }[sync.phase as 'conflict' | 'error'] || 'Sync notice')
    : ({
        conflict: 'Pilih progres suaka',
        error: 'Coba sinkron ulang',
      }[sync.phase as 'conflict' | 'error'] || 'Info sinkronisasi');

  const localLevel = getLevelFromXp(local.profile?.xp ?? 0);
  const cloudLevel = getLevelFromXp(conflict?.cloudSave?.profile?.xp ?? 0);

  return (
    <>
      {requiresAttention && !open && (
        <button
          disabled={busy || sync.isSyncing}
          onClick={() => void retry()}
          aria-label={label}
          style={{ top: 'max(calc(env(safe-area-inset-top, 0px) + 64px), 76px)' }}
          className="fixed left-1/2 z-[80] min-h-8 max-w-[calc(100%-2rem)] -translate-x-1/2 whitespace-nowrap rounded-full border border-white/60 bg-white/85 px-3.5 py-1 text-[11px] font-bold text-[#0D3528] shadow-md backdrop-blur-xl disabled:opacity-70"
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
          className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-[34px] border border-white/75 bg-white/85 p-5 text-[#0D3528] shadow-[0_24px_64px_rgba(10,38,26,0.28)] backdrop-blur-2xl backdrop:bg-black/45 backdrop:backdrop-blur-md"
          style={{
            fontFamily: "var(--font-urbanist), 'Urbanist', -apple-system, BlinkMacSystemFont, sans-serif",
          }}
        >
          <div className="relative space-y-4">
            <div className="pointer-events-none absolute -top-5 inset-x-6 h-px bg-gradient-to-r from-transparent via-white to-transparent" />

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#BCE5D3] bg-gradient-to-br from-[#E4F4ED] to-white text-[#187557] shadow-xs">
                <Cloud className="h-5 w-5 stroke-[2]" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="cloud-conflict-title" className="text-[17px] font-bold tracking-tight text-[#0D3528]">
                  {isEn ? 'Sync Your Sanctuary' : 'Sinkronisasi Suaka'}
                </h2>
                <p className="text-[11.5px] text-[#4C7567] leading-snug">
                  {isEn
                    ? 'Choose which progress copy to use on this device.'
                    : 'Pilih data progres yang ingin digunakan di perangkat ini.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl border border-[#BCE5D3] bg-white/90 p-3 shadow-2xs space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#187557]">
                  <Smartphone className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{isEn ? 'This Device' : 'Perangkat Ini'}</span>
                </div>
                <p className="text-[16px] font-extrabold text-[#0D3528] tabular-nums">
                  Lv. {localLevel}
                </p>
                <p className="text-[11px] text-[#4C7567] tabular-nums">
                  {local.focus_sessions.length} {isEn ? 'sessions' : 'sesi'} · {local.world_objects.length}{' '}
                  {isEn ? 'items' : 'objek'}
                </p>
              </div>

              <div className="rounded-2xl border border-[#BCE5D3] bg-[#F4F9F6]/90 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#14664D]">
                  <Cloud className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Cloud</span>
                </div>
                <p className="text-[16px] font-extrabold text-[#0D3528] tabular-nums">
                  Lv. {cloudLevel}
                </p>
                <p className="text-[11px] text-[#4C7567] tabular-nums">
                  {conflict.cloudSave
                    ? `${conflict.cloudSave.focus_sessions.length} ${isEn ? 'sessions' : 'sesi'} · ${conflict.cloudSave.world_objects.length} ${isEn ? 'items' : 'objek'}`
                    : isEn
                      ? 'Empty'
                      : 'Kosong'}
                </p>
              </div>
            </div>

            {sync.error && (
              <p role="alert" className="rounded-2xl bg-rose-50 border border-rose-200 p-2.5 text-xs font-medium text-rose-700">
                {isEn
                  ? 'Could not complete sync. Snapshots remain safe.'
                  : 'Sinkronisasi belum selesai. Snapshot tetap aman.'}
              </p>
            )}

            {active?.status === 'active' && (
              <p className="rounded-2xl bg-emerald-50 border border-[#BCE5D3] p-2.5 text-xs font-medium text-[#0D3528]">
                {isEn
                  ? 'Finish your active focus session before switching to Cloud.'
                  : 'Selesaikan sesi fokus aktif sebelum beralih ke salinan Cloud.'}
              </p>
            )}

            <div className="space-y-2 pt-0.5">
              <button
                type="button"
                autoFocus
                disabled={busy}
                onClick={() => void choose('local')}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#187557] to-[#125D44] px-4 py-3 text-[13px] font-bold text-white shadow-md shadow-[#187557]/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
              >
                <Check className="h-4 w-4 stroke-[2.4]" />
                <span>{isEn ? 'Use This Device' : 'Pakai Data Perangkat Ini'}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busy || !conflict.cloudSave || active?.status === 'active'}
                  onClick={() => void choose('cloud')}
                  className="rounded-2xl border border-[#BCE5D3] bg-white hover:bg-[#E4F4ED]/60 px-3 py-2.5 text-[11.5px] font-semibold text-[#0D3528] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                >
                  {isEn ? 'Use Cloud Copy' : 'Pakai Data Cloud'}
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={later}
                  className="rounded-2xl border border-[#0D3528]/10 bg-white/70 hover:bg-white px-3 py-2.5 text-[11.5px] font-medium text-[#4C7567] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                >
                  {isEn ? 'Later' : 'Nanti Saja'}
                </button>
              </div>
            </div>
          </div>
        </dialog>
      )}
    </>
  );
}
