"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { useGameStore } from "@/lib/game/useGameStore";
import {
  FOCUS_TAGS,
  GAME_CONFIG,
  TREE_SPECIES_CONFIG,
} from "@/lib/game/config";
import { calculateFocusRewards } from "@/lib/game/sessionRules";
import {
  getUnlockedTilesSet,
  getLandExpansionZoneInfo,
  findEmptyTileNearCenter,
  gridToWorld,
} from "@/lib/game/worldRules";
import { TreeSpecies, CustomTagItem, FocusSession } from "@/types/game";
import { getLevelFromXp } from "@/lib/game/levelRules";
import { soundManager } from "@/lib/audio/sounds";
import {
  hapticSuccess,
  hapticWarning,
  hapticMedium,
  hapticLight,
} from "@/lib/mobile/nativeBridge";
import {
  checkOrRequestNotificationPermission,
  scheduleFocusCompletionNotification,
  cancelPendingFocusNotifications,
} from "@/lib/mobile/notificationManager";
import { FocusHarvestModal } from "@/components/focus/FocusHarvestModal";
import { AbandonConfirmModal } from "@/components/focus/AbandonConfirmModal";
import { FocusWitherModal } from "@/components/focus/FocusWitherModal";
import { FocusReturnOverlay } from "@/components/focus/FocusReturnOverlay";
import {
  soundscapeManager,
  SOUNDSCAPES_LIST,
  SoundscapeType,
} from "@/lib/audio/soundscapes";
import { MobileBottomCockpit } from "@/components/hud/MobileBottomCockpit";
import {
  Sparkles,
  Flame,
  ChevronDown,
  Lock,
  Plus,
  Trash2,
  X,
  Tag,
  Search,
  Check,
  Maximize2,
  ShieldCheck,
  Headphones,
  Volume2,
  VolumeX,
  Pause,
  Play,
} from "lucide-react";

import { TagLineIcon, LINE_ICON_KEYS } from "@/components/common/TagLineIcon";
import { useTranslation } from "@/lib/i18n/translations";

export interface MobileFocusCardProps {
  onEnterZen?: () => void;
  claimableCount?: number;
}

const EMPTY_CUSTOM_TAGS: CustomTagItem[] = [];
const CUSTOM_TAG_COLORS = [
  "#1E5638",
  "#10B981",
  "#059669",
  "#2D6A4F",
  "#FFFFFF",
];
const RULER_TICKS = [0, ...Array.from({ length: 24 }, (_, i) => (i + 1) * 5)]; // 0, 5m .. 120m

