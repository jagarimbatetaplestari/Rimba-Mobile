"use client";

import React, { useEffect, useState, useMemo } from "react";
import { BookOpen, Clock3, Flame, Lock, Play, X } from "lucide-react";

import { soundManager } from "@/lib/audio/sounds";
import { hapticLight, hapticMedium } from "@/lib/mobile/nativeBridge";
import { FOCUS_TAGS, TREE_SPECIES_CONFIG } from "@/lib/game/config";
import { getLevelFromXp } from "@/lib/game/levelRules";
import { useGameStore } from "@/lib/game/useGameStore";
import { TreeSpecies } from "@/types/game";
import { TagLineIcon } from "@/components/common/TagLineIcon";

export interface MobileBottomCockpitProps {
  tagLabel: string;
  tagColor: string;
  speciesIcon: string;
  selectedMinutes: number;
  isNight?: boolean;
  claimableCount?: number;
  onSelectTag?: (tag: string) => void;
  onSelectSpecies?: (species: string) => void;
  onSelectMinutes?: (minutes: number) => void;
  onToggleStrictMode?: () => void;
  onStartFocus: () => void;
  onOpenWorkshop?: () => void;
  onOpenJournal?: () => void;
  onOpenTagModal?: () => void;
  onOpenDurationModal?: () => void;
}

const TIMER_PRESETS = [15, 25, 45, 60, 0];

type FlyoutType = "category" | "timer" | null;
type CategoryTab = "tags" | "species";

