"use client";

import React from "react";
import { useTranslation } from "@/lib/i18n/translations";
import { useGameStore } from "@/lib/game/useGameStore";
import { getLandFullState, LandFullState } from "@/lib/game/worldRules";
import { soundManager } from "@/lib/audio/sounds";
import { hapticLight, hapticMedium } from "@/lib/mobile/nativeBridge";
import { Trees, Maximize2, Sparkles, X, ArrowRight, Compass } from "lucide-react";

interface LandFullModalProps {
  isOpen: boolean;
  onClose: () => void;
  landState?: LandFullState | null;
  onFocusWithoutTree?: () => void;
  onOpenIslandSwitcher?: () => void;
}

export function LandFullModal({
  isOpen,
  onClose,
  landState,
  onFocusWithoutTree,
  onOpenIslandSwitcher,
}: LandFullModalProps) {
  const { language } = useTranslation();
  const isEn = language === "en";

  const saveData = useGameStore((state) => state.saveData);
  const setIsExpandLandMode = useGameStore((state) => state.setIsExpandLandMode);
  const startFocus = useGameStore((state) => state.startFocus);

  if (!isOpen) return null;

  const currentLandState =
    landState || getLandFullState(saveData.world, saveData.world_objects);

  const handleExpand = () => {
    soundManager.playPop();
    hapticMedium();
    onClose();
    setIsExpandLandMode(true);
  };

  const handleFocusWithoutTree = () => {
    soundManager.playStart();
    hapticLight();
    onClose();
    if (onFocusWithoutTree) {
      onFocusWithoutTree();
    } else {
      startFocus(undefined, undefined, undefined, undefined, undefined, undefined, true);
    }
  };

  const handleIslandSwitcher = () => {
    soundManager.playPop();
    hapticMedium();
    onClose();
    if (onOpenIslandSwitcher) {
      onOpenIslandSwitcher();
    } else if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("rimba:open_islands"));
    }
  };

  const glassStyle: React.CSSProperties = {
    background:
      "linear-gradient(180deg, rgba(255, 255, 255, 0.45) 0%, rgba(20, 65, 45, 0.65) 28%, rgba(8, 28, 18, 0.94) 100%)",
    backdropFilter: "blur(36px) saturate(190%) contrast(102%)",
    WebkitBackdropFilter: "blur(36px) saturate(190%) contrast(102%)",
    border: "1px solid rgba(255, 255, 255, 0.45)",
    boxShadow:
      "inset 0 1.5px 2px 0 rgba(255, 255, 255, 0.8), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.35), 0 28px 65px rgba(0, 0, 0, 0.5)",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', var(--font-geist-sans), sans-serif",
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200 select-none pointer-events-auto">
      <div
        style={glassStyle}
        className="w-full max-w-sm rounded-[34px] p-6 text-white text-center flex flex-col items-center gap-4 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
      >
        {/* Top ambient glass arch */}
        <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/30 to-transparent pointer-events-none rounded-t-[34px]" />

        {/* Close Button */}
        <button
          onClick={() => {
            soundManager.playPop();
            onClose();
          }}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white/80 transition-colors z-20 cursor-pointer"
          aria-label={isEn ? "Close" : "Tutup"}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Ambient Badge Icon */}
        <div className="w-16 h-16 rounded-full bg-gradient-to-b from-white/30 to-emerald-500/20 border border-white/40 flex items-center justify-center shadow-[inset_0_1px_2px_rgba(255,255,255,0.7)] mt-1">
          <Trees className="w-7 h-7 text-emerald-300 stroke-[2.2] drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" />
        </div>

        {/* Header & Body */}
        <div className="space-y-1.5 relative z-10 px-1">
          <h2 className="text-xl font-bold tracking-tight text-white drop-shadow-xs">
            {isEn ? "Sanctuary Island is Full" : "Lahan Suaka Telah Penuh"}
          </h2>
          <p className="text-[12px] text-white/85 leading-relaxed max-w-xs mx-auto">
            {currentLandState.isMaxExpansion
              ? isEn
                ? "All 100 tiles on your island have flourished into trees. You can tidy up existing trees, explore a new island, or continue focusing peacefully."
                : "Seluruh 100 petak di pulaumu telah mekar sempurna. Kamu dapat merapikan pohon, membuka pulau baru, atau tetap fokus dengan tenang."
              : isEn
              ? `All ${currentLandState.unlockedCount} unlocked tiles are currently occupied. Expand your land to cultivate more trees, or start a mindful focus session without planting.`
              : `Seluruh ${currentLandState.unlockedCount} petak tanah yang dibuka sudah terisi pohon. Perluas lahan pulaumu untuk menanam pohon baru, atau mulai fokus tanpa bibit.`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-2.5 relative z-10 pt-1">
          {currentLandState.canExpand && (
            <button
              onClick={handleExpand}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] text-white font-semibold text-sm shadow-lg shadow-emerald-950/40 border border-white/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
              <span>
                {isEn
                  ? `Expand Island (${currentLandState.nextExpansionCost?.gold ?? 8} Soul)`
                  : `Perluas Lahan (${currentLandState.nextExpansionCost?.gold ?? 8} Soul)`}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {currentLandState.isMaxExpansion && (
            <button
              onClick={handleIslandSwitcher}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 active:scale-[0.98] text-white font-semibold text-sm shadow-lg border border-white/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Compass className="w-4 h-4" />
              <span>{isEn ? "Explore Another Island" : "Buka / Pindah Pulau"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleFocusWithoutTree}
            className="w-full py-2.5 px-4 rounded-2xl bg-white/15 hover:bg-white/20 active:scale-[0.98] text-emerald-100 font-medium text-xs border border-white/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            <span>
              {isEn ? "Focus Without Planting (Earn Soul & XP)" : "Fokus Tanpa Pohon (Tetap Raih Soul & XP)"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}