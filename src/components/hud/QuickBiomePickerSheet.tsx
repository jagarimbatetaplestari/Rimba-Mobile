"use client";

import React, { useMemo } from "react";
import { useGameStore } from "@/lib/game/useGameStore";
import { BIOME_CATALOG, CELESTIAL_ISLAND_LEVEL_REQUIRED, detectRealWorldSeasonBiome } from "@/lib/game/config";
import { getLevelFromXp } from "@/lib/game/levelRules";
import { soundManager } from "@/lib/audio/sounds";
import { hapticLight, hapticSuccess, hapticWarning } from "@/lib/mobile/nativeBridge";
import { useTranslation } from "@/lib/i18n/translations";
import { BiomeType } from "@/types/game";
import {
  X,
  Lock,
  Check,
  Compass,
  Calendar,
  Eye,
} from "lucide-react";

export interface QuickBiomePickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickBiomePickerSheet({
  isOpen,
  onClose,
}: QuickBiomePickerSheetProps) {
  const { lang } = useTranslation();
  const activeBiome = useGameStore((state) => state.activeBiome);
  const isAutoSeason = useGameStore((state) => state.isAutoSeason);
  const setActiveBiome = useGameStore((state) => state.setActiveBiome);
  const setAutoSeason = useGameStore((state) => state.setAutoSeason);
  const isBiomeUnlocked = useGameStore((state) => state.isBiomeUnlocked);
  const devFastMode = useGameStore((state) => state.devFastMode);
  const profile = useGameStore((state) => state.saveData.profile);

  const currentLevel = useMemo(() => getLevelFromXp(profile?.xp || 0), [profile?.xp]);
  const currentSeasonBiome = useMemo(() => detectRealWorldSeasonBiome(), []);
  const isCelestialUnlocked = currentLevel >= CELESTIAL_ISLAND_LEVEL_REQUIRED || devFastMode;

  if (!isOpen) return null;

  const handleSelectBiome = (biome: BiomeType) => {
    if (!isBiomeUnlocked(biome)) {
      soundManager.playError();
      hapticWarning();
      return;
    }
    soundManager.playComplete();
    hapticSuccess();
    setActiveBiome(biome, true);
  };

  const handleToggleAutoSeason = () => {
    soundManager.playPop();
    hapticLight();
    setAutoSeason(!isAutoSeason);
  };

  const handleFocusCelestialIsland = () => {
    soundManager.playPop();
    hapticLight();
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("rimba:camera_focus_target", {
          detail: {
            position: [7.5, 0.55, -0.4],
            distance: 7.0,
          },
        })
      );
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex flex-col justify-end select-none animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      {/* Dimmed backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => {
          hapticLight();
          onClose();
        }}
      />

      {/* Sheet Container */}
      <div className="relative w-full max-w-lg md:max-w-xl mx-auto bg-[#071e14]/95 text-white border-t border-emerald-500/30 rounded-t-[32px] p-5 pb-8 shadow-2xl backdrop-blur-2xl z-10 max-h-[85dvh] overflow-y-auto no-scrollbar space-y-4">
        {/* Drag Pill */}
        <div className="w-12 h-1.5 bg-emerald-700/50 rounded-full mx-auto -mt-1 mb-2" />

        {/* Header */}
        <div className="flex items-center justify-between gap-2 pb-1">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
              <Compass className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-[18px] font-bold tracking-tight text-white truncate">
                  {lang === "en" ? "Sanctuary Biomes" : "Bioma Suaka Rimba"}
                </h2>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold whitespace-nowrap shrink-0">
                  Lv. {currentLevel}
                </span>
              </div>
              <p className="text-[12px] text-emerald-200/70 font-normal truncate">
                {lang === "en"
                  ? "Switch between your unlocked island themes"
                  : "Ubah tema dan atmosfer pulau yang telah terbuka"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              hapticLight();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white/80 active:scale-95 transition cursor-pointer shrink-0"
            aria-label="Tutup"
          >
            <X className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>

        {/* Auto Season Banner Toggle */}
        <div
          onClick={handleToggleAutoSeason}
          className={`flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
            isAutoSeason
              ? "bg-emerald-900/50 border-emerald-400/40 shadow-inner"
              : "bg-white/5 border-white/10 hover:bg-white/10"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
              <Calendar className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-[13px] font-semibold text-white truncate">
                  {lang === "en" ? "Sync Real-World Season" : "Ikuti Musim Nyata"}
                </p>
                {isAutoSeason && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 font-medium whitespace-nowrap shrink-0">
                    {lang === "en" ? "Active" : "Aktif"}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-emerald-200/70 truncate">
                {lang === "en"
                  ? `Recommended: ${currentSeasonBiome.toUpperCase()}`
                  : `Musim bulan ini: ${currentSeasonBiome === "meadow" ? "Padang Rumput" : currentSeasonBiome === "autumn" ? "Musim Gugur" : currentSeasonBiome === "snow" ? "Salju Zen" : "Mata Air Teratai"}`}
              </p>
            </div>
          </div>

          <div
            className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 ${
              isAutoSeason ? "bg-emerald-500" : "bg-white/20"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                isAutoSeason ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </div>
        </div>

        {/* List of Biomes */}
        <div className="space-y-2.5">
          {BIOME_CATALOG.map((biome) => {
            const isUnlocked = isBiomeUnlocked(biome.id);
            const isActive = activeBiome === biome.id;

            return (
              <div
                key={biome.id}
                onClick={() => {
                  if (isUnlocked && !isActive) handleSelectBiome(biome.id);
                }}
                className={`relative flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-900/60 to-emerald-800/40 border-emerald-400/60 shadow-lg ring-1 ring-emerald-400/40"
                    : isUnlocked
                      ? "bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer active:scale-[0.99]"
                      : "bg-black/30 border-white/5 opacity-60"
                }`}
              >
                {/* Left Side Info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="relative w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-md border border-white/20 overflow-hidden"
                    style={{ backgroundColor: biome.turfColor }}
                  >
                    <span className="relative z-10">{biome.icon}</span>
                    <div className="absolute inset-0 bg-black/15 pointer-events-none" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[14px] font-bold text-white truncate">
                        {lang === "en" ? biome.nameEn : biome.name}
                      </h3>
                      <span
                        className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${
                          isUnlocked
                            ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-200"
                            : "bg-white/10 border-white/15 text-white/60"
                        }`}
                      >
                        Lv. {biome.levelRequired}
                      </span>
                    </div>

                    <p className="text-[11.5px] text-emerald-100/70 truncate mt-0.5">
                      {lang === "en" ? biome.descriptionEn : biome.description}
                    </p>
                  </div>
                </div>

                {/* Right Side Action */}
                <div className="shrink-0 flex items-center">
                  {isActive ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-white font-semibold text-[11.5px] shadow-sm whitespace-nowrap shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[2.6] shrink-0" />
                      <span>{lang === "en" ? "Active" : "Aktif"}</span>
                    </div>
                  ) : isUnlocked ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectBiome(biome.id);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/30 border border-white/25 text-white font-semibold text-[11.5px] transition-all cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {lang === "en" ? "Apply" : "Terapkan"}
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/40 border border-white/10 text-white/60 text-[11px] whitespace-nowrap shrink-0">
                      <Lock className="w-3 h-3 stroke-[2] shrink-0" />
                      <span>Lv. {biome.levelRequired}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Milestone Card: Level 100 Floating Celestial Island */}
        <div
          className={`relative p-3.5 rounded-2xl border transition-all ${
            isCelestialUnlocked
              ? "bg-gradient-to-r from-emerald-950/60 via-teal-950/50 to-emerald-900/50 border-emerald-400/50 shadow-lg"
              : "bg-black/40 border-white/10 opacity-75"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 border border-emerald-300/40 flex items-center justify-center text-xl shadow-md shrink-0">
                ⛩️
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-[14px] font-bold text-emerald-100 truncate">
                    {lang === "en" ? "Celestial Archipelago" : "Kahyangan Awan Suaka"}
                  </h4>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 font-semibold whitespace-nowrap shrink-0">
                    Lv. {CELESTIAL_ISLAND_LEVEL_REQUIRED}
                  </span>
                </div>
                <p className="text-[11.5px] text-emerald-100/70 truncate mt-0.5">
                  {lang === "en"
                    ? "Floating shrine with arch bridge & sacred bonsai"
                    : "Pulau satelit melayang dengan jembatan & kuil bonsai"}
                </p>
              </div>
            </div>

            <div className="shrink-0">
              {isCelestialUnlocked ? (
                <button
                  type="button"
                  onClick={handleFocusCelestialIsland}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-[11.5px] shadow-sm transition active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Eye className="w-3.5 h-3.5 stroke-[2.4] shrink-0" />
                  <span>{lang === "en" ? "Visit" : "Kunjungi"}</span>
                </button>
              ) : (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/50 border border-white/15 text-white/60 text-[11px] whitespace-nowrap shrink-0">
                  <Lock className="w-3 h-3 stroke-[2] shrink-0" />
                  <span>Lv. {CELESTIAL_ISLAND_LEVEL_REQUIRED}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