export function MobileBottomCockpit({
  tagLabel,
  tagColor,
  speciesIcon,
  selectedMinutes,
  isNight: isNightProp = false,
  claimableCount = 0,
  onSelectTag,
  onSelectSpecies,
  onSelectMinutes,
  onToggleStrictMode,
  onStartFocus,
  onOpenJournal,
}: MobileBottomCockpitProps) {
  const [activeFlyout, setActiveFlyout] = useState<FlyoutType>(null);
  const [categoryTab, setCategoryTab] = useState<CategoryTab>("tags");

  /*
   * ---------------------------------------------------------
   * STORE
   * ---------------------------------------------------------
   */

  const focusSetup = useGameStore((state) => state.focusSetup);
  const setFocusSetup = useGameStore((state) => state.setFocusSetup);
  const profile = useGameStore((state) => state.saveData.profile);
  const customTags = useGameStore((state) => state.saveData.custom_tags) || [];
  const storeTimeOfDay = useGameStore((state) => state.timeOfDay);

  const isNight = isNightProp || storeTimeOfDay === "night";

  const playerLevel = getLevelFromXp(profile.xp);
  const isStrictMode = focusSetup?.strictMode ?? false;
  const currentSpeciesId = focusSetup?.species || "oak";

  /*
   * ---------------------------------------------------------
   * DATA
   * ---------------------------------------------------------
   */

  const allTags = useMemo(() => {
    return [
      ...FOCUS_TAGS,
      ...customTags.filter(
        (custom) => !FOCUS_TAGS.some((base) => base.id === custom.id),
      ),
    ];
  }, [customTags]);

  const activeTag = useMemo(() => {
    return (
      allTags.find((t) => t.label === tagLabel || t.id === tagLabel) ||
      allTags[0]
    );
  }, [allTags, tagLabel]);

  const activeSpecies = useMemo(() => {
    return (
      TREE_SPECIES_CONFIG.find((s) => s.id === currentSpeciesId) ||
      TREE_SPECIES_CONFIG[0]
    );
  }, [currentSpeciesId]);

  /*
   * ---------------------------------------------------------
   * KEYBOARD LISTENER
   * ---------------------------------------------------------
   */

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveFlyout(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * HANDLERS
   * ---------------------------------------------------------
   */

  const closeFlyout = () => {
    soundManager.playPop();
    hapticLight();
    setActiveFlyout(null);
  };

  const toggleFlyout = (type: Exclude<FlyoutType, null>) => {
    soundManager.playPop();
    hapticLight();
    setActiveFlyout((current) => (current === type ? null : type));
  };

  const handleTagSelect = (tagId: string) => {
    soundManager.playPop();
    hapticLight();

    if (onSelectTag) {
      onSelectTag(tagId);
    } else {
      setFocusSetup({ tag: tagId });
    }
  };

  const handleSpeciesSelect = (speciesId: string) => {
    const target = TREE_SPECIES_CONFIG.find((s) => s.id === speciesId);
    if (!target || playerLevel < target.levelRequired) return;

    soundManager.playPop();
    hapticLight();

    if (onSelectSpecies) {
      onSelectSpecies(speciesId);
    } else {
      setFocusSetup({ species: speciesId as TreeSpecies });
    }
  };

  const handleMinutesSelect = (minutes: number) => {
    soundManager.playPop();
    hapticLight();

    if (onSelectMinutes) {
      onSelectMinutes(minutes);
    } else {
      setFocusSetup({ minutes });
    }
  };

  const handleStrictToggle = () => {
    soundManager.playPop();
    hapticLight();

    if (onToggleStrictMode) {
      onToggleStrictMode();
    } else {
      setFocusSetup({ strictMode: !isStrictMode });
    }
  };

  const isExpanded = activeFlyout !== null;

  /*
   * SMOOTH & CLEAR LIQUID GLASS MATERIAL
   */
  const glassCapsuleStyle: React.CSSProperties = {
    background: isNight
      ? "linear-gradient(180deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.04) 40%, rgba(14, 32, 22, 0.45) 100%)"
      : "linear-gradient(180deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0.1) 45%, rgba(20, 52, 34, 0.22) 100%)",
    backdropFilter: "blur(20px) saturate(150%)",
    WebkitBackdropFilter: "blur(20px) saturate(150%)",
    border: "1px solid rgba(255, 255, 255, 0.26)",
    boxShadow: isNight
      ? "0 10px 24px -4px rgba(0, 0, 0, 0.35), inset 0 1px 0 0 rgba(255, 255, 255, 0.35)"
      : "0 10px 26px -6px rgba(10, 30, 20, 0.18), inset 0 1px 0 0 rgba(255, 255, 255, 0.45)",
  };

  const chipGlassStyle: React.CSSProperties = {
    background: isNight
      ? "linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, rgba(12, 28, 18, 0.35) 100%)"
      : "linear-gradient(180deg, rgba(255, 255, 255, 0.26) 0%, rgba(20, 50, 32, 0.18) 100%)",
    backdropFilter: "blur(16px) saturate(145%)",
    WebkitBackdropFilter: "blur(16px) saturate(145%)",
    border: "1px solid rgba(255, 255, 255, 0.25)",
    boxShadow:
      "0 4px 14px rgba(0, 0, 0, 0.08), inset 0 1px 0 0 rgba(255, 255, 255, 0.35)",
  };

  const modalGlassStyle: React.CSSProperties = {
    background: isNight
      ? "linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, rgba(15, 34, 24, 0.68) 35%, rgba(8, 20, 14, 0.82) 100%)"
      : "linear-gradient(180deg, rgba(255, 255, 255, 0.35) 0%, rgba(240, 248, 243, 0.18) 22%, rgba(20, 52, 35, 0.46) 100%)",
    backdropFilter: "blur(24px) saturate(155%)",
    WebkitBackdropFilter: "blur(24px) saturate(155%)",
    border: "1px solid rgba(255, 255, 255, 0.28)",
    boxShadow:
      "0 20px 44px -8px rgba(0, 0, 0, 0.22), inset 0 1px 0 0 rgba(255, 255, 255, 0.45)",
  };

  return (
    <div
      className="pointer-events-none select-none"
      style={{
        fontFamily:
          "var(--font-urbanist), 'Urbanist', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* OVERLAY BERSIH TANPA BLUR */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-40 pointer-events-auto bg-black/15 transition-opacity duration-200"
          onClick={closeFlyout}
        />
      )}

      {/* ====================================================
          FLOATING DOCK LAYER
          ==================================================== */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none"
        style={{
          paddingBottom:
            "max(calc(env(safe-area-inset-bottom, 0px) + 14px), 20px)",
        }}
      >
        <div className="w-full max-w-[390px] flex items-end justify-center pointer-events-auto">
          {!isExpanded ? (
            /* ====================================================
                IDLE COCKPIT: 3 LIQUID GLASS PEBBLES + GLASS CHIP
                ==================================================== */
            <div className="flex flex-col items-center w-full">
              {/* CHIP INDIKATOR KATEGORI & DURASI */}
              <button
                type="button"
                onClick={() => toggleFlyout("category")}
                style={chipGlassStyle}
                className="mb-2.5 px-4 py-1 rounded-full text-[11.5px] font-medium tracking-tight flex items-center gap-1.5 transition-colors cursor-pointer relative overflow-hidden"
                title="Kategori & Durasi Terpilih (Ketuk untuk ubah)"
              >
                <div className="absolute inset-x-2 top-0 h-[45%] bg-gradient-to-b from-white/25 to-transparent rounded-t-full pointer-events-none" />
                <span className="font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
                  {tagLabel}
                </span>
                <span className="text-white/40 font-normal">|</span>
                <span className="font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
                  {selectedMinutes === 0 ? "∞" : `${selectedMinutes} Menit`}
                </span>
              </button>

              {/* 3 FLOATING CAPSULES */}
              <div className="flex items-center justify-between gap-3 w-full">
                {/* 1. KAPSUL KIRI: KATEGORI */}
                <button
                  type="button"
                  onClick={() => toggleFlyout("category")}
                  style={glassCapsuleStyle}
                  className="w-[58px] h-[58px] rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 relative overflow-hidden"
                  title="Pilih Kategori Fokus"
                  aria-label="Pilih Kategori Fokus"
                >
                  <div className="absolute inset-x-2 top-0 h-[45%] bg-gradient-to-b from-white/25 to-transparent rounded-t-full pointer-events-none" />
                  <TagLineIcon
                    name={activeTag.icon}
                    className="w-5 h-5 text-white stroke-[2.2] drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)] relative z-10"
                  />
                </button>

                {/* 2. KAPSUL TENGAH: TOMBOL MULAI FOKUS */}
                <button
                  type="button"
                  onClick={() => {
                    hapticMedium();
                    closeFlyout();
                    onStartFocus();
                  }}
                  style={glassCapsuleStyle}
                  className="flex-1 h-[58px] px-6 rounded-full flex items-center justify-center gap-2 transition-colors cursor-pointer relative overflow-hidden"
                  title={
                    selectedMinutes === 0
                      ? "Mulai sesi fokus Bebas (∞)"
                      : `Mulai sesi fokus ${selectedMinutes} menit`
                  }
                  aria-label="Mulai Fokus"
                >
                  <div className="absolute inset-x-4 top-0 h-[45%] bg-gradient-to-b from-white/25 to-transparent rounded-t-full pointer-events-none" />
                  <Play className="w-4 h-4 fill-white text-white shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)] relative z-10" />
                  <span className="text-[15.5px] font-semibold tracking-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)] relative z-10">
                    Mulai Fokus
                  </span>
                </button>

                {/* 3. KAPSUL KANAN: TIMER */}
                <button
                  type="button"
                  onClick={() => toggleFlyout("timer")}
                  style={glassCapsuleStyle}
                  className="w-[58px] h-[58px] rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 relative overflow-hidden"
                  title="Atur Target Durasi Fokus"
                  aria-label="Atur Durasi Fokus"
                >
                  <div className="absolute inset-x-2 top-0 h-[45%] bg-gradient-to-b from-white/25 to-transparent rounded-t-full pointer-events-none" />
                  <Clock3 className="w-5 h-5 text-white stroke-[2.2] drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)] relative z-10" />
                </button>
              </div>
            </div>
          ) : (
            /* ====================================================
                EXPANDED FLYOUT SECTION (CLEAR GLASS SHEET)
                ==================================================== */
            <div
              style={modalGlassStyle}
              className="relative w-full overflow-hidden rounded-[34px] p-4 pb-3 transition-opacity duration-200 flex flex-col justify-between"
            >
              {/* Top ambient highlight */}
              <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/15 to-transparent pointer-events-none rounded-t-[34px]" />

              <div className="flex flex-col animate-in fade-in duration-200 relative z-10">
                {/* Drag Handle Bar */}
                <div
                  className="mx-auto w-10 h-1 rounded-full bg-white/40 mb-3 cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.15)]"
                  onClick={closeFlyout}
                />

                {/* ----------------------------------------------
                    TAB 1: KATEGORI & BIBIT POHON
                    ---------------------------------------------- */}
                {activeFlyout === "category" && (
                  <div className="space-y-3 pb-1">
                    {/* Header: Segmented Glass Switch */}
                    <div className="flex items-center justify-between gap-2 px-0.5">
                      <div className="flex-1 flex rounded-full p-1 bg-black/15 border border-white/15">
                        <button
                          type="button"
                          onClick={() => {
                            soundManager.playPop();
                            hapticLight();
                            setCategoryTab("tags");
                          }}
                          className={`flex-1 rounded-full py-1.5 text-[12px] font-semibold tracking-tight transition-colors cursor-pointer ${
                            categoryTab === "tags"
                              ? "bg-white text-[#0b2719] shadow-[0_2px_8px_rgba(0,0,0,0.18)] font-bold"
                              : "text-white/75 hover:text-white"
                          }`}
                        >
                          Kategori Sesi
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            soundManager.playPop();
                            hapticLight();
                            setCategoryTab("species");
                          }}
                          className={`flex-1 rounded-full py-1.5 text-[12px] font-semibold tracking-tight transition-colors cursor-pointer ${
                            categoryTab === "species"
                              ? "bg-white text-[#0b2719] shadow-[0_2px_8px_rgba(0,0,0,0.18)] font-bold"
                              : "text-white/75 hover:text-white"
                          }`}
                        >
                          Bibit Pohon
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={closeFlyout}
                        className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0 shadow-xs"
                      >
                        <X className="w-3.5 h-3.5 stroke-[2.2]" />
                      </button>
                    </div>

                    {/* Bento Grid: Kategori */}
                    {categoryTab === "tags" && (
                      <div className="grid grid-cols-3 gap-2 px-0.5 max-h-[160px] overflow-y-auto no-scrollbar py-0.5">
                        {allTags.map((tag) => {
                          const isActive = tag.id === activeTag.id;
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => handleTagSelect(tag.id)}
                              className={`
                                flex items-center gap-2 p-2.5 rounded-2xl border transition-all cursor-pointer text-left
                                ${
                                  isActive
                                    ? "bg-white text-[#0b2719] border-white shadow-[0_4px_14px_rgba(0,0,0,0.18)] font-semibold ring-2 ring-white/60"
                                    : "bg-white/[0.08] hover:bg-white/[0.14] text-white/90 border-white/15 font-medium"
                                }
                              `}
                            >
                              <div
                                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                                  isActive
                                    ? "bg-[#0b2719]/10 text-[#0b2719]"
                                    : "bg-black/15 text-white"
                                }`}
                              >
                                <TagLineIcon
                                  name={tag.icon}
                                  className="w-3.5 h-3.5 stroke-[2.2]"
                                />
                              </div>
                              <span
                                className={`text-[12px] truncate flex-1 tracking-tight ${
                                  isActive
                                    ? "font-bold text-[#0b2719]"
                                    : "text-white/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]"
                                }`}
                              >
                                {tag.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Bento Grid: Bibit Pohon */}
                    {categoryTab === "species" && (
                      <div className="grid grid-cols-3 gap-2 px-0.5 max-h-[160px] overflow-y-auto no-scrollbar py-0.5">
                        {TREE_SPECIES_CONFIG.map((sp) => {
                          const isActive = sp.id === activeSpecies.id;
                          const unlocked = playerLevel >= sp.levelRequired;
                          return (
                            <button
                              key={sp.id}
                              type="button"
                              disabled={!unlocked}
                              onClick={() => handleSpeciesSelect(sp.id)}
                              className={`
                                relative flex flex-col items-center justify-center h-[74px] p-1.5 rounded-2xl border transition-all text-center
                                ${
                                  !unlocked
                                    ? "opacity-35 cursor-not-allowed border-white/10 bg-black/15"
                                    : "cursor-pointer"
                                }
                                ${
                                  isActive
                                    ? "bg-white text-[#0b2719] border-white shadow-[0_4px_16px_rgba(0,0,0,0.2)] font-semibold ring-2 ring-white/60"
                                    : "bg-white/[0.08] hover:bg-white/[0.14] text-white border-white/15 font-medium"
                                }
                              `}
                            >
                              <span className="text-[20px] mb-1 leading-none drop-shadow-xs">
                                {sp.icon}
                              </span>
                              <span
                                className={`text-[10.5px] leading-tight line-clamp-2 px-0.5 ${
                                  isActive
                                    ? "font-bold text-[#0b2719]"
                                    : "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]"
                                }`}
                              >
                                {sp.name}
                              </span>

                              {!unlocked && (
                                <span className="absolute top-1.5 right-1.5 flex items-center text-[8.5px] font-semibold text-amber-100 bg-amber-950/60 border border-amber-400/30 px-1 py-0.2 rounded-full">
                                  <Lock className="w-2 h-2 mr-0.5 stroke-[2.5]" />
                                  L{sp.levelRequired}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ----------------------------------------------
                    TAB 2: DURASI FOKUS
                    ---------------------------------------------- */}
                {activeFlyout === "timer" && (
                  <div className="space-y-3 pb-1 text-center">
                    {/* Header + Close Button */}
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[12px] font-medium text-white/80 tracking-tight">
                        Target Durasi
                      </span>
                      <button
                        type="button"
                        onClick={closeFlyout}
                        className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0 shadow-xs"
                      >
                        <X className="w-3.5 h-3.5 stroke-[2.2]" />
                      </button>
                    </div>

                    {/* Big Clean Time Display */}
                    <div className="py-0.5">
                      <div className="text-[44px] font-semibold tracking-tight text-white tabular-nums leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]">
                        {selectedMinutes === 0
                          ? "∞"
                          : `${selectedMinutes < 10 ? "0" : ""}${selectedMinutes}:00`}
                      </div>
                    </div>

                    {/* Quick Preset Pills */}
                    <div className="flex items-center justify-between gap-1.5 px-0.5">
                      {TIMER_PRESETS.map((m) => {
                        const isActive = selectedMinutes === m;
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() => handleMinutesSelect(m)}
                            className={`
                              flex-1 py-1.5 rounded-full text-[12px] transition-all cursor-pointer border
                              ${
                                isActive
                                  ? "bg-white text-[#0b2719] border-white shadow-[0_3px_10px_rgba(0,0,0,0.2)] font-bold ring-2 ring-white/60"
                                  : "bg-white/[0.08] hover:bg-white/[0.16] text-white/85 border-white/15 font-semibold"
                              }
                            `}
                          >
                            {m === 0 ? "∞" : `${m}m`}
                          </button>
                        );
                      })}
                    </div>

                    {/* Minimal Slider */}
                    <div className="relative py-1 select-none touch-none px-1">
                      <input
                        type="range"
                        min={0}
                        max={120}
                        step={5}
                        value={selectedMinutes}
                        onChange={(e) =>
                          handleMinutesSelect(Number(e.target.value))
                        }
                        className="w-full h-1.5 bg-white/25 rounded-full appearance-none cursor-pointer accent-white"
                        aria-label="Atur durasi menit"
                      />
                    </div>

                    {/* Inline Mode Ketat Toggle */}
                    <button
                      type="button"
                      onClick={handleStrictToggle}
                      className="flex w-full items-center justify-between rounded-2xl border border-white/18 bg-white/10 hover:bg-white/15 px-3.5 py-2 transition-colors cursor-pointer shadow-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors ${
                            isStrictMode
                              ? "bg-amber-400/25 text-amber-300 border border-amber-400/35"
                              : "bg-white/10 text-white/50 border border-white/15"
                          }`}
                        >
                          <Flame
                            className={`w-3.5 h-3.5 ${isStrictMode ? "fill-current" : ""}`}
                          />
                        </div>
                        <div className="text-left">
                          <p className="text-[12.5px] font-semibold text-white leading-tight drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]">
                            Mode Ketat
                          </p>
                          <p className="text-[10.5px] text-white/70">
                            {isStrictMode
                              ? "Aktif · Lindungi fokus"
                              : "Nonaktif"}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`relative h-5 w-9 rounded-full p-0.5 transition-colors duration-200 border border-white/20 ${
                          isStrictMode ? "bg-emerald-500" : "bg-black/25"
                        }`}
                      >
                        <div
                          className={`h-4 w-4 rounded-full bg-white shadow-xs transition-transform duration-200 ${
                            isStrictMode ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
