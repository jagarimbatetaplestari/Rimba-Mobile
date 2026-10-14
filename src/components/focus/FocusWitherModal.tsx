"use client";

import React, { useMemo } from "react";
import { createPortal } from "react-dom";
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

  const modalContent = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) handleDismiss();
      }}
      className="fixed inset-0 z-[120] pointer-events-auto flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-in fade-in duration-200 select-none font-urbanist"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-3xl border border-white/60 bg-gradient-to-b from-white/95 via-white/95 to-white/90 p-6 shadow-2xl shadow-emerald-950/20 backdrop-blur-xl text-center space-y-5 animate-in zoom-in-95 duration-200 text-[#0D3528] pointer-events-auto"
      >
        {/* Tombol Tutup Silang di Sudut */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[#0D3528]/5 hover:bg-[#0D3528]/10 active:scale-90 flex items-center justify-center text-[#4C7567] hover:text-[#0D3528] transition-all cursor-pointer"
          aria-label={t.common.close}
        >
          <X className="w-3.5 h-3.5 stroke-[2]" />
        </button>

        {/* Lingkaran Visual Pohon Layu */}
        <div className="relative mx-auto w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700/80 shadow-inner group">
          <TreePine className="w-8 h-8 stroke-[1.8] text-amber-700/80" />
          <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-xs">
            <AlertTriangle className="w-3.5 h-3.5 stroke-[2.4]" />
          </span>
          <span className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[9px] border-2 border-white shadow-xs">
            <Wind className="w-3 h-3 animate-pulse" />
          </span>
        </div>

        {/* Judul & Pesan */}
        <div className="space-y-1.5">
          <h3 className="text-[19px] font-bold text-[#0D3528] tracking-tight">
            {t.wither.title}
          </h3>
          <p className="text-[12.5px] text-[#4C7567] leading-relaxed px-1">
            {t.wither.subtitlePre}
            <strong className="text-amber-800 font-semibold">
              {t.wither.subtitleHighlight}
            </strong>
            {t.wither.subtitlePost}
          </p>
        </div>

        {/* Ringkasan Kegagalan & Status Lahan */}
        <div className="p-3.5 rounded-2xl bg-[#0D3528]/5 border border-[#0D3528]/10 text-left space-y-2">
          <div className="flex justify-between items-center text-[11.5px]">
            <span className="text-[#4C7567] font-medium">
              {t.wither.timeElapsed}
            </span>
            <span className="font-semibold text-[#0D3528] tabular-nums">
              {t.wither.timeElapsedVal
                .replace("{elapsed}", String(elapsedMin))
                .replace("{total}", String(durationMin))}
            </span>
          </div>

          <div className="flex justify-between items-center text-[11.5px] pt-1 border-t border-[#0D3528]/8">
            <span className="text-[#4C7567] font-medium">
              {t.wither.islandImpact}
            </span>
            <span className="font-semibold text-rose-600 flex items-center gap-1">
              <span>🍂</span> {t.wither.islandImpactVal}
            </span>
          </div>

          <div className="flex justify-between items-center text-[11px] pt-0.5 text-[#4C7567]">
            <span>{t.wither.restoreCost}</span>
            <span className="text-amber-700 font-semibold">50 Soul</span>
          </div>
        </div>

        {/* Kutipan Refleksi */}
        <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/70 text-left">
          <p className="text-[11.5px] italic text-amber-950/80 leading-relaxed font-normal">
            &ldquo;{quote}&rdquo;
          </p>
        </div>

        {/* Tombol Aksi */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleDismiss}
            className="py-2.5 px-3 rounded-full text-[12px] font-semibold bg-black/5 hover:bg-black/10 text-[#4C7567] hover:text-[#0D3528] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-[#0D3528]/10"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{t.wither.viewIsland}</span>
          </button>

          <button
            type="button"
            onClick={handleTryAgain}
            className="py-2.5 px-3 rounded-full text-[12px] font-semibold bg-gradient-to-r from-[#187557] via-[#208b68] to-[#2BB688] hover:opacity-95 text-white active:scale-95 transition-all shadow-md shadow-[#187557]/20 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t.wither.tryAgain}</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}
