"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Clock3, Flame, Lock, Play, X } from "lucide-react";

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
  onSelectTag?: (tag: string) => void;
  onSelectSpecies?: (species: string) => void;
  onSelectMinutes?: (minutes: number) => void;
  onToggleStrictMode?: () => void;
  onStartFocus: () => void;
  onOpenWorkshop?: () => void;
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
  onSelectTag,
  onSelectSpecies,
  onSelectMinutes,
  onToggleStrictMode,
  onStartFocus,
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

  return (
    <div
      className="pointer-events-none select-none"
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', var(--font-geist-sans), sans-serif",
      }}
    >
      {/* SOFT AMBIENT BACKDROP */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-40 pointer-events-auto bg-[#143525]/12 transition-opacity duration-300"
          onClick={closeFlyout}
        />
      )}

      {/* ====================================================
          MORPHING LIQUID ISLAND CONTAINER
          ==================================================== */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none"
        style={{
          paddingBottom:
            "max(calc(env(safe-area-inset-bottom, 0px) + 14px), 20px)",
        }}
      >
        <div className="w-full max-w-[390px] flex items-end justify-center pointer-events-auto">
          <div
            className={`
              relative w-full overflow-hidden border border-white/90 bg-[#EEF4F0]/95 backdrop-blur-3xl backdrop-saturate-[180%]
              shadow-[0_20px_50px_rgba(20,53,37,0.12),inset_0_1.5px_2px_rgba(255,255,255,0.95)] text-[#143525]
              transition-all duration-300 ease-out flex flex-col justify-between
              ${isExpanded ? "rounded-[38px] p-3.5 pb-2.5 shadow-2xl" : "h-[66px] rounded-full px-2 py-0"}
            `}
          >
            {/* ================================================
                EXPANDED CONTENT SECTION
                ================================================ */}
            {isExpanded && (
              <div className="flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Drag Handle Bar */}
                <div
                  className="mx-auto w-10 h-1.5 rounded-full bg-[#143525]/15 mb-2.5 cursor-pointer active:scale-95 transition-transform"
                  onClick={closeFlyout}
                />

                {/* ----------------------------------------------
                    TAB 1: KATEGORI & BIBIT POHON
                    ---------------------------------------------- */}
                {activeFlyout === "category" && (
                  <div className="space-y-3 pb-2">
                    {/* Header: Segmented Pill Switch */}
                    <div className="flex items-center justify-between gap-2 px-1">
                      <div className="flex-1 flex rounded-full p-1 bg-[#143525]/8 border border-white/60">
                        <button
                          type="button"
                          onClick={() => {
                            soundManager.playPop();
                            hapticLight();
                            setCategoryTab("tags");
                          }}
                          className={`flex-1 rounded-full py-1.5 text-[12px] font-semibold tracking-tight transition-all cursor-pointer ${
                            categoryTab === "tags"
                              ? "bg-white text-[#143525] shadow-2xs"
                              : "text-[#456b57] hover:text-[#143525]"
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
                          className={`flex-1 rounded-full py-1.5 text-[12px] font-semibold tracking-tight transition-all cursor-pointer ${
                            categoryTab === "species"
                              ? "bg-white text-[#143525] shadow-2xs"
                              : "text-[#456b57] hover:text-[#143525]"
                          }`}
                        >
                          Bibit Pohon
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={closeFlyout}
                        className="w-7 h-7 rounded-full bg-white/80 border border-white/90 flex items-center justify-center text-[#143525] shadow-2xs active:scale-90 transition-transform cursor-pointer shrink-0"
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
                                flex items-center gap-2 p-2.5 rounded-2xl border transition-all active:scale-95 cursor-pointer text-left
                                ${
                                  isActive
                                    ? "bg-gradient-to-b from-[#2a6845] to-[#1e5235] text-white border-white/25 shadow-xs font-semibold"
                                    : "bg-white/75 text-[#143525] border-white/80 hover:bg-white font-medium shadow-2xs"
                                }
                              `}
                            >
                              <div
                                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                                  isActive
                                    ? "bg-white/20 text-white"
                                    : "bg-[#143525]/8 text-[#143525]"
                                }`}
                              >
                                <TagLineIcon
                                  name={tag.icon}
                                  className="w-3.5 h-3.5 stroke-[2]"
                                />
                              </div>
                              <span className="text-[12px] font-semibold truncate flex-1 tracking-tight">
                                {tag.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Bento Grid: Bibit Pohon (Format 2-Baris Rapi Tanpa Truncate) */}
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
                                    ? "opacity-40 cursor-not-allowed border-transparent bg-black/5"
                                    : "cursor-pointer active:scale-95"
                                }
                                ${
                                  isActive
                                    ? "bg-gradient-to-b from-[#2a6845] to-[#1e5235] text-white border-white/25 shadow-xs"
                                    : "bg-white/75 text-[#143525] border-white/80 hover:bg-white shadow-2xs"
                                }
                              `}
                            >
                              <span className="text-[20px] mb-1 leading-none drop-shadow-2xs">
                                {sp.icon}
                              </span>
                              <span
                                className={`text-[10.5px] leading-tight font-semibold line-clamp-2 px-0.5 ${
                                  isActive ? "text-white" : "text-[#143525]"
                                }`}
                              >
                                {sp.name}
                              </span>

                              {!unlocked && (
                                <span className="absolute top-1.5 right-1.5 flex items-center text-[8.5px] font-semibold text-[#69572c] bg-[#d6cbaf]/70 border border-[#c4b693]/40 px-1 py-0.2 rounded-full">
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
                    TAB 2: DURASI FOKUS (APPLE MINIMALIST STYLE)
                    ---------------------------------------------- */}
                {activeFlyout === "timer" && (
                  <div className="space-y-3 pb-2 text-center">
                    {/* Header + Close Button */}
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[12px] font-semibold text-[#456b57] tracking-tight">
                        Target Durasi
                      </span>
                      <button
                        type="button"
                        onClick={closeFlyout}
                        className="w-7 h-7 rounded-full bg-white/80 border border-white/90 flex items-center justify-center text-[#143525] shadow-2xs active:scale-90 transition-transform cursor-pointer shrink-0"
                      >
                        <X className="w-3.5 h-3.5 stroke-[2.2]" />
                      </button>
                    </div>

                    {/* Big Bold Clean Time Display */}
                    <div className="py-0.5">
                      <div className="text-[42px] font-semibold tracking-tight text-[#143525] tabular-nums  leading-none">
                        {selectedMinutes === 0
                          ? "Bebas"
                          : `${selectedMinutes < 10 ? "0" : ""}${selectedMinutes}:00`}
                      </div>
                    </div>

                    {/* Apple Quick Preset Pills */}
                    <div className="flex items-center justify-between gap-1.5 px-0.5">
                      {TIMER_PRESETS.map((m) => {
                        const isActive = selectedMinutes === m;
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() => handleMinutesSelect(m)}
                            className={`
                              flex-1 py-1.5 rounded-full text-[12px] font-semibold transition-all active:scale-95 cursor-pointer border
                              ${
                                isActive
                                  ? "bg-gradient-to-b from-[#2a6845] to-[#1e5235] text-white border-white/20 shadow-xs"
                                  : "bg-white/75 text-[#143525] border-white/85 hover:bg-white shadow-2xs"
                              }
                            `}
                          >
                            {m === 0 ? "∞" : `${m}m`}
                          </button>
                        );
                      })}
                    </div>

                    {/* Minimal Fine-Tune Apple Slider */}
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
                        className="w-full h-1.5 bg-[#143525]/12 rounded-full appearance-none cursor-pointer accent-[#1e5235]"
                        aria-label="Atur durasi menit"
                      />
                    </div>

                    {/* Inline Mode Ketat Toggle (Apple Switch) */}
                    <button
                      type="button"
                      onClick={handleStrictToggle}
                      className="flex w-full items-center justify-between rounded-2xl border border-white/80 bg-white/70 hover:bg-white/90 px-3.5 py-2 transition-all active:scale-[0.98] cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors ${
                            isStrictMode
                              ? "bg-amber-100/90 text-amber-700"
                              : "bg-black/5 text-[#143525]/45"
                          }`}
                        >
                          <Flame
                            className={`w-3.5 h-3.5 ${isStrictMode ? "fill-current" : ""}`}
                          />
                        </div>
                        <div className="text-left">
                          <p className="text-[12.5px] font-semibold text-[#143525] leading-tight">
                            Mode Ketat
                          </p>
                          <p className="text-[10.5px] text-[#456b57]">
                            {isStrictMode
                              ? "Aktif · Lindungi fokus"
                              : "Nonaktif"}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`relative h-5 w-9 rounded-full p-0.5 transition-colors duration-200 ${
                          isStrictMode ? "bg-[#34b844]" : "bg-black/15"
                        }`}
                      >
                        <div
                          className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                            isStrictMode ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </div>
                    </button>
                  </div>
                )}

                {/* Subtle Divider Garis Halus */}
                <div className="h-[1px] bg-[#143525]/8 mx-1 my-1" />
              </div>
            )}

            {/* ================================================
                INTEGRATED ANCHOR COCKPIT BAR (TANPA BORDER HITAM)
                ================================================ */}
            <div className="flex h-[60px] w-full items-center justify-between shrink-0">
              {/* SISI KIRI: KATEGORI BUTTON */}
              <button
                type="button"
                onClick={() => toggleFlyout("category")}
                className={`
                  flex-1 min-w-0 h-[48px] flex items-center gap-2.5 pl-2.5 pr-2 rounded-full border transition-all active:scale-[0.97] cursor-pointer
                  ${
                    activeFlyout === "category"
                      ? "bg-black/10 border-white/10 shadow-2xs"
                      : "border-transparent hover:bg-white/40"
                  }
                `}
              >
                <div className="w-8 h-8 rounded-full bg-white/90 border border-white/80 shadow-2xs flex items-center justify-center shrink-0 text-[#1e5235]">
                  <TagLineIcon
                    name={activeTag.icon}
                    className="w-4 h-4 stroke-[2]"
                  />
                </div>

                <div className="min-w-0 text-left flex flex-col justify-center">
                  <span className="text-[8.5px] font-semibold uppercase tracking-[0.14em] text-[#456b57]/90 leading-none mb-1">
                    Kategori
                  </span>
                  <span className="text-[13px] font-semibold text-[#143525] truncate leading-tight block">
                    {tagLabel}
                  </span>
                </div>
              </button>

              {/* CENTER: TOMBOL FOKUS UTAMA (APPLE PILL) */}
              <button
                type="button"
                onClick={() => {
                  hapticMedium();
                  closeFlyout();
                  onStartFocus();
                }}
                className="shrink-0 flex h-[44px] min-w-[104px] px-5 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-[#54d262] to-[#34b844] hover:brightness-105 active:scale-95 text-white font-semibold text-[14px] tracking-tight shadow-[0_6px_18px_rgba(52,184,68,0.35),inset_0_1px_1.5px_rgba(255,255,255,0.6)] border border-white/30 transition-all duration-200 cursor-pointer mx-1"
                title={
                  selectedMinutes === 0
                    ? "Mulai sesi fokus Stopwatch (Bebas)"
                    : `Mulai sesi fokus ${selectedMinutes} menit`
                }
              >
                <Play className="h-3.5 w-3.5 translate-x-[0.5px] fill-white text-white stroke-[2]" />
                <span>Fokus</span>
              </button>

              {/* SISI KANAN: DURASI BUTTON */}
              <button
                type="button"
                onClick={() => toggleFlyout("timer")}
                className={`
                  flex-1 min-w-0 h-[48px] flex items-center justify-end gap-2.5 pl-2 pr-2.5 rounded-full border transition-all active:scale-[0.97] cursor-pointer
                  ${
                    activeFlyout === "timer"
                      ? "bg-black/10 border-white/10 shadow-2xs"
                      : "border-transparent hover:bg-white/40"
                  }
                `}
              >
                <div className="min-w-0 text-right flex flex-col justify-center">
                  <span className="text-[8.5px] font-semibold uppercase tracking-[0.14em] text-[#456b57]/90 leading-none mb-1">
                    Durasi
                  </span>
                  <span className="text-[13px] font-bold  text-[#143525] leading-tight block">
                    {selectedMinutes === 0 ? "Bebas" : `${selectedMinutes}m`}
                  </span>
                </div>

                <div className="w-8 h-8 rounded-full bg-white/90 border border-white/80 shadow-2xs flex items-center justify-center shrink-0 text-[#1e5235]">
                  <Clock3 className="w-4 h-4 stroke-[2]" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
