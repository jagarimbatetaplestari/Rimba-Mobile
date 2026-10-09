"use client";

import React from "react";
import { useTranslation } from "@/lib/i18n/translations";
import { Sparkles, Pause, ShieldCheck, ArrowRight, X } from "lucide-react";
import { soundManager } from "@/lib/audio/sounds";
import { hapticLight, hapticMedium } from "@/lib/mobile/nativeBridge";

interface FocusReturnOverlayProps {
  isOpen: boolean;
  awaySeconds: number;
  onResume: () => void;
  onPause: () => void;
  onAbandon: () => void;
}

export function FocusReturnOverlay({
  isOpen,
  awaySeconds,
  onResume,
  onPause,
  onAbandon,
}: FocusReturnOverlayProps) {
  const { language } = useTranslation();

  if (!isOpen) return null;

  const formatAwayTime = (seconds: number) => {
    if (seconds < 60) {
      return language === "en" ? `${seconds} seconds` : `${seconds} detik`;
    }
    const mins = Math.floor(seconds / 60);
    const sec = seconds % 60;
    if (sec === 0) {
      return language === "en" ? `${mins} minutes` : `${mins} menit`;
    }
    return language === "en"
      ? `${mins}m ${sec}s`
      : `${mins} menit ${sec} detik`;
  };

  /*
   * Apple Liquid Glass Modal Styling
   */
  const glassStyle: React.CSSProperties = {
    background:
      "linear-gradient(180deg, rgba(255, 255, 255, 0.45) 0%, rgba(20, 65, 45, 0.65) 28%, rgba(8, 28, 18, 0.92) 100%)",
    backdropFilter: "blur(36px) saturate(190%) contrast(102%)",
    WebkitBackdropFilter: "blur(36px) saturate(190%) contrast(102%)",
    border: "1px solid rgba(255, 255, 255, 0.45)",
    boxShadow:
      "inset 0 1.5px 2px 0 rgba(255, 255, 255, 0.8), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.35), 0 28px 65px rgba(0, 0, 0, 0.45)",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', var(--font-geist-sans), sans-serif",
  };

  return (
    <div className="fixed inset-0 z-[125] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200 select-none pointer-events-auto">
      <div
        style={glassStyle}
        className="w-full max-w-sm rounded-[34px] p-6 text-white text-center flex flex-col items-center gap-3.5 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
      >
        {/* Top ambient glass arch */}
        <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/30 to-transparent pointer-events-none rounded-t-[34px]" />

        {/* Ambient Badge Icon */}
        <div className="w-16 h-16 rounded-full bg-gradient-to-b from-white/30 to-emerald-500/20 border border-white/40 flex items-center justify-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.7)] mt-1">
          <Sparkles className="w-7 h-7 text-emerald-300 stroke-[2.2] animate-pulse drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" />
        </div>

        {/* Header & Body Text */}
        <div className="space-y-1.5 relative z-10 px-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/14 border border-white/25 text-emerald-100 text-[11px] font-semibold tracking-tight shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300 stroke-[2.2]" />
            <span>
              {language === "en" ? "Focus Kept Safe" : "Sesi Tetap Terjaga"}
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white drop-shadow-xs">
            {language === "en"
              ? "Welcome Back to Sanctuary"
              : "Selamat Datang Kembali di Suaka"}
          </h2>
          <p className="text-[12px] text-white/85 leading-relaxed max-w-xs mx-auto">
            {language === "en" ? (
              <>
                You were away for{" "}
                <b className="text-emerald-200">{formatAwayTime(awaySeconds)}</b>
                . Your session is still active. Take a mindful breath and
                continue.
              </>
            ) : (
              <>
                Kamu sempat berada di luar suaka selama{" "}
                <b className="text-emerald-200">{formatAwayTime(awaySeconds)}</b>
                . Sesi fokusmu tetap berjalan aman. Tarik napas dan lanjutkan
                ritmemu.
              </>
            )}
          </p>
        </div>

        {/* Primary Action Button: Lanjutkan Fokus */}
        <div className="w-full space-y-2 pt-1 relative z-10">
          <button
            type="button"
            onClick={() => {
              soundManager.playPop();
              hapticLight();
              onResume();
            }}
            className="w-full py-3.5 px-4 rounded-2xl bg-white text-[#0f2e1e] hover:bg-white/95 font-bold text-[13px] tracking-tight shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 fill-current text-emerald-700" />
            <span>
              {language === "en" ? "Continue Focus" : "Lanjutkan Fokus 🌱"}
            </span>
            <ArrowRight className="w-4 h-4 stroke-[2.4]" />
          </button>

          {/* Secondary Actions: Pause Session / Abandon */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                soundManager.playPop();
                hapticLight();
                onPause();
              }}
              className="py-2.5 px-3 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white text-xs font-semibold border border-white/25 flex items-center justify-center gap-1.5 cursor-pointer backdrop-blur-md"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>{language === "en" ? "Pause Timer" : "Jeda Sesi ⏸️"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundManager.playPop();
                hapticMedium();
                onAbandon();
              }}
              className="py-2.5 px-3 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 active:scale-95 transition-all text-rose-200 hover:text-white text-xs font-semibold border border-rose-400/30 flex items-center justify-center gap-1.5 cursor-pointer backdrop-blur-md"
            >
              <X className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>{language === "en" ? "End Session" : "Akhiri Sesi"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
