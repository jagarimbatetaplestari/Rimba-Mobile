"use client";

import React, { useEffect } from "react";
import confetti from "canvas-confetti";
import { useGameStore } from "@/lib/game/useGameStore";
import { FAUNA_CONFIG, canGreetFauna } from "@/lib/game/faunaRules";
import { soundManager } from "@/lib/audio/sounds";
import { useTranslation } from "@/lib/i18n/translations";
import { X, Sparkles, Heart, CheckCircle2 } from "lucide-react";

export function FaunaDialogPopover() {
  const { t } = useTranslation();
  const selectedFauna = useGameStore((state) => state.selectedFauna);
  const setSelectedFauna = useGameStore((state) => state.setSelectedFauna);
  const saveData = useGameStore((state) => state.saveData);
  const greetAnimal = useGameStore((state) => state.greetAnimal);
  const timeOfDay = useGameStore((state) => state.timeOfDay);
  const isNight = timeOfDay === "night";

  // Handle Escape key to close
  useEffect(() => {
    if (!selectedFauna) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setSelectedFauna(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedFauna, setSelectedFauna]);

  if (!selectedFauna) return null;

  const config = FAUNA_CONFIG[selectedFauna];
  if (!config) return null;

  const canGreet = canGreetFauna(selectedFauna, saveData);

  const handleGreet = () => {
    soundManager.playAnimalChirp();
    const result = greetAnimal(selectedFauna);
    if (result.success) {
      try {
        confetti({
          particleCount: 40,
          spread: 55,
          origin: { y: 0.7 },
          colors: ["#34D399", "#F43F5E", "#FBBF24"],
        });
      } catch {
        // Enhancement
      }
    }
  };

  /*
   * Apple Liquid Glass System
   */
  const cardGlassStyle: React.CSSProperties = {
    background: isNight
      ? "linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, rgba(12, 32, 21, 0.55) 25%, rgba(4, 16, 9, 0.85) 100%)"
      : "linear-gradient(180deg, rgba(255, 255, 255, 0.38) 0%, rgba(18, 52, 34, 0.48) 25%, rgba(8, 28, 17, 0.75) 100%)",
    backdropFilter: "blur(34px) saturate(190%)",
    WebkitBackdropFilter: "blur(34px) saturate(190%)",
    border: "1px solid rgba(255, 255, 255, 0.4)",
    boxShadow:
      "inset 0 1.5px 1.5px 0 rgba(255, 255, 255, 0.75), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.3), 0 24px 50px rgba(0, 0, 0, 0.32)",
  };

  return (
    <div
      className="fixed inset-x-0 z-40 flex justify-center px-4 pointer-events-none animate-in fade-in slide-in-from-bottom-4 duration-300 select-none"
      style={{
        bottom: "calc(max(env(safe-area-inset-bottom, 0px), 12px) + 118px)",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', var(--font-geist-sans), sans-serif",
      }}
    >
      <div
        style={cardGlassStyle}
        className="pointer-events-auto w-full max-w-sm rounded-[32px] p-4 text-white relative overflow-hidden transition-all shadow-2xl"
      >
        {/* Top ambient specular arch */}
        <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/20 to-transparent pointer-events-none rounded-t-[32px]" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2.5 relative z-10">
          <div className="flex items-center gap-3 min-w-0">
            {/* Fauna Icon Badge */}
            <div className="w-11 h-11 rounded-2xl bg-white/20 border border-white/35 flex items-center justify-center text-2xl shrink-0 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.6)]">
              {config.icon}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm tracking-tight text-white truncate drop-shadow-xs">
                  {config.name}
                </h3>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border backdrop-blur-md ${
                    isNight
                      ? "bg-indigo-400/20 text-indigo-200 border-indigo-300/35"
                      : "bg-white/18 text-white border-white/25 shadow-xs"
                  }`}
                >
                  {isNight ? t.faunaDialog.statusSleeping : t.faunaDialog.statusAwake}
                </span>
              </div>
              <p className="text-[11px] text-white/70 font-medium truncate mt-0.5">
                {config.title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedFauna(null)}
            className="w-7 h-7 rounded-full bg-white/18 hover:bg-white/28 border border-white/25 flex items-center justify-center text-white transition-all active:scale-90 cursor-pointer shadow-xs"
            aria-label={t.faunaDialog.closeAria}
          >
            <X className="w-3.5 h-3.5 stroke-[2.4]" />
          </button>
        </div>

        {/* Dialogue Box */}
        <div className="p-3 rounded-2xl bg-white/12 border border-white/20 mb-2.5 relative z-10 backdrop-blur-md">
          <p className="text-[12px] leading-relaxed text-white/95 font-medium tracking-tight">
            {isNight
              ? config.sleepQuote
                ? `“💤 ${config.sleepQuote}”`
                : t.faunaDialog.defaultSleepQuote.replace("{name}", config.name)
              : `“${config.greetingQuote}”`}
          </p>
        </div>

        {/* Compact Habitat Note */}
        <div className="flex items-center gap-1.5 text-[10.5px] text-white/70 mb-3 px-1 relative z-10">
          <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
          <span className="truncate">{config.unlockConditionText}</span>
        </div>

        {/* Action Button */}
        <div className="relative z-10">
          {canGreet ? (
            <button
              type="button"
              onClick={handleGreet}
              className="w-full py-2.5 px-4 rounded-2xl font-bold text-xs bg-white text-[#0f2e1e] hover:bg-white/95 shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              <span>
                {isNight ? t.faunaDialog.actionSleep : t.faunaDialog.actionGreet} (+
                {config.dailyReward.gold} Soul, +{config.dailyReward.xp} XP)
              </span>
            </button>
          ) : (
            <div className="w-full py-2.5 px-3 rounded-2xl bg-white/12 text-white/85 text-xs font-semibold flex items-center justify-center gap-1.5 border border-white/20 backdrop-blur-md">
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>{t.faunaDialog.alreadyGreeted}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