export function MobileFocusCard({
  onEnterZen,
  claimableCount = 0,
}: MobileFocusCardProps = {}) {
  const { t, language, translateTag, translateSpecies, translateSoundscape } =
    useTranslation();
  const activeSession = useGameStore((state) => state.activeSession);
  const startFocus = useGameStore((state) => state.startFocus);
  const updateActiveSessionMeta = useGameStore(
    (state) => state.updateActiveSessionMeta,
  );
  const addCustomTag = useGameStore((state) => state.addCustomTag);
  const deleteCustomTag = useGameStore((state) => state.deleteCustomTag);
  const abandonFocus = useGameStore((state) => state.abandonFocus);
  const pauseFocus = useGameStore((state) => state.pauseFocus);
  const resumeFocus = useGameStore((state) => state.resumeFocus);
  const completeFocus = useGameStore((state) => state.completeFocus);
  const setZenMode = useGameStore((state) => state.setZenMode);
  const devFastMode = useGameStore((state) => state.devFastMode);
  const focusSetup = useGameStore((state) => state.focusSetup);
  const setFocusSetup = useGameStore((state) => state.setFocusSetup);
  const customTags =
    useGameStore((state) => state.saveData.custom_tags) || EMPTY_CUSTOM_TAGS;
  const world = useGameStore((state) => state.saveData.world);
  const worldObjects = useGameStore((state) => state.saveData.world_objects);
  const isExpandLandMode = useGameStore((state) => state.isExpandLandMode);
  const selectedCatalogItem = useGameStore(
    (state) => state.selectedCatalogItem,
  );
  const relocatingObjectId = useGameStore((state) => state.relocatingObjectId);
  const selectedObject = useGameStore((state) => state.selectedObject);

  const timeOfDay = useGameStore((state) => state.timeOfDay);
  const isNight = timeOfDay === "night";
  const profile = useGameStore((state) => state.saveData.profile);
  const playerLevel = getLevelFromXp(profile.xp);

  // Compute Kubbo Land Expansion Zone Info for live reward preview
  const unlockedSet = useMemo(
    () => getUnlockedTilesSet(world, worldObjects),
    [world, worldObjects],
  );
  const zoneInfo = useMemo(
    () => getLandExpansionZoneInfo(unlockedSet.size),
    [unlockedSet.size],
  );

  // Combine default tags + custom user tags
  const allTags = useMemo(() => {
    const base = FOCUS_TAGS.map((t) => ({
      id: t.id as string,
      label: t.label,
      color: t.color,
      icon: t.icon,
      isCustom: false,
    }));
    const extra = customTags
      .filter(
        (ct) => !base.some((b) => b.id.toLowerCase() === ct.id.toLowerCase()),
      )
      .map((ct) => ({
        id: ct.id,
        label: ct.label,
        color: ct.color,
        icon: ct.icon || "Target",
        isCustom: true,
      }));
    return [...base, ...extra];
  }, [customTags]);

  // Focus configuration derived from persistent store
  const selectedMinutes = focusSetup?.minutes ?? 25;
  const selectedTag = focusSetup?.tag ?? "Belajar";
  const selectedSpecies = focusSetup?.species ?? "oak";
  const isStrictMode = focusSetup?.strictMode ?? false;
  const taskNote = focusSetup?.taskNote ?? "";

  const [showAbandonModal, setShowAbandonModal] = useState<boolean>(false);

  // Modals: Tag Manager, Tree Species Picker, Ambient Soundscape, Custom Duration Scrubber
  const [showTagModal, setShowTagModal] = useState<boolean>(false);
  const [showSpeciesModal, setShowSpeciesModal] = useState<boolean>(false);
  const [showRulerModal, setShowRulerModal] = useState<boolean>(false);
  const [tagSearch, setTagSearch] = useState<string>("");
  const [newTagName, setNewTagName] = useState<string>("");
  const [newTagColor, setNewTagColor] = useState<string>(CUSTOM_TAG_COLORS[0]);
  const [newTagIcon, setNewTagIcon] = useState<string>("Target");

  // Harvest celebration modal & Ambient soundscape popover
  const [showHarvestModal, setShowHarvestModal] = useState<boolean>(false);
  const [harvestSessionSnapshot, setHarvestSessionSnapshot] =
    useState<FocusSession | null>(null);
  const [showWitherModal, setShowWitherModal] = useState<boolean>(false);
  const [witheredSessionSnapshot, setWitheredSessionSnapshot] =
    useState<FocusSession | null>(null);
  const [showSoundscapePopover, setShowSoundscapePopover] =
    useState<boolean>(false);
  const [activeSoundscape, setActiveSoundscape] = useState<SoundscapeType>(
    soundscapeManager.getCurrentTrack(),
  );
  const [soundscapeVolume, setSoundscapeVolume] = useState<number>(
    soundscapeManager.getVolume(),
  );

  const hasChimedRef = useRef<string | null>(null);
  const [showReturnOverlay, setShowReturnOverlay] = useState<boolean>(false);
  const [awaySeconds, setAwaySeconds] = useState<number>(0);
  const backgroundTimestampRef = useRef<number | null>(null);

  // Background away time detector for Focus Return Overlay (Option 1)
  useEffect(() => {
    if (!activeSession || activeSession.status !== "active") {
      setShowReturnOverlay(false);
      return;
    }

    const handleBackground = () => {
      backgroundTimestampRef.current = Date.now();
    };

    const handleForeground = () => {
      if (backgroundTimestampRef.current) {
        const elapsed = Math.round(
          (Date.now() - backgroundTimestampRef.current) / 1000,
        );
        backgroundTimestampRef.current = null;
        const expectedEndMs = new Date(activeSession.expected_end_at).getTime();
        const isFinished =
          !activeSession.is_stopwatch && Date.now() >= expectedEndMs - 1000;

        // In normal mode (not strict) & not yet finished, show return overlay if away for >= 5 seconds
        if (
          elapsed >= 5 &&
          !activeSession.strict_mode &&
          !isFinished
        ) {
          setAwaySeconds(elapsed);
          setShowReturnOverlay(true);
        }
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        handleBackground();
      } else {
        handleForeground();
      }
    };

    window.addEventListener("blur", handleBackground);
    window.addEventListener("focus", handleForeground);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("blur", handleBackground);
      window.removeEventListener("focus", handleForeground);
      window.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [activeSession]);

  // Listen for MobileBottomNav "Fokus" button tap & start/soundscape/harvest events
  useEffect(() => {
    const handleOpenTimer = () => {
      soundManager.playPop();
      hapticLight();
      if (activeSession) {
        if (onEnterZen) onEnterZen();
        else setZenMode(true);
      } else {
        setShowRulerModal((prev) => !prev);
      }
    };
    const handleStartFocusEvent = () => {
      if (!activeSession) {
        handleStart();
      }
    };
    const handleSoundscapeEvt = (e: Event) => {
      const track = (e as CustomEvent<SoundscapeType>).detail;
      setActiveSoundscape(track);
    };
    const handleHarvestEvt = () => {
      if (activeSession) {
        setHarvestSessionSnapshot(activeSession);
      }
      setShowHarvestModal(true);
    };
    const handleAbandonEvt = () => {
      const start = activeSession ? new Date(activeSession.started_at).getTime() : 0;
      const elapsed = Date.now() - start;
      const withinGrace = elapsed <= 10000;
      handleAbandon(withinGrace);
    };

    window.addEventListener("rimba:open_timer", handleOpenTimer);
    window.addEventListener("rimba:start_focus", handleStartFocusEvent);
    window.addEventListener("rimba:soundscape_change", handleSoundscapeEvt);
    window.addEventListener("rimba:open_harvest", handleHarvestEvt);
    window.addEventListener("rimba:open_abandon", handleAbandonEvt);
    return () => {
      window.removeEventListener("rimba:open_timer", handleOpenTimer);
      window.removeEventListener("rimba:start_focus", handleStartFocusEvent);
      window.removeEventListener(
        "rimba:soundscape_change",
        handleSoundscapeEvt,
      );
      window.removeEventListener("rimba:open_harvest", handleHarvestEvt);
      window.removeEventListener("rimba:open_abandon", handleAbandonEvt);
    };
  }, [
    activeSession,
    onEnterZen,
    setZenMode,
    selectedMinutes,
    selectedTag,
    isStrictMode,
    selectedSpecies,
    taskNote,
    devFastMode,
  ]);

  // Local decoupled timer state (updates every 500ms)
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!activeSession) {
      setShowAbandonModal(false);
      hasChimedRef.current = null;
      if (typeof document !== "undefined") {
        document.title = "Rimba — Fokus & Tumbuhkan Pulaumu";
      }
      return;
    }
    if (activeSession.is_paused) {
      return;
    }
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 500);
    return () => clearInterval(interval);
  }, [activeSession, activeSession?.is_paused]);

  // Play gentle completion chime & update tab title when countdown reaches 00:00
  useEffect(() => {
    if (!activeSession || activeSession.status !== "active") return;

    if (activeSession.is_stopwatch) {
      const startMs = new Date(activeSession.started_at).getTime();
      const elapsedSec = Math.floor(Math.max(0, now - startMs) / 1000);
      const m = Math.floor(elapsedSec / 60)
        .toString()
        .padStart(2, "0");
      const s = (elapsedSec % 60).toString().padStart(2, "0");
      if (typeof document !== "undefined") {
        document.title = `(${m}:${s}) ⏱️ Stopwatch — Rimba`;
      }
      return;
    }

    const expectedEnd = new Date(activeSession.expected_end_at).getTime();
    const remainingMs = Math.max(0, expectedEnd - now);
    const reached = now >= expectedEnd - 500;

    if (reached) {
      if (hasChimedRef.current !== activeSession.id) {
        hasChimedRef.current = activeSession.id;
        soundManager.playComplete();
        soundscapeManager.stop();
        setHarvestSessionSnapshot(activeSession);
        setShowHarvestModal(true);
        setZenMode(false);
      }
      if (typeof document !== "undefined") {
        document.title = "🌱 Pohon Siap Dipanen! — Rimba";
      }
    } else if (typeof document !== "undefined") {
      const totalSec = Math.floor(remainingMs / 1000);
      const m = Math.floor(totalSec / 60)
        .toString()
        .padStart(2, "0");
      const s = (totalSec % 60).toString().padStart(2, "0");
      document.title = `(${m}:${s}) Fokus — Rimba`;
    }
  }, [activeSession, now]);

  const handleStart = async () => {
    try {
      try {
        soundManager.playStart();
        if (activeSoundscape !== "off") {
          soundscapeManager.play(activeSoundscape);
        }
      } catch (e) {
        console.warn("[MobileFocusCard] Audio start error:", e);
      }

      const isStopwatch = selectedMinutes === 0;
      const durationSec = devFastMode
        ? GAME_CONFIG.focus.devFastDurationSec
        : isStopwatch
          ? 0
          : selectedMinutes * 60;

      // Contextual permission prompt on first focus (non-blocking for immediate start)
      checkOrRequestNotificationPermission().catch(console.warn);

      const expectedEndAt = new Date(
        Date.now() + (isStopwatch ? 86400 : durationSec) * 1000,
      );
      const speciesCfg = TREE_SPECIES_CONFIG.find(
        (s) => s.id === selectedSpecies,
      );

      const cleanTaskNote =
        typeof taskNote === "string" && taskNote.trim()
          ? taskNote.trim()
          : undefined;

      startFocus(
        durationSec,
        selectedTag,
        isStrictMode,
        selectedSpecies,
        cleanTaskNote,
      );

      // Cinematic camera zoom toward sapling tile
      try {
        const targetTile = findEmptyTileNearCenter(worldObjects, unlockedSet);
        if (targetTile && typeof window !== "undefined") {
          const saplingWorldPos = gridToWorld(
            targetTile.grid_x,
            targetTile.grid_y,
            0.05,
          );
          if (Array.isArray(saplingWorldPos) && saplingWorldPos.length === 3) {
            window.dispatchEvent(
              new CustomEvent("rimba:camera_focus_target", {
                detail: { position: saplingWorldPos, distance: 7.0 },
              }),
            );
          }
        }
      } catch (e) {
        console.warn("[MobileFocusCard] Camera focus dispatch error:", e);
      }

      if (!isStopwatch) {
        scheduleFocusCompletionNotification({
          expectedEndAt,
          speciesName: translateSpecies(
            selectedSpecies,
            speciesCfg?.name || "Rimba Tree",
          ),
          durationMinutes: Math.round(durationSec / 60),
        }).catch((err) => {
          console.warn("[MobileFocusCard] Failed to schedule notification:", err);
        });
      }

      setFocusSetup({ taskNote: "" });
    } catch (err) {
      console.error("[MobileFocusCard] Fatal startFocus error:", err);
    }
  };

  const handleAbandon = (isWithinGrace = false) => {
    if (isWithinGrace) {
      soundManager.playPop();
      hapticLight();
      soundscapeManager.stop();
      setShowAbandonModal(false);
      cancelPendingFocusNotifications();
      abandonFocus();
      return;
    }

    // Open philosophical confirmation sheet
    soundManager.playPop();
    hapticWarning();
    setShowAbandonModal(true);
  };

  const handleConfirmAbandonFromModal = () => {
    const sessionToRecord = activeSession;
    setShowAbandonModal(false);
    hapticWarning();
    soundscapeManager.stop();
    cancelPendingFocusNotifications();
    abandonFocus();

    // If abandoned after the 10-second grace period, present the Wither Reflection modal
    if (sessionToRecord) {
      const elapsedSec =
        (Date.now() - new Date(sessionToRecord.started_at).getTime()) / 1000;
      if (elapsedSec > 10.5) {
        setWitheredSessionSnapshot(sessionToRecord);
        setShowWitherModal(true);
      }
    }
  };

  const handleComplete = () => {
    soundManager.playPop();
    hapticLight();
    if (activeSession?.is_stopwatch) {
      const startMs = new Date(activeSession.started_at).getTime();
      const elapsedMs = Math.max(0, Date.now() - startMs);
      if (elapsedMs < 300000) {
        const confirmEarly =
          typeof window !== "undefined"
            ? window.confirm(
                language === "en"
                  ? "Sessions under 5 minutes do not grow trees or grant rewards. Finish session anyway?"
                  : "Sesi di bawah 5 menit tidak akan menumbuhkan pohon suaka atau memberi hadiah. Selesaikan sesi sekarang?",
              )
            : true;
        if (!confirmEarly) return;

        cancelPendingFocusNotifications();
        soundscapeManager.stop();
        completeFocus();
        return;
      }
    }
    soundscapeManager.stop();
    setHarvestSessionSnapshot(activeSession);
    setShowHarvestModal(true);
  };

  const handleConfirmHarvest = (reflectionNote?: string) => {
    cancelPendingFocusNotifications();
    soundscapeManager.stop();
    if (reflectionNote && reflectionNote.trim()) {
      updateActiveSessionMeta({ task_note: reflectionNote.trim() });
    }
    const success = completeFocus();
    if (success) {
      soundManager.playComplete();
      hapticSuccess();
      setShowHarvestModal(false);
      setHarvestSessionSnapshot(null);
    }
  };

  const activeTagId = activeSession?.tag || selectedTag;
  const currentTagInfo = allTags.find((t) => t.id === activeTagId) || {
    id: activeTagId,
    label: activeTagId,
    color: "#10B981",
    icon: "Target",
    isCustom: true,
  };
  const currentSpeciesInfo =
    TREE_SPECIES_CONFIG.find(
      (s) => s.id === (activeSession?.species || selectedSpecies),
    ) || TREE_SPECIES_CONFIG[0];

  const previewReward = calculateFocusRewards(selectedMinutes);
  const landProgressPct = Math.min(
    100,
    Math.round((previewReward.gold / zoneInfo.nextTileCost) * 100),
  );

  /*
   * APPLE LIQUID GLASS MATERIAL SYSTEM (visionOS / iOS Pure Optical Refraction - No Overshadow / No Glow)
   */
  const glassCapsuleStyle: React.CSSProperties = {
    background: isNight
      ? "linear-gradient(145deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.06) 48%, rgba(10, 24, 16, 0.42) 100%)"
      : "linear-gradient(145deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0.12) 52%, rgba(255, 255, 255, 0.18) 100%)",
    backdropFilter: "blur(36px) saturate(180%)",
    WebkitBackdropFilter: "blur(36px) saturate(180%)",
    border: "1px solid rgba(255, 255, 255, 0.36)",
    boxShadow:
      "inset 0 1px 0 0 rgba(255, 255, 255, 0.55), inset 0 -1px 0 0 rgba(255, 255, 255, 0.14)",
  };

  const modalGlassStyle: React.CSSProperties = {
    background: isNight
      ? "linear-gradient(155deg, rgba(30, 48, 38, 0.72) 0%, rgba(14, 28, 20, 0.82) 100%)"
      : "linear-gradient(155deg, rgba(255, 255, 255, 0.26) 0%, rgba(20, 48, 34, 0.62) 100%)",
    backdropFilter: "blur(40px) saturate(190%)",
    WebkitBackdropFilter: "blur(40px) saturate(190%)",
    border: "1px solid rgba(255, 255, 255, 0.38)",
    boxShadow:
      "inset 0 1px 0 0 rgba(255, 255, 255, 0.6), inset 0 -1px 0 0 rgba(255, 255, 255, 0.12)",
  };

  // Tag Selection & Manager Modal
  const renderTagManagerModal = () => {
    if (!showTagModal) return null;
    const filteredTags = allTags.filter((t) =>
      t.label.toLowerCase().includes(tagSearch.trim().toLowerCase()),
    );

    return (
      <div
        className="fixed inset-0 z-[70] bg-black/25 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150 pointer-events-auto select-none"
        onClick={() => setShowTagModal(false)}
      >
        <div
          style={modalGlassStyle}
          className="w-full max-w-sm rounded-[32px] p-5 transition-all flex flex-col gap-3.5 relative overflow-hidden text-white"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Specular Top Edge Line */}
          <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent pointer-events-none" />

          <div className="flex items-center justify-between pb-2.5 border-b border-white/15 relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/15 border border-white/25 flex items-center justify-center">
                <Tag className="w-3.5 h-3.5 text-white stroke-[2.2]" />
              </div>
              <span className="text-sm font-bold tracking-tight text-white">
                {t.cockpit.tagModalTitle}
              </span>
            </div>
            <button
              onClick={() => setShowTagModal(false)}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/25 border border-white/25 text-white active:scale-90 transition-all cursor-pointer"
              aria-label={t.common.close}
            >
              <X className="w-3.5 h-3.5 stroke-[2.4]" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/[0.12] border border-white/25 relative z-10 backdrop-blur-xl">
            <Search className="w-3.5 h-3.5 text-white/70 stroke-[2.2]" />
            <input
              type="text"
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              placeholder={t.cockpit.tagSearchPlaceholder}
              className="w-full bg-transparent text-xs text-white placeholder-white/55 outline-none font-medium"
            />
          </div>

          {/* Tag List */}
          <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 relative z-10 no-scrollbar">
            {filteredTags.map((tg) => {
              const isSelected = activeTagId === tg.id;
              return (
                <div
                  key={tg.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-2xl border transition-all backdrop-blur-xl ${
                    isSelected
                      ? "bg-white/30 text-white border-white/60 font-semibold"
                      : "bg-white/[0.10] hover:bg-white/[0.18] text-white/95 border-white/20 font-medium"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playPop();
                      hapticLight();
                      if (activeSession) {
                        updateActiveSessionMeta({ tag: tg.id });
                      } else {
                        setFocusSetup({ tag: tg.id });
                      }
                      setShowTagModal(false);
                    }}
                    className="flex items-center gap-2.5 flex-1 text-left cursor-pointer"
                  >
                    <span className="flex items-center justify-center w-6 h-6 rounded-xl bg-white/15 border border-white/20 text-white shrink-0">
                      <TagLineIcon
                        name={tg.icon}
                        className="w-3.5 h-3.5 stroke-[2.2]"
                      />
                    </span>
                    <span className="text-xs font-semibold truncate">
                      {translateTag(tg.label)}
                    </span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                    )}
                    {tg.isCustom && (
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playPop();
                          deleteCustomTag(tg.id);
                          if (selectedTag === tg.id)
                            setFocusSetup({ tag: "Belajar" });
                        }}
                        className="p-1 rounded-lg text-white/60 hover:text-rose-300 hover:bg-rose-500/20 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Create New Tag */}
          <div className="pt-2.5 border-t border-white/15 flex flex-col gap-2 relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/75">
              {t.cockpit.newTagLabel}
            </span>
            {/* Line Icon Selector */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {LINE_ICON_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    soundManager.playPop();
                    setNewTagIcon(key);
                  }}
                  className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer border ${
                    newTagIcon === key
                      ? "bg-white text-[#0f2e1e] border-white scale-105"
                      : "bg-white/[0.10] hover:bg-white/[0.18] text-white border-white/15"
                  }`}
                  title={key}
                >
                  <TagLineIcon
                    name={key}
                    className="w-3.5 h-3.5 stroke-[2.2]"
                  />
                </button>
              ))}
            </div>
            {/* Color Swatches */}
            <div className="flex items-center gap-2">
              {CUSTOM_TAG_COLORS.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setNewTagColor(col)}
                  className={`w-5 h-5 rounded-full border border-white/40 transition-transform cursor-pointer ${
                    newTagColor === col
                      ? "scale-125 ring-2 ring-white"
                      : "opacity-70 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                maxLength={24}
                placeholder={t.cockpit.newTagPlaceholder}
                className="flex-1 px-3.5 py-2 rounded-2xl bg-white/[0.12] border border-white/25 text-xs text-white placeholder-white/55 outline-none font-medium"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newTagName.trim()) return;
                  soundManager.playPop();
                  const created = addCustomTag(
                    newTagName.trim(),
                    newTagColor,
                    newTagIcon,
                  );
                  if (created) {
                    if (activeSession) {
                      updateActiveSessionMeta({ tag: created.id });
                    } else {
                      setFocusSetup({ tag: created.id });
                    }
                    setNewTagName("");
                    setShowTagModal(false);
                  }
                }}
                className="px-3.5 py-2 rounded-2xl bg-white text-[#0f2e1e] hover:bg-white/90 text-xs font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{t.cockpit.addBtn}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Tree Species Picker Modal
  const renderSpeciesPickerModal = () => {
    if (!showSpeciesModal) return null;

    return (
      <div
        className="fixed inset-0 z-[70] bg-black/25 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150 pointer-events-auto select-none"
        onClick={() => setShowSpeciesModal(false)}
      >
        <div
          style={modalGlassStyle}
          className="w-full max-w-sm rounded-[32px] p-5 transition-all flex flex-col gap-3 relative overflow-hidden text-white"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Specular Top Edge Line */}
          <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent pointer-events-none" />

          <div className="flex items-center justify-between pb-2.5 border-b border-white/15 relative z-10">
            <div className="flex items-center gap-2">
              <span className="text-xl leading-none">🌲</span>
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-white">
                  {t.cockpit.treeSeed}
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowSpeciesModal(false)}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/25 border border-white/25 text-white active:scale-90 transition-all cursor-pointer"
              aria-label={t.common.close}
            >
              <X className="w-3.5 h-3.5 stroke-[2.4]" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1 relative z-10 no-scrollbar">
            {TREE_SPECIES_CONFIG.map((sp) => {
              const isUnlocked = playerLevel >= sp.levelRequired;
              const isSelected =
                (activeSession?.species || selectedSpecies) === sp.id;
              return (
                <button
                  key={sp.id}
                  disabled={!isUnlocked}
                  onClick={() => {
                    if (isUnlocked) {
                      soundManager.playPop();
                      hapticLight();
                      setFocusSetup({ species: sp.id });
                      setShowSpeciesModal(false);
                    }
                  }}
                  className={`p-2.5 rounded-2xl border text-left transition-all flex items-center gap-3 backdrop-blur-xl ${
                    isSelected
                      ? "bg-white/30 text-white border-white/60 font-semibold"
                      : isUnlocked
                        ? "bg-white/[0.10] hover:bg-white/[0.18] text-white/95 border-white/20 font-medium cursor-pointer"
                        : "opacity-45 cursor-not-allowed bg-black/15 border-white/10 text-white/50"
                  }`}
                >
                  <span className="text-2xl p-1.5 rounded-xl bg-white/15 border border-white/20 shrink-0">
                    {sp.icon}
                  </span>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold truncate">
                        {translateSpecies(sp.id, sp.name)}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isUnlocked
                            ? isSelected
                              ? "bg-white/25 text-white"
                              : "bg-white/15 text-white/90 border border-white/20"
                            : "bg-black/25 text-white/50"
                        }`}
                      >
                        {isUnlocked
                          ? t.ranks.unlocked
                          : `Lvl ${sp.levelRequired}`}
                      </span>
                    </div>
                    <span
                      className={`text-[11px] truncate mt-0.5 ${isSelected ? "text-white" : "text-white/70"}`}
                    >
                      {sp.description}
                    </span>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-white stroke-[2.5] shrink-0" />
                  )}
                  {!isUnlocked && (
                    <Lock className="w-3.5 h-3.5 text-white/40 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Soundscape Quick Popover Modal
  const renderSoundscapePopover = () => {
    if (!showSoundscapePopover) return null;
    return (
      <div
        className="fixed inset-0 z-[75] bg-black/25 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150 pointer-events-auto select-none"
        onClick={() => setShowSoundscapePopover(false)}
      >
        <div
          style={modalGlassStyle}
          className="w-full max-w-xs rounded-[32px] p-4 transition-all flex flex-col gap-3 relative overflow-hidden text-white"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Specular Top Edge Line */}
          <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent pointer-events-none" />

          <div className="flex items-center justify-between pb-2 border-b border-white/15 relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-white/15 border border-white/25 flex items-center justify-center">
                <Headphones className="w-3.5 h-3.5 text-white stroke-[2.2]" />
              </div>
              <span className="text-xs font-bold tracking-tight text-white">
                {t.cockpit.ambientTitle}
              </span>
            </div>
            <button
              onClick={() => setShowSoundscapePopover(false)}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/25 border border-white/25 text-white active:scale-90 transition-all cursor-pointer"
              aria-label={t.common.close}
            >
              <X className="w-3.5 h-3.5 stroke-[2.4]" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5 relative z-10">
            <button
              type="button"
              onClick={() => {
                soundManager.playPop();
                soundscapeManager.stop();
                setActiveSoundscape("off");
              }}
              className={`p-2.5 rounded-2xl text-left text-xs font-semibold border transition-all flex items-center gap-2 cursor-pointer backdrop-blur-xl ${
                activeSoundscape === "off"
                  ? "bg-white text-[#0f2e1e] border-white font-bold"
                  : "bg-white/[0.10] hover:bg-white/[0.18] border-white/20 text-white/90"
              }`}
            >
              <VolumeX className="w-3.5 h-3.5 opacity-75 shrink-0" />
              <span className="truncate">{t.cockpit.ambientOff}</span>
            </button>

            {SOUNDSCAPES_LIST.map((sc) => {
              const isSelected = activeSoundscape === sc.id;
              const translated = translateSoundscape(sc);
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => {
                    soundManager.playPop();
                    hapticLight();
                    if (isSelected) {
                      soundscapeManager.stop();
                      setActiveSoundscape("off");
                    } else {
                      soundscapeManager.play(sc.id);
                      setActiveSoundscape(sc.id);
                    }
                  }}
                  className={`p-2.5 rounded-2xl text-left text-xs font-semibold border transition-all flex items-center gap-2 cursor-pointer backdrop-blur-xl ${
                    isSelected
                      ? "bg-white text-[#0f2e1e] border-white font-bold"
                      : "bg-white/[0.10] hover:bg-white/[0.18] border-white/20 text-white/90"
                  }`}
                >
                  <span className="text-base leading-none shrink-0">
                    {sc.icon}
                  </span>
                  <span className="truncate">{translated.name}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-2.5 border-t border-white/15 flex flex-col gap-1.5 relative z-10">
            <div className="flex items-center justify-between text-[11px] text-white/85">
              <span className="flex items-center gap-1.5 font-semibold">
                <Volume2 className="w-3.5 h-3.5" />
                <span>{t.cockpit.ambientVolume}</span>
              </span>
              <span className="font-sans tabular-nums font-bold text-white">
                {Math.round(soundscapeVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={soundscapeVolume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setSoundscapeVolume(val);
                soundscapeManager.setVolume(val);
              }}
              className="w-full accent-white cursor-pointer h-1.5 bg-white/25 rounded-full appearance-none"
              aria-label={t.cockpit.ambientVolume}
            />
          </div>
        </div>
      </div>
    );
  };

  // Horizontal Tick-Mark Ruler Scrubber
  const renderHorizontalRulerScrubber = () => (
    <div className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-white/[0.10] border border-white/20 text-white backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">
            {t.cockpit.targetDuration}
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            {selectedMinutes === 0 ? (
              <span className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1">
                <span>⏱️</span>
                <span>{t.cockpit.freeStopwatch}</span>
              </span>
            ) : (
              <>
                <span className="text-2xl font-extrabold tracking-tight text-white tabular-nums">
                  {selectedMinutes}
                </span>
                <span className="text-xs font-semibold text-white/80">
                  {t.common.minutes.toLowerCase()}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end text-right">
          <span className="text-xs font-bold text-white/95 flex items-center gap-1">
            <span>+{previewReward.gold} Soul ✨</span>
            <span>•</span>
            <span className="text-emerald-200">+{previewReward.xp} XP</span>
          </span>
          <span className="text-[10px] text-white/75 flex items-center gap-1 mt-0.5">
            <Maximize2 className="w-2.5 h-2.5 text-white/80" />
            <span>
              {t.cockpit.coversNextTile.replace(
                "{pct}",
                String(landProgressPct),
              )}
            </span>
          </span>
        </div>
      </div>

      <div className="relative pt-1 pb-0.5">
        <div className="flex items-end justify-between px-1 h-5 pointer-events-none">
          {RULER_TICKS.map((tick) => {
            const isMajor = tick % 15 === 0;
            const isActive = tick === selectedMinutes;
            const isStopwatchTick = tick === 0;
            return (
              <div key={tick} className="flex flex-col items-center">
                {isStopwatchTick ? (
                  <div
                    className={`rounded-full transition-all ${
                      isActive
                        ? "w-2.5 h-2.5 bg-white"
                        : "w-1.5 h-1.5 bg-white/35"
                    }`}
                  />
                ) : (
                  <div
                    className={`w-[2px] rounded-full transition-all ${
                      isActive
                        ? "h-5 bg-white"
                        : isMajor
                          ? "h-3.5 bg-white/55"
                          : "h-2 bg-white/25"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
        <input
          type="range"
          min={0}
          max={120}
          step={5}
          value={selectedMinutes}
          onChange={(e) => {
            const val = Number(e.target.value);
            if (val !== selectedMinutes) {
              hapticLight();
              setFocusSetup({ minutes: val });
            }
          }}
          className="w-full accent-white cursor-pointer h-1.5 bg-white/25 rounded-full appearance-none mt-1.5"
          aria-label={t.cockpit.targetDuration}
        />
        <div className="flex justify-between text-[9px] tabular-nums text-white/65 px-0.5 mt-1 font-semibold">
          <span>⏱️ {t.common.free}</span>
          <span>30m</span>
          <span>60m</span>
          <span>90m</span>
          <span>120m</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          soundManager.playPop();
          hapticLight();
          setFocusSetup({ strictMode: !isStrictMode });
        }}
        className={`w-full py-2 px-3 rounded-2xl text-xs font-semibold transition-all flex items-center justify-between border mt-0.5 cursor-pointer ${
          isStrictMode
            ? "bg-amber-400/20 border-amber-300/45 text-amber-100"
            : "bg-white/[0.08] border-white/20 text-white/85"
        }`}
      >
        <span className="flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5" />
          <span>{t.cockpit.strictMode}</span>
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 border border-white/20">
          {isStrictMode ? t.common.active : t.common.off}
        </span>
      </button>
    </div>
  );

  // Custom Duration Scrubber Modal
  const renderRulerModal = () => {
    if (!showRulerModal) return null;
    return (
      <div
        className="fixed inset-0 z-[70] bg-black/25 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150 pointer-events-auto select-none"
        onClick={() => setShowRulerModal(false)}
      >
        <div
          style={modalGlassStyle}
          className="w-full max-w-xs rounded-[32px] p-5 transition-all flex flex-col gap-3 relative overflow-hidden text-white"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Specular Top Edge Line */}
          <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent pointer-events-none" />

          <div className="flex items-center justify-between pb-2 border-b border-white/15 relative z-10">
            <span className="text-xs font-bold tracking-tight text-white">
              {t.cockpit.targetDuration}
            </span>
            <button
              onClick={() => setShowRulerModal(false)}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/25 border border-white/25 text-white active:scale-90 transition-all cursor-pointer"
              aria-label={t.common.close}
            >
              <X className="w-3.5 h-3.5 stroke-[2.4]" />
            </button>
          </div>
          <div className="relative z-10">{renderHorizontalRulerScrubber()}</div>
          <button
            onClick={() => setShowRulerModal(false)}
            className="w-full py-2.5 rounded-2xl bg-white text-[#0f2e1e] hover:bg-white/95 font-bold text-xs active:scale-95 transition-all cursor-pointer relative z-10"
          >
            {t.cockpit.selectMinutes.replace("{mins}", String(selectedMinutes))}
          </button>
        </div>
      </div>
    );
  };

  // ==========================================
  // STATE 1: IDLE / CONFIGURING NEW SESSION
  // ==========================================
  if (!activeSession) {
    if (
      isExpandLandMode ||
      selectedCatalogItem ||
      relocatingObjectId ||
      selectedObject
    ) {
      return (
        <>
          {renderTagManagerModal()}
          {renderSpeciesPickerModal()}
          {renderRulerModal()}
          {renderSoundscapePopover()}
        </>
      );
    }

    return (
      <>
        {renderTagManagerModal()}
        {renderSpeciesPickerModal()}
        {renderRulerModal()}
        {renderSoundscapePopover()}

        {showHarvestModal && (
          <FocusHarvestModal
            isOpen={showHarvestModal}
            onClose={() => {
              setShowHarvestModal(false);
              setHarvestSessionSnapshot(null);
            }}
            session={activeSession || harvestSessionSnapshot}
            onConfirmHarvest={handleConfirmHarvest}
          />
        )}

        {showWitherModal && (
          <FocusWitherModal
            isOpen={showWitherModal}
            onClose={() => setShowWitherModal(false)}
            session={witheredSessionSnapshot}
            onRestartFocus={() => {
              soundManager.playStart();
              setShowWitherModal(false);
              handleStart();
            }}
          />
        )}

        <MobileBottomCockpit
          tagLabel={currentTagInfo.label}
          tagColor={currentTagInfo.color}
          speciesIcon={currentSpeciesInfo.icon}
          selectedMinutes={selectedMinutes}
          isNight={isNight}
          claimableCount={claimableCount}
          onSelectTag={(tag) => {
            soundManager.playPop();
            setFocusSetup({ tag });
          }}
          onSelectSpecies={(species) => {
            soundManager.playPop();
            setFocusSetup({ species: species as TreeSpecies });
          }}
          onSelectMinutes={(minutes) => {
            soundManager.playPop();
            setFocusSetup({ minutes });
          }}
          onToggleStrictMode={() => {
            soundManager.playPop();
            setFocusSetup({ strictMode: !isStrictMode });
          }}
          onStartFocus={handleStart}
          onOpenWorkshop={() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("rimba:open_workshop"));
            }
          }}
          onOpenJournal={() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("rimba:open_journal"));
            }
          }}
        />
      </>
    );
  }

  // ==========================================
  // STATE 2: ACTIVE RUNNING FOCUS SESSION
  // ==========================================
  const referenceNow =
    activeSession.is_paused && activeSession.paused_at
      ? new Date(activeSession.paused_at).getTime()
      : now;
  const start = new Date(activeSession.started_at).getTime();
  const expectedEnd = new Date(activeSession.expected_end_at).getTime();
  const totalDuration = Math.max(1000, expectedEnd - start);
  const elapsedMs = Math.max(0, referenceNow - start);
  const remainingMs = Math.max(0, expectedEnd - referenceNow);
  const sessionProgressPct = activeSession.is_stopwatch
    ? 100
    : Math.min(100, Math.max(2, (elapsedMs / totalDuration) * 100));

  const isTimeReached = referenceNow >= expectedEnd - 500;
  const graceSecondsLeft = Math.max(0, Math.ceil((10000 - elapsedMs) / 1000));
  const isWithinGracePeriod = graceSecondsLeft > 0 && !isTimeReached;
  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <>
      {renderTagManagerModal()}
      <div
        className="fixed left-1/2 -translate-x-1/2 z-30 pointer-events-auto w-[92%] max-w-[390px] flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-300 select-none"
        style={{
          bottom: "max(calc(env(safe-area-inset-bottom, 0px) + 14px), 20px)",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', var(--font-geist-sans), sans-serif",
        }}
      >
        {/* RUNNING FOCUS COCKPIT (APPLE LIQUID GLASS - VISIONOS HUD) */}
        <div
          style={glassCapsuleStyle}
          className="relative w-full p-4 sm:px-5 rounded-[32px] flex flex-col gap-3 transition-all overflow-hidden"
        >
          {/* Continuous Optical Refraction Layer (Tanpa tepi kubah terpotong) */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.18] via-white/[0.04] to-transparent pointer-events-none" />
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/75 to-transparent pointer-events-none" />

          {/* BARIS 1: TIMER UTAMA & KAPSUL KONTEKS SESI (SPESIES + TAG) */}
          <div className="flex items-center justify-between w-full relative z-10 min-w-0 gap-2">
            {/* Sisi Kiri: Timer SF Pro Tabular & Indikator Status */}
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-[32px] leading-none font-extrabold tracking-tight text-white tabular-nums">
                {formatTime(
                  activeSession.is_stopwatch ? elapsedMs : remainingMs,
                )}
              </span>

              {activeSession.is_paused ? (
                <span className="text-[10px] font-bold tracking-wider text-amber-100 bg-amber-400/25 border border-amber-200/45 px-2.5 py-0.5 rounded-full uppercase">
                  {language === "en" ? "Paused" : "Jeda"}
                </span>
              ) : (
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-400/25 border border-emerald-300/45">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                </span>
              )}

              {activeSession.campfire_room_code && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-200 bg-amber-500/25 border border-amber-300/40 px-2 py-0.5 rounded-full backdrop-blur-md">
                  <Flame className="w-3 h-3 text-amber-300 fill-amber-300" />
                  <span>{activeSession.campfire_room_code}</span>
                </span>
              )}
            </div>

            {/* Sisi Kanan: Unified Species & Tag Liquid Glass Pill */}
            <button
              type="button"
              onClick={() => {
                soundManager.playPop();
                setShowTagModal(true);
              }}
              className="flex items-center gap-1.5 pl-2.5 pr-2.5 py-1.5 rounded-full bg-white/[0.16] hover:bg-white/[0.24] border border-white/35 text-white active:scale-95 transition-all cursor-pointer backdrop-blur-xl max-w-[165px]"
              title={t.cockpit.sessionTag}
            >
              <span className="text-xs leading-none shrink-0">
                {currentSpeciesInfo.icon}
              </span>
              <span className="w-px h-3 bg-white/25 shrink-0" />
              <Tag className="w-3 h-3 text-white/90 stroke-[2.2] shrink-0" />
              <span className="text-xs font-semibold tracking-tight truncate">
                {translateTag(currentTagInfo.label)}
              </span>
              <ChevronDown className="w-3 h-3 text-white/70 stroke-[2.2] shrink-0" />
            </button>
          </div>

          {/* LIQUID GLASS PROGRESS TRACK (Menggantikan garis statis biasa) */}
          <div className="w-full h-[3px] rounded-full bg-white/15 overflow-hidden relative z-10">
            <div
              className="h-full rounded-full bg-white/85 transition-all duration-500 ease-out"
              style={{ width: `${sessionProgressPct}%` }}
            />
          </div>

          {/* BARIS 2: TACTILE ACTION CONTROLS & PRIMARY SESSION BUTTON */}
          <div className="flex items-center justify-between w-full relative z-10 gap-2">
            {/* Button Group Kiri: Audio, Pause/Play, Zen Mode */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Ambient Sound Button */}
              <button
                type="button"
                onClick={() => {
                  soundManager.playPop();
                  setShowSoundscapePopover(true);
                }}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer border backdrop-blur-xl relative ${
                  activeSoundscape !== "off"
                    ? "bg-white/30 text-white border-white/60"
                    : "bg-white/[0.14] hover:bg-white/[0.22] text-white border-white/30"
                }`}
                title={t.cockpit.ambientTitle}
                aria-label={t.cockpit.ambientTitle}
              >
                <Headphones className="w-[17px] h-[17px] stroke-[2.2]" />
                {activeSoundscape !== "off" && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </button>

              {/* Pause / Resume Button */}
              {!isTimeReached && (
                <button
                  type="button"
                  disabled={Boolean(activeSession.strict_mode)}
                  onClick={() => {
                    if (activeSession.strict_mode) {
                      soundManager.playPop();
                      hapticLight();
                      useGameStore
                        .getState()
                        .notify(
                          language === "en"
                            ? "Strict Mode active — pausing is disabled."
                            : "Mode Fokus Penuh aktif — jeda dinonaktifkan.",
                          "error",
                        );
                      return;
                    }
                    soundManager.playPop();
                    if (activeSession.is_paused) {
                      resumeFocus();
                    } else {
                      pauseFocus();
                    }
                  }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border backdrop-blur-xl ${
                    activeSession.strict_mode
                      ? "opacity-55 cursor-not-allowed bg-amber-400/15 border-amber-200/35 text-amber-200"
                      : activeSession.is_paused
                        ? "bg-amber-400/30 text-amber-100 border-amber-200/60 cursor-pointer active:scale-90"
                        : "bg-white/[0.14] hover:bg-white/[0.22] text-white border-white/30 cursor-pointer active:scale-90"
                  }`}
                  title={
                    activeSession.strict_mode
                      ? language === "en"
                        ? "Pause disabled in Strict Mode"
                        : "Jeda dinonaktifkan di Mode Fokus Penuh"
                      : activeSession.is_paused
                        ? language === "en"
                          ? "Resume Focus"
                          : "Lanjutkan Fokus"
                        : language === "en"
                          ? "Pause Session"
                          : "Jeda Sesi"
                  }
                  aria-label={
                    activeSession.strict_mode
                      ? "Pause disabled in Strict Mode"
                      : activeSession.is_paused
                        ? "Resume Focus"
                        : "Pause Session"
                  }
                >
                  {activeSession.strict_mode ? (
                    <Lock className="w-3.5 h-3.5 text-amber-200 stroke-[2.2]" />
                  ) : activeSession.is_paused ? (
                    <Play className="w-4 h-4 fill-current translate-x-0.5" />
                  ) : (
                    <Pause className="w-4 h-4 fill-current" />
                  )}
                </button>
              )}

              {/* Zen Mode Button */}
              {onEnterZen && (
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playPop();
                    onEnterZen();
                  }}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer border bg-white/[0.14] hover:bg-white/[0.22] text-white border-white/30 backdrop-blur-xl"
                  title="Zen Mode"
                  aria-label="Zen Mode"
                >
                  <Maximize2 className="w-4 h-4 stroke-[2.2]" />
                </button>
              )}
            </div>

            {/* Sisi Kanan: Primary Action (Panen / Menyerah) */}
            <div className="flex items-center min-w-0">
              {isTimeReached ||
              (activeSession.is_stopwatch && !isWithinGracePeriod) ? (
                <button
                  type="button"
                  onClick={handleComplete}
                  className="h-10 px-4.5 rounded-full font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer bg-white text-[#0f2e1e] hover:bg-white/90 border border-white"
                  title={t.cockpit.harvestReady}
                >
                  <Sparkles className="w-3.5 h-3.5 fill-current" />
                  <span>{t.cockpit.harvestReady}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleAbandon(isWithinGracePeriod)}
                  className={`h-10 px-4 rounded-full font-semibold text-xs active:scale-95 transition-all flex items-center justify-center cursor-pointer border backdrop-blur-xl ${
                    isWithinGracePeriod
                      ? "bg-amber-400/25 text-amber-100 border-amber-200/45"
                      : "bg-white/[0.14] hover:bg-white/[0.22] text-white border-white/30"
                  }`}
                  title={t.cockpit.cancelSession}
                >
                  {isWithinGracePeriod ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-100 mr-1.5" />
                      <span className="tabular-nums">
                        {t.cockpit.cancelGrace.replace(
                          "{sec}",
                          String(graceSecondsLeft),
                        )}
                      </span>
                    </>
                  ) : (
                    <span>{t.cockpit.cancelSession}</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showHarvestModal && (
        <FocusHarvestModal
          isOpen={showHarvestModal}
          onClose={() => {
            setShowHarvestModal(false);
            setHarvestSessionSnapshot(null);
            useGameStore.getState().notify(t.harvest.harvestLaterToast, "info");
          }}
          session={activeSession || harvestSessionSnapshot}
          onConfirmHarvest={handleConfirmHarvest}
        />
      )}

      <FocusReturnOverlay
        isOpen={showReturnOverlay}
        awaySeconds={awaySeconds}
        onResume={() => {
          setShowReturnOverlay(false);
          hapticLight();
          if (activeSession && activeSession.is_paused) {
            resumeFocus();
          }
        }}
        onPause={() => {
          setShowReturnOverlay(false);
          if (activeSession && !activeSession.is_paused) {
            pauseFocus();
          }
        }}
        onAbandon={() => {
          setShowReturnOverlay(false);
          setShowAbandonModal(true);
        }}
      />

      {showAbandonModal && (
        <AbandonConfirmModal
          isOpen={showAbandonModal}
          onClose={() => setShowAbandonModal(false)}
          onConfirmAbandon={handleConfirmAbandonFromModal}
          session={activeSession}
          secondsRemaining={Math.floor(remainingMs / 1000)}
        />
      )}

      {showWitherModal && (
        <FocusWitherModal
          isOpen={showWitherModal}
          onClose={() => setShowWitherModal(false)}
          session={witheredSessionSnapshot}
          onRestartFocus={() => {
            soundManager.playStart();
            setShowWitherModal(false);
            handleStart();
          }}
        />
      )}
      {renderSoundscapePopover()}
    </>
  );
}

// Backward-compatible alias
export const FocusTimerCard = MobileFocusCard;
