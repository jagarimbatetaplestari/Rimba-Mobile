"use client";

import React from "react";
import { TreePine, AlertTriangle, ShieldCheck, HeartHandshake, CloudRain } from "lucide-react";
import { soundManager } from "@/lib/audio/sounds";
import { hapticLight, hapticSuccess, hapticWarning } from "@/lib/mobile/nativeBridge";
import { FocusSession } from "@/types/game";

interface AbandonConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmAbandon: () => void;
  session: FocusSession | null;
  secondsRemaining: number;
}

export function AbandonConfirmModal({
  isOpen,
  onClose,
  onConfirmAbandon,
  session,
  secondsRemaining,
}: AbandonConfirmModalProps) {
  if (!isOpen || !session) return null;

  const totalSeconds = (session.duration_minutes || 25) * 60;
  const elapsedSeconds = Math.max(0, totalSeconds - secondsRemaining);
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const remainingMinutes = Math.ceil(secondsRemaining / 60);
  const progressPercent = Math.min(
    100,
    Math.round((elapsedSeconds / totalSeconds) * 100),
  );

  const handleKeepFocusing = () => {
    soundManager.playPop();
    hapticSuccess();
    onClose();
  };

  const handleGiveUp = () => {
    hapticWarning();
    soundManager.playPop();
    onConfirmAbandon();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 select-none font-urbanist"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-sm rounded-3xl border border-white/60 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-6 shadow-2xl shadow-emerald-950/20 backdrop-blur-xl text-center space-y-5 animate-in zoom-in-95 duration-200">
        {/* Lingkaran Peringatan & Pohon Layu */}
        <div className="relative mx-auto w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shadow-inner">
          <TreePine className="w-8 h-8 stroke-[1.8] text-amber-700/80" />
          <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-xs">
            <AlertTriangle className="w-3.5 h-3.5 stroke-[2.4]" />
          </span>
        </div>

        {/* Judul & Pesan Filosofis */}
        <div className="space-y-1.5">
          <h3 className="text-[19px] font-bold text-[#0D3528] tracking-tight">
            Ikhlaskan Sesi Ini?
          </h3>
          <p className="text-[13px] text-[#4C7567] leading-relaxed">
            Bibit pohon yang sedang kamu rawat akan{" "}
            <strong className="text-amber-800 font-semibold">
              layu menjadi tunggul lapuk
            </strong>{" "}
            di pulaumu.
          </p>
        </div>

        {/* Progress Card */}
        <div className="p-3.5 rounded-2xl bg-[#0D3528]/5 border border-[#0D3528]/10 text-left space-y-2">
          <div className="flex justify-between items-center text-[11.5px]">
            <span className="text-[#4C7567] font-medium">Perjalanan Batin:</span>
            <span className="font-semibold text-[#187557] tabular-nums">
              {elapsedMinutes} mnt tercapai · sisa {remainingMinutes} mnt
            </span>
          </div>

          <div className="h-2 w-full rounded-full bg-[#0D3528]/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-[#187557] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <p className="text-[11px] text-[#4C7567]/90 leading-normal flex items-center gap-1.5 pt-0.5">
            <CloudRain className="w-3.5 h-3.5 shrink-0 text-slate-500" />
            <span>
              Tinggal sedikit lagi sebelum bibit ini tumbuh kokoh dan abadi.
            </span>
          </p>
        </div>

        {/* Tombol Aksi */}
        <div className="space-y-2.5 pt-1">
          {/* Tombol Utama: Terus Bertahan */}
          <button
            type="button"
            onClick={handleKeepFocusing}
            className="w-full py-3 px-4 rounded-full bg-gradient-to-r from-[#187557] via-[#208b68] to-[#2BB688] hover:opacity-95 text-white font-semibold text-[13.5px] shadow-md shadow-[#187557]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
            <span>Lanjutkan Fokus (Jaga Bibit)</span>
          </button>

          {/* Tombol Sekunder: Menyerah */}
          <button
            type="button"
            onClick={handleGiveUp}
            className="w-full py-2 px-4 rounded-full text-rose-600/80 hover:text-rose-700 hover:bg-rose-50/50 font-medium text-[12px] active:scale-[0.98] transition-all cursor-pointer"
          >
            Ikhlaskan & Biarkan Layu
          </button>
        </div>
      </div>
    </div>
  );
}
