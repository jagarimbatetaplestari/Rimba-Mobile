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
  Sparkles,
  Lock,
  Check,
  Compass,
  Calendar,
  Eye,
  Sliders,
  Flame,
} from "lucide-react";

export interface QuickBiomePickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickBiomePickerSheet({
  isOpen,
  onClose,
}: QuickBiomePickerSheetProps) {
  const { lang, t } = useTranslation();
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
    // Dispatch camera focus target smoothly towards the celestial island coordinate
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("rimba:camera_focus_target", {
          detail: {
            position: [11.5, 4.5, -9.0],
            distance: 12.0,
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
      <div className="relative w-full max-w-lg mx-auto bg-[#071e14]/95 text-white border-t border-emerald-500/30 rounded-t-[32px] p-5 pb-8 shadow-2xl backdrop-blur-2xl z-10 max-h-[85dvh] overflow-y-auto no-scrollbar space-y-4">
        {/* Drag Pill */}
        <div className="w-12 h-1.5 bg-emerald-700/50 rounded-full mx-auto -mt-1 mb-2" />

        {/* Header */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <Compass className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold tracking-tight text-white flex items-center gap-2">
                <span>{lang === "en" ? "Sanctuary Biomes" : "Bioma Suaka Rimba"}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  Lv. {currentLevel}
                </span>
              </h2>
              <p className="text-[12px] text-emerald-200/70 font-normal">
                {lang === "en"
                  ? "Select and switch between your unlocked island themes"
                  : "Ubah tema dan atmosfer pulau yang telah terbuka bebas"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              hapticLight();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white/80 active:scale-95 transition cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>

        {/* Auto Season Banner Toggle */}
        <div
          onClick={handleToggleAutoSeason}
          className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
            isAutoSeason
              ? "bg-emerald-900/50 border-emerald-400/40 shadow-inner"
              : "bg-white/5 border-white/10 hover:bg-white/10"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Calendar className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white flex items-center gap-1.5">
                <span>{lang === "en" ? "Sync Real-World Season" : "Ikuti Musim Nyata"}</span>
                {isAutoSeason && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 font-medium">
                    {lang === "en" ? "Active" : "Aktif"}
                  </span>
                )}
              </p>
              <p className="text-[11px] text-emerald-200/70">
                {lang === "en"
                  ? `Current season recommends: ${currentSeasonBiome.toUpperCase()}`
                  : `Musim global bulan ini: ${currentSeasonBiome === 'meadow' ? 'Padang Rumput' : currentSeasonBiome === 'autumn' ? 'Musim Gugur' : currentSeasonBiome === 'snow' ? 'Musim Salju' : 'Mata Air Teratai'}`}
              </p>
            </div>
          </div>

          <div
            className={`w-11 h-6 rounded-full p-0.5 transition-colors ${
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
                className={`relative flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-900/60 to-emerald-800/40 border-emerald-400/60 shadow-lg ring-1 ring-emerald-400/40"
                    : isUnlocked
                      ? "bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer active:scale-[0.99]"
                      : "bg-black/30 border-white/5 opacity-60"
                }`}
              >
                {/* Left Side Info */}
                <div className="flex items-center gap-3.5 min-w-0 pr-2">
                  <div
                    className="relative w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-md border border-white/20 overflow-hidden"
                    style={{ backgroundColor: biome.turfColor }}
                  >
                    <span className="relative z-10">{biome.icon}</span>
                    <div className="absolute inset-0 bg-black/15 pointer-events-none" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[14px] font-bold text-white truncate">
                        {lang === "en" ? biome.nameEn : biome.name}
                      </h3>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                          isUnlocked
                            ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-200"
                            : "bg-white/10 border-white/15 text-white/60"
                        }`}
                      >
                        {isUnlocked
                          ? lang === "en"
                            ? `Lv. ${biome.levelRequired}`
                            : `Lv. ${biome.levelRequired}`
                          : lang === "en"
                            ? `Requires Lv. ${biome.levelRequired}`
                            : `Butuh Lv. ${biome.levelRequired}`}
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
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-white font-semibold text-[11.5px] shadow-sm">
                      <Check className="w-3.5 h-3.5 stroke-[2.6]" />
                      <span>{lang === "en" ? "Active" : "Aktif"}</span>
                    </div>
                  ) : isUnlocked ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectBiome(biome.id);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/30 border border-white/25 text-white font-semibold text-[11.5px] transition-all cursor-pointer"
                    >
                      {lang === "en" ? "Apply" : "Terapkan"}
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/40 border border-white/10 text-white/50 text-[11px]">
                      <Lock className="w-3.5 h-3.5 stroke-[2]" />
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
              ? "bg-gradient-to-r from-amber-950/40 via-purple-950/40 to-emerald-950/40 border-amber-400/50 shadow-lg"
              : "bg-black/40 border-amber-500/20 opacity-70"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-700 border border-amber-300/40 flex items-center justify-center text-xl shadow-md shrink-0">
                ⛩️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-[14px] font-bold text-amber-200">
                    {lang === "en" ? "Celestial Archipelago" : "Kahyangan Awan Suaka"}
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-200 font-semibold">
                    Lv. {CELESTIAL_ISLAND_LEVEL_REQUIRED}
                  </span>
                </div>
                <p className="text-[11.5px] text-amber-100/70 mt-0.5">
                  {lang === "en"
                    ? "Floating satellite shrine with golden arch bridge & sacred bonsai"
                    : "Pulau satelit melayang dengan jembatan pelengkung & kuil bonsai"}
                </p>
              </div>
            </div>

            <div className="shrink-0">
              {isCelestialUnlocked ? (
                <button
                  type="button"
                  onClick={handleFocusCelestialIsland}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/90 hover:bg-amber-400 text-stone-950 font-bold text-[11.5px] shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 stroke-[2.4]" />
                  <span>{lang === "en" ? "Visit" : "Kunjungi"}</span>
                </button>
              ) : (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/50 border border-amber-400/20 text-amber-300/60 text-[11px]">
                  <Lock className="w-3.5 h-3.5 stroke-[2]" />
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
