'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/lib/auth/useAuthStore';
import { useGameStore } from '@/lib/game/useGameStore';
import { getActiveSaveOwner } from '@/lib/game/storage';
import { getProgressMigration, rememberProgressChoice, ProgressMigration } from '@/lib/game/progressMigration';
import { createIslandSnapshot, downloadSaveDataBackup } from '@/lib/game/backupManager';
import { usePreferencesStore } from '@/lib/settings/usePreferencesStore';
import { getLevelFromXp } from '@/lib/game/levelRules';
import { Sparkles, Smartphone, Cloud, Download, Check } from 'lucide-react';

export function ProgressMigrationModal({
  owner,
  onBlockingChange,
}: {
  owner: string;
  onBlockingChange: (value: boolean) => void;
}) {
  const isEn = usePreferencesStore((s) => s.language) === 'en';
  const activeSession = useGameStore((s) => s.activeSession);
  const currentSave = useGameStore((s) => s.saveData);
  const [source, setSource] = useState<ProgressMigration | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let current = true;
    setSource(null);
    setError('');
    setChecking(true);
    void getProgressMigration(owner)
      .then((value) => {
        if (current) {
          setSource(value);
          setChecking(false);
        }
      })
      .catch(() => {
        if (current) {
          setChecking(false);
          setSource(null);
        }
      });
    return () => {
      current = false;
    };
  }, [owner, isEn]);

  useEffect(() => {
    onBlockingChange(checking || !!source || !!error);
  }, [checking, source, error, onBlockingChange]);

  useEffect(() => {
    if ((source || error) && dialog.current && !dialog.current.open) {
      dialog.current.showModal();
    }
  }, [source, error]);

  const currentOwner = () => {
    const user = useAuthStore.getState().user;
    return getActiveSaveOwner() === owner && (user?.isGuest ? 'guest' : user?.id) === owner;
  };

  const choose = async (restore: boolean) => {
    if (!source || busy || !currentOwner()) return;
    setBusy(true);
    setError('');
    let restored = false;
    try {
      if (restore) {
        if (!source.validation.isValid || !source.validation.data) return;
        createIslandSnapshot(
          useGameStore.getState().saveData,
          isEn ? 'Before restoring device progress' : 'Sebelum memulihkan progres perangkat'
        );
        if (!useGameStore.getState().importSaveData(source.validation.data)) {
          throw new Error('Restore declined');
        }
        restored = true;
      }
      rememberProgressChoice(owner, source);
      if (currentOwner()) setSource(null);
    } catch {
      setError(
        restored
          ? isEn
            ? 'Progress restored. Keep a backup.'
            : 'Progres dipulihkan. Simpan cadangan.'
          : isEn
            ? 'Could not apply selection. Current progress kept.'
            : 'Pilihan belum berhasil. Progres saat ini dipertahankan.'
      );
    } finally {
      setBusy(false);
    }
  };

  if (!source && !error) return null;

  const deviceData = source?.validation.data;
  const deviceSessions = deviceData?.focus_sessions?.length ?? 0;
  const deviceLevel = getLevelFromXp(deviceData?.profile?.xp ?? 0);
  const accountSessions = currentSave?.focus_sessions?.length ?? 0;
  const accountLevel = getLevelFromXp(currentSave?.profile?.xp ?? 0);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="progress-migration-title"
      onCancel={(event) => {
        event.preventDefault();
        void choose(false);
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-[34px] border border-white/75 bg-white/85 p-5 text-[#0D3528] shadow-[0_24px_64px_rgba(10,38,26,0.28)] backdrop-blur-2xl backdrop:bg-black/45 backdrop:backdrop-blur-md"
      style={{
        fontFamily: "var(--font-urbanist), 'Urbanist', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div className="relative space-y-4">
        {/* Specular Top Edge */}
        <div className="pointer-events-none absolute -top-5 inset-x-6 h-px bg-gradient-to-r from-transparent via-white to-transparent" />

        {/* Compact Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#BCE5D3] bg-gradient-to-br from-[#E4F4ED] to-white text-[#187557] shadow-xs">
            <Sparkles className="h-5 w-5 stroke-[2]" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="progress-migration-title" className="text-[17px] font-bold tracking-tight text-[#0D3528]">
              {isEn ? 'Choose Your Sanctuary' : 'Pilih Progres Suaka'}
            </h2>
            <p className="text-[11.5px] text-[#4C7567] leading-snug">
              {isEn
                ? 'Found guest progress on this device. Pick which copy to keep.'
                : 'Ditemukan progres tamu di perangkat ini. Pilih data yang ingin dipakai.'}
            </p>
          </div>
        </div>

        {/* Bento Comparison Cards */}
        {source && (
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl border border-[#BCE5D3] bg-white/90 p-3 shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#187557]">
                <Smartphone className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{isEn ? 'Device Copy' : 'Data Perangkat'}</span>
              </div>
              <p className="text-[16px] font-extrabold text-[#0D3528] tabular-nums">
                Lv. {deviceLevel}
              </p>
              <p className="text-[11px] text-[#4C7567] tabular-nums">
                {deviceSessions} {isEn ? 'focus sessions' : 'sesi fokus'}
              </p>
            </div>

            <div className="rounded-2xl border border-[#0D3528]/10 bg-[#F4F9F6]/90 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#4C7567]">
                <Cloud className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{isEn ? 'This Account' : 'Akun Saat Ini'}</span>
              </div>
              <p className="text-[16px] font-extrabold text-[#0D3528] tabular-nums">
                Lv. {accountLevel}
              </p>
              <p className="text-[11px] text-[#4C7567] tabular-nums">
                {accountSessions} {isEn ? 'focus sessions' : 'sesi fokus'}
              </p>
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-2xl bg-rose-50 border border-rose-200 p-2.5 text-xs font-medium text-rose-800">
            {error}
          </p>
        )}

        {/* Primary & Secondary Actions */}
        {source && (
          <div className="space-y-2 pt-0.5">
            <button
              type="button"
              autoFocus
              disabled={busy}
              onClick={() => void choose(false)}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#187557] to-[#125D44] px-4 py-3 text-[13px] font-bold text-white shadow-md shadow-[#187557]/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              <Check className="h-4 w-4 stroke-[2.4]" />
              <span>{isEn ? 'Use Account Progress' : 'Pakai Progres Akun Ini'}</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={busy || !source.validation.isValid || activeSession?.status === 'active'}
                onClick={() => void choose(true)}
                className="rounded-2xl border border-[#BCE5D3] bg-white hover:bg-[#E4F4ED]/60 px-3 py-2.5 text-[11.5px] font-semibold text-[#0D3528] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
              >
                {isEn ? 'Restore Device' : 'Pulihkan Perangkat'}
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void downloadSaveDataBackup(source.raw).catch(() =>
                    setError(isEn ? 'Export failed.' : 'Ekspor gagal.')
                  )
                }
                className="flex items-center justify-center gap-1.5 rounded-2xl border border-[#0D3528]/10 bg-white/70 hover:bg-white px-3 py-2.5 text-[11.5px] font-medium text-[#4C7567] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{isEn ? 'Backup File' : 'Simpan File'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}
