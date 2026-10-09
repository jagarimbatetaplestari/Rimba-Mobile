"use client";

import React, { useMemo } from "react";
import { TreePine, AlertTriangle, Wind, Compass, RefreshCw, X } from "lucide-react";
import { soundManager } from "@/lib/audio/sounds";
import { hapticLight, hapticMedium } from "@/lib/mobile/nativeBridge";
import { FocusSession } from "@/types/game";
import { useTranslation } from "@/lib/i18n/translations";

interface FocusWitherModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: FocusSession | null;
  onRestartFocus?: () => void;
}

export function FocusWitherModal({
  isOpen,
  onClose,
  session,
  onRestartFocus,
}: FocusWitherModalProps) {
  const { t } = useTranslation();

  const quote = useMemo(() => {
    const list = t.wither.quotes;
    return list[Math.floor(Math.random() * list.length)];
  }, [isOpen, t.wither.quotes]);

  if (!isOpen) return null;

  const durationMin = session?.duration_minutes || 25;
  const startedAt = session?.started_at ? new Date(session.started_at).getTime() : Date.now();
  const elapsedMin = Math.max(1, Math.round((Date.now() - startedAt) / 60000));

  const handleDismiss = () => {
    soundManager.playPop();
    hapticLight();
    onClose();
  };

  const handleTryAgain = () => {
    soundManager.playPop();
    hapticMedium();
    onClose();
    if (onRestartFocus) {
      onRestartFocus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-in fade-in duration-200 select-none font-urbanist"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-sm rounded-3xl border border-stone-700/30 bg-gradient-to-b from-[#1C2022]/95 via-[#181B1D]/95 to-[#121416]/95 p-6 shadow-2xl shadow-black/60 backdrop-blur-xl text-center space-y-5 animate-in zoom-in-95 duration-200 text-stone-200">
        {/* Tombol Tutup Silang di Sudut */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 hover:bg-white/15 active:scale-90 flex items-center justify-center text-stone-400 hover:text-white transition-all cursor-pointer"
          aria-label={t.common.close}
        >
          <X className="w-3.5 h-3.5 stroke-[2]" />
        </button>

        {/* Lingkaran Visual Pohon Layu */}
        <div className="relative mx-auto w-18 h-18 rounded-3xl bg-stone-900/80 border border-stone-700/60 flex items-center justify-center text-stone-400 shadow-inner group">
          <TreePine className="w-9 h-9 stroke-[1.6] text-stone-500 opacity-80" />
          <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-rose-600/90 text-white flex items-center justify-center text-[10px] font-bold border-2 border-[#1C2022] shadow-sm">
            <AlertTriangle className="w-3.5 h-3.5 stroke-[2.4]" />
          </span>
          <span className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-amber-900/60 text-amber-300 flex items-center justify-center text-[9px] border-2 border-[#1C2022]">
            <Wind className="w-3 h-3 animate-pulse" />
          </span>
        </div>

        {/* Judul & Pesan */}
        <div className="space-y-1.5">
          <h3 className="text-[20px] font-bold text-stone-100 tracking-tight">
            {t.wither.title}
          </h3>
          <p className="text-[12.5px] text-stone-400 leading-relaxed px-2">
            {t.wither.subtitlePre}
            <strong className="text-amber-400/90 font-medium">
              {t.wither.subtitleHighlight}
            </strong>
            {t.wither.subtitlePost}
          </p>
        </div>

        {/* Ringkasan Kegagalan & Status Lahan */}
        <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-left space-y-2">
          <div className="flex justify-between items-center text-[11.5px]">
            <span className="text-stone-400 font-normal">
              {t.wither.timeElapsed}
            </span>
            <span className="font-semibold text-stone-200 tabular-nums">
              {t.wither.timeElapsedVal
                .replace("{elapsed}", String(elapsedMin))
                .replace("{total}", String(durationMin))}
            </span>
          </div>

          <div className="flex justify-between items-center text-[11.5px] pt-1 border-t border-white/[0.06]">
            <span className="text-stone-400 font-normal">
              {t.wither.islandImpact}
            </span>
            <span className="font-semibold text-rose-400 flex items-center gap-1">
              <span>🍂</span> {t.wither.islandImpactVal}
            </span>
          </div>

          <div className="flex justify-between items-center text-[11px] pt-0.5 text-stone-500">
            <span>{t.wither.restoreCost}</span>
            <span className="text-amber-400 font-medium">50 Soul</span>
          </div>
        </div>

        {/* Kutipan Refleksi */}
        <div className="p-3 rounded-2xl bg-amber-500/[0.06] border border-amber-500/15 text-left">
          <p className="text-[11px] italic text-amber-200/80 leading-relaxed font-normal">
            &ldquo;{quote}&rdquo;
          </p>
        </div>

        {/* Tombol Aksi */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleDismiss}
            className="py-2.5 px-3 rounded-full text-[12px] font-medium bg-white/10 hover:bg-white/15 text-stone-200 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-white/10"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{t.wither.viewIsland}</span>
          </button>

          <button
            type="button"
            onClick={handleTryAgain}
            className="py-2.5 px-3 rounded-full text-[12px] font-semibold bg-emerald-700 hover:bg-emerald-600 text-white active:scale-95 transition-all shadow-md shadow-emerald-950/40 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t.wither.tryAgain}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
