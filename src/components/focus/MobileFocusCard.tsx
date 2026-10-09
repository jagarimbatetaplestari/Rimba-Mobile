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
} from "lucide-react";

import { TagLineIcon, LINE_ICON_KEYS } from "@/components/common/TagLineIcon";

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
  const activeSession = useGameStore((state) => state.activeSession);
  const startFocus = useGameStore((state) => state.startFocus);
  const updateActiveSessionMeta = useGameStore(
    (state) => state.updateActiveSessionMeta,
  );
  const addCustomTag = useGameStore((state) => state.addCustomTag);
  const deleteCustomTag = useGameStore((state) => state.deleteCustomTag);
  const abandonFocus = useGameStore((state) => state.abandonFocus);
  const completeFocus = useGameStore((state) => state.completeFocus);
  const setZenMode = useGameStore((state) => state.setZenMode);
  const devFastMode = useGameStore((state) => state.devFastMode);
  const focusSetup = useGameStore((state) => state.focusSetup);
  const setFocusSetup = useGameStore((state) => state.setFocusSetup);
  const customTags =
    useGameStore((state) => state.saveData.custom_tags) || EMPTY_CUSTOM_TAGS;
  const world = useGameStore((state) => state.saveData.world);
  const worldObjects = useGameStore((state) => state.saveData.world_objects);

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
      setShowHarvestModal(true);
    };

    window.addEventListener("rimba:open_timer", handleOpenTimer);
    window.addEventListener("rimba:start_focus", handleStartFocusEvent);
    window.addEventListener("rimba:soundscape_change", handleSoundscapeEvt);
    window.addEventListener("rimba:open_harvest", handleHarvestEvt);
    return () => {
      window.removeEventListener("rimba:open_timer", handleOpenTimer);
      window.removeEventListener("rimba:start_focus", handleStartFocusEvent);
      window.removeEventListener(
        "rimba:soundscape_change",
        handleSoundscapeEvt,
      );
      window.removeEventListener("rimba:open_harvest", handleHarvestEvt);
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
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 500);
    return () => clearInterval(interval);
  }, [activeSession]);

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
        useGameStore
          .getState()
          .notify(
            '🌱 Waktu fokus selesai! Klik "Panen!" untuk menanam pohonmu.',
            "success",
          );
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
    soundManager.playStart();
    const isStopwatch = selectedMinutes === 0;
    const durationSec = devFastMode
      ? GAME_CONFIG.focus.devFastDurationSec
      : isStopwatch
        ? 0
        : selectedMinutes * 60;

    // Contextual permission prompt on first focus
    await checkOrRequestNotificationPermission();

    const expectedEndAt = new Date(
      Date.now() + (isStopwatch ? 86400 : durationSec) * 1000,
    );
    const speciesCfg = TREE_SPECIES_CONFIG.find(
      (s) => s.id === selectedSpecies,
    );

    startFocus(
      durationSec,
      selectedTag,
      isStrictMode,
      selectedSpecies,
      taskNote.trim() || undefined,
    );

    // Cinematic camera zoom toward sapling tile
    const targetTile = findEmptyTileNearCenter(worldObjects, unlockedSet);
    if (targetTile && typeof window !== "undefined") {
      const saplingWorldPos = gridToWorld(
        targetTile.grid_x,
        targetTile.grid_y,
        0.05,
      );
      window.dispatchEvent(
        new CustomEvent("rimba:camera_focus_target", {
          detail: { position: saplingWorldPos, distance: 7.0 },
        }),
      );
    }

    if (!isStopwatch) {
      scheduleFocusCompletionNotification({
        expectedEndAt,
        speciesName: speciesCfg?.name || "Pohon Rimba",
        durationMinutes: Math.round(durationSec / 60),
      });
    }

    setFocusSetup({ taskNote: "" });
  };

  const handleAbandon = (isWithinGrace = false) => {
    if (isWithinGrace) {
      soundManager.playPop();
      hapticLight();
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
        cancelPendingFocusNotifications();
        completeFocus();
        return;
      }
    }
    setShowHarvestModal(true);
  };

  const handleConfirmHarvest = (reflectionNote?: string) => {
    cancelPendingFocusNotifications();
    if (reflectionNote && reflectionNote.trim()) {
      updateActiveSessionMeta({ task_note: reflectionNote.trim() });
    }
    const success = completeFocus();
    if (success) {
      soundManager.playComplete();
      hapticSuccess();
      setShowHarvestModal(false);
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
   * APPLE LIQUID GLASS MATERIAL SYSTEM (Selaras Cockpit & Header)
   */
  const glassCapsuleStyle: React.CSSProperties = {
    background: isNight
      ? "linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.05) 35%, rgba(6, 22, 13, 0.55) 100%)"
      : "linear-gradient(180deg, rgba(255, 255, 255, 0.38) 0%, rgba(255, 255, 255, 0.12) 36%, rgba(12, 38, 23, 0.42) 100%)",
    backdropFilter: "blur(26px) saturate(190%) contrast(102%)",
    WebkitBackdropFilter: "blur(26px) saturate(190%) contrast(102%)",
    border: "1px solid rgba(255, 255, 255, 0.42)",
    boxShadow: isNight
      ? "inset 0 1.5px 1px 0 rgba(255, 255, 255, 0.65), inset 0 -1.5px 1px 0 rgba(0, 0, 0, 0.35), 0 12px 28px rgba(0, 0, 0, 0.3)"
      : "inset 0 1.5px 1px 0 rgba(255, 255, 255, 0.78), inset 0 -1.5px 1px 0 rgba(0, 0, 0, 0.18), 0 12px 26px -4px rgba(6, 26, 15, 0.22)",
  };

  const modalGlassStyle: React.CSSProperties = {
    background: isNight
      ? "linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, rgba(12, 32, 21, 0.55) 25%, rgba(4, 16, 9, 0.85) 100%)"
      : "linear-gradient(180deg, rgba(255, 255, 255, 0.38) 0%, rgba(18, 52, 34, 0.48) 25%, rgba(8, 28, 17, 0.75) 100%)",
    backdropFilter: "blur(32px) saturate(190%)",
    WebkitBackdropFilter: "blur(32px) saturate(190%)",
    border: "1px solid rgba(255, 255, 255, 0.38)",
    boxShadow:
      "inset 0 1.5px 1.5px 0 rgba(255, 255, 255, 0.75), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.3), 0 24px 50px rgba(0, 0, 0, 0.32)",
  };

  // Tag Selection & Manager Modal
  const renderTagManagerModal = () => {
    if (!showTagModal) return null;
    const filteredTags = allTags.filter((t) =>
      t.label.toLowerCase().includes(tagSearch.trim().toLowerCase()),
    );

    return (
      <div
        className="fixed inset-0 z-[70] bg-black/20 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 pointer-events-auto select-none"
        onClick={() => setShowTagModal(false)}
      >
        <div
          style={modalGlassStyle}
          className="w-full max-w-sm rounded-[32px] p-5 transition-all flex flex-col gap-3.5 relative overflow-hidden text-white"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top light reflection */}
          <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/20 to-transparent pointer-events-none rounded-t-[32px]" />

          <div className="flex items-center justify-between pb-2 border-b border-white/20 relative z-10">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-300 stroke-[2.3]" />
              <span className="text-sm font-bold tracking-tight text-white drop-shadow-xs">
                Pilih Tag Kategori
              </span>
            </div>
            <button
              onClick={() => setShowTagModal(false)}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 border border-white/30 text-white active:scale-90 transition-transform cursor-pointer shadow-xs"
              aria-label="Tutup tag"
            >
              <X className="w-3.5 h-3.5 stroke-[2.4]" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/12 border border-white/25 relative z-10 backdrop-blur-md">
            <Search className="w-3.5 h-3.5 text-white/70 stroke-[2.2]" />
            <input
              type="text"
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              placeholder="Cari tag fokus..."
              className="w-full bg-transparent text-xs text-white placeholder-white/50 outline-none font-medium"
            />
          </div>

          {/* Tag List */}
          <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 relative z-10 no-scrollbar">
            {filteredTags.map((t) => {
              const isSelected = activeTagId === t.id;
              return (
                <div
                  key={t.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-2xl border transition-all backdrop-blur-md ${
                    isSelected
                      ? "bg-white/35 text-white border-white/60 font-semibold shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)]"
                      : "bg-white/12 hover:bg-white/20 text-white/95 border-white/20 font-medium"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playPop();
                      hapticLight();
                      if (activeSession) {
                        updateActiveSessionMeta({ tag: t.id });
                      } else {
                        setFocusSetup({ tag: t.id });
                      }
                      setShowTagModal(false);
                    }}
                    className="flex items-center gap-2.5 flex-1 text-left cursor-pointer"
                  >
                    <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-black/20 text-white shrink-0">
                      <TagLineIcon
                        name={t.icon}
                        className="w-3.5 h-3.5 stroke-[2.2]"
                      />
                    </span>
                    <span className="text-xs font-semibold truncate drop-shadow-xs">
                      {t.label}
                    </span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                    )}
                    {t.isCustom && (
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playPop();
                          deleteCustomTag(t.id);
                          if (selectedTag === t.id)
                            setFocusSetup({ tag: "Belajar" });
                        }}
                        className="p-1 rounded-lg text-white/60 hover:text-rose-400 hover:bg-rose-500/20 transition-colors"
                        title="Hapus tag kustom"
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
          <div className="pt-2 border-t border-white/20 flex flex-col gap-2 relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">
              + Buat Tag Baru
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
                  className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                    newTagIcon === key
                      ? "bg-white text-[#0f2e1e] shadow-xs ring-1 ring-white scale-105"
                      : "bg-white/12 hover:bg-white/20 text-white border border-white/15"
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
                  className={`w-5 h-5 rounded-full border border-white/30 transition-transform cursor-pointer ${
                    newTagColor === col
                      ? "scale-125 ring-2 ring-white shadow-xs"
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
                placeholder="Nama tag baru..."
                className="flex-1 px-3 py-2 rounded-2xl bg-white/12 border border-white/25 text-xs text-white placeholder-white/50 outline-none font-medium"
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
                className="px-3 py-2 rounded-2xl bg-white text-[#0f2e1e] hover:bg-white/90 text-xs font-bold flex items-center gap-1 shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Tambah</span>
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
        className="fixed inset-0 z-[70] bg-black/20 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 pointer-events-auto select-none"
        onClick={() => setShowSpeciesModal(false)}
      >
        <div
          style={modalGlassStyle}
          className="w-full max-w-sm rounded-[32px] p-5 transition-all flex flex-col gap-3 relative overflow-hidden text-white"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top light reflection */}
          <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/20 to-transparent pointer-events-none rounded-t-[32px]" />

          <div className="flex items-center justify-between pb-2 border-b border-white/20 relative z-10">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌲</span>
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-white drop-shadow-xs">
                  Pilih Bibit Pohon Rimba
                </span>
                <span className="text-[10px] text-white/70">
                  Pohon yang akan mekar selama kamu fokus
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowSpeciesModal(false)}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 border border-white/30 text-white active:scale-90 transition-transform cursor-pointer shadow-xs"
              aria-label="Tutup bibit pohon"
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
                  className={`p-2.5 rounded-2xl border text-left transition-all flex items-center gap-3 backdrop-blur-md ${
                    isSelected
                      ? "bg-white/35 text-white border-white/60 font-semibold shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)]"
                      : isUnlocked
                        ? "bg-white/12 hover:bg-white/20 text-white/95 border-white/20 font-medium cursor-pointer"
                        : "opacity-40 cursor-not-allowed bg-black/20 border-white/10 text-white/50"
                  }`}
                >
                  <span className="text-2xl p-1.5 rounded-xl bg-black/20 shrink-0">
                    {sp.icon}
                  </span>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold truncate drop-shadow-xs">
                        {sp.name}
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
                        {isUnlocked ? "Tersedia" : `Lvl ${sp.levelRequired}`}
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
        className="fixed inset-0 z-[75] bg-black/20 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 pointer-events-auto select-none"
        onClick={() => setShowSoundscapePopover(false)}
      >
        <div
          style={modalGlassStyle}
          className="w-full max-w-xs rounded-[32px] p-4 transition-all flex flex-col gap-3 relative overflow-hidden text-white"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top light reflection */}
          <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/20 to-transparent pointer-events-none rounded-t-[32px]" />

          <div className="flex items-center justify-between pb-2 border-b border-white/20 relative z-10">
            <div className="flex items-center gap-2">
              <Headphones className="w-4 h-4 text-emerald-300 stroke-[2.3]" />
              <span className="text-xs font-bold tracking-tight text-white drop-shadow-xs">
                Suara Alam (Ambience)
              </span>
            </div>
            <button
              onClick={() => setShowSoundscapePopover(false)}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 border border-white/30 text-white active:scale-90 transition-transform cursor-pointer shadow-xs"
              aria-label="Tutup suara latar"
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
              className={`p-2 rounded-2xl text-left text-xs font-semibold border transition-all flex items-center gap-2 cursor-pointer backdrop-blur-md ${
                activeSoundscape === "off"
                  ? "bg-white text-[#0f2e1e] border-white shadow-xs font-bold"
                  : "bg-white/12 hover:bg-white/20 border-white/20 text-white/90"
              }`}
            >
              <VolumeX className="w-3.5 h-3.5 opacity-70" />
              <span>Hening (Mati)</span>
            </button>

            {SOUNDSCAPES_LIST.map((sc) => {
              const isSelected = activeSoundscape === sc.id;
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
                  className={`p-2 rounded-2xl text-left text-xs font-semibold border transition-all flex items-center gap-2 cursor-pointer backdrop-blur-md ${
                    isSelected
                      ? "bg-white text-[#0f2e1e] border-white shadow-xs font-bold"
                      : "bg-white/12 hover:bg-white/20 border-white/20 text-white/90"
                  }`}
                >
                  <span className="text-base leading-none">{sc.icon}</span>
                  <span className="truncate">{sc.name}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-white/20 flex flex-col gap-1.5 relative z-10">
            <div className="flex items-center justify-between text-[11px] text-white/80">
              <span className="flex items-center gap-1 font-semibold">
                <Volume2 className="w-3.5 h-3.5" />
                <span>Volume Alam</span>
              </span>
              <span className="font-mono font-bold text-white">
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
              className="w-full accent-white cursor-pointer h-1.5 bg-white/20 rounded-lg appearance-none"
              aria-label="Volume suara latar alam"
            />
          </div>
        </div>
      </div>
    );
  };

  // Horizontal Tick-Mark Ruler Scrubber
  const renderHorizontalRulerScrubber = () => (
    <div className="flex flex-col gap-2 p-3 rounded-2xl bg-white/12 border border-white/20 text-white backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">
            Geser Durasi Fokus
          </span>
          <div className="flex items-baseline gap-1.5">
            {selectedMinutes === 0 ? (
              <span className="text-xl font-bold font-mono text-white flex items-center gap-1 drop-shadow-xs">
                <span>⏱️</span>
                <span>Bebas (Stopwatch)</span>
              </span>
            ) : (
              <>
                <span className="text-2xl font-bold font-mono text-white tabular-nums drop-shadow-xs">
                  {selectedMinutes}
                </span>
                <span className="text-xs font-semibold text-white/80">
                  menit
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end text-right">
          <span className="text-xs font-bold text-white/90 flex items-center gap-1">
            <span>+{previewReward.gold} Soul ✨</span>
            <span>•</span>
            <span className="text-emerald-300">+{previewReward.xp} XP</span>
          </span>
          <span className="text-[10px] text-white/70 flex items-center gap-1">
            <Maximize2 className="w-2.5 h-2.5 text-white/80" />
            <span>
              Menutup <b>{landProgressPct}%</b> petak baru
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
                        ? "w-2.5 h-2.5 bg-white shadow-xs"
                        : "w-1.5 h-1.5 bg-white/35"
                    }`}
                  />
                ) : (
                  <div
                    className={`w-[2px] rounded-full transition-all ${
                      isActive
                        ? "h-5 bg-white shadow-xs"
                        : isMajor
                          ? "h-3.5 bg-white/50"
                          : "h-2 bg-white/20"
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
          className="w-full accent-white cursor-pointer h-1.5 bg-white/25 rounded-lg appearance-none mt-1"
          aria-label="Penggaris durasi fokus (0 untuk stopwatch)"
        />
        <div className="flex justify-between text-[9px] font-mono text-white/60 px-0.5 mt-0.5 font-semibold">
          <span>⏱️ Bebas</span>
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
            ? "bg-amber-400/20 border-amber-300/40 text-amber-200"
            : "bg-white/10 border-white/20 text-white/80"
        }`}
      >
        <span className="flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5" />
          <span>Mode Ketat (Tenggang 10s)</span>
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/15">
          {isStrictMode ? "Aktif" : "Mati"}
        </span>
      </button>
    </div>
  );

  // Custom Duration Scrubber Modal
  const renderRulerModal = () => {
    if (!showRulerModal) return null;
    return (
      <div
        className="fixed inset-0 z-[70] bg-black/20 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 pointer-events-auto select-none"
        onClick={() => setShowRulerModal(false)}
      >
        <div
          style={modalGlassStyle}
          className="w-full max-w-xs rounded-[32px] p-5 transition-all flex flex-col gap-3 relative overflow-hidden text-white"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top light reflection */}
          <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/20 to-transparent pointer-events-none rounded-t-[32px]" />

          <div className="flex items-center justify-between pb-2 border-b border-white/20 relative z-10">
            <span className="text-xs font-bold tracking-tight text-white drop-shadow-xs">
              Atur Durasi Fokus
            </span>
            <button
              onClick={() => setShowRulerModal(false)}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 border border-white/30 text-white active:scale-90 transition-transform cursor-pointer shadow-xs"
              aria-label="Tutup atur durasi"
            >
              <X className="w-3.5 h-3.5 stroke-[2.4]" />
            </button>
          </div>
          <div className="relative z-10">{renderHorizontalRulerScrubber()}</div>
          <button
            onClick={() => setShowRulerModal(false)}
            className="w-full py-2.5 rounded-2xl bg-white text-[#0f2e1e] hover:bg-white/95 font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer relative z-10"
          >
            Pilih {selectedMinutes} Menit
          </button>
        </div>
      </div>
    );
  };

  // ==========================================
  // STATE 1: IDLE / CONFIGURING NEW SESSION
  // ==========================================
  if (!activeSession) {
    return (
      <>
        {renderSoundscapePopover()}

        {showHarvestModal && (
          <FocusHarvestModal
            isOpen={showHarvestModal}
            onClose={() => setShowHarvestModal(false)}
            session={activeSession}
            onConfirmHarvest={handleConfirmHarvest}
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
  const start = new Date(activeSession.started_at).getTime();
  const expectedEnd = new Date(activeSession.expected_end_at).getTime();
  const totalDuration = Math.max(1000, expectedEnd - start);
  const elapsedMs = Math.max(0, now - start);
  const remainingMs = Math.max(0, expectedEnd - now);

  const isTimeReached = now >= expectedEnd - 500;
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
        {/* RUNNING FOCUS CAPSULE (APPLE LIQUID GLASS) */}
        <div
          style={glassCapsuleStyle}
          className="relative w-full h-[64px] px-5 rounded-full flex items-center justify-between gap-2.5 transition-all overflow-hidden"
        >
          {/* Specular Highlight Top Sheen */}
          <div className="absolute inset-x-4 top-0 h-[45%] bg-gradient-to-b from-white/35 to-transparent rounded-t-full pointer-events-none" />

          {/* SISI KIRI: Timer Utama Besar */}
          <div className="flex items-center gap-2.5 min-w-0 relative z-10">
            <button
              type="button"
              onClick={() => {
                soundManager.playPop();
                setShowTagModal(true);
              }}
              className="flex items-center gap-2 text-left active:scale-95 transition-transform cursor-pointer"
              title="Ketuk untuk melihat Tag atau Bibit Pohon"
            >
              <span className="text-2xl font-bold font-mono tracking-tight text-white tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                {formatTime(
                  activeSession.is_stopwatch ? elapsedMs : remainingMs,
                )}
              </span>
            </button>
          </div>

          {/* VERTICAL DIVIDER PRESISI */}
          <div className="h-6 w-[1px] bg-white/25 shrink-0 mx-1 relative z-10" />

          {/* SISI TENGAH: Kontrol Audio & Mode Zen */}
          <div className="flex items-center gap-1.5 shrink-0 relative z-10">
            {/* Ambient Sound Button */}
            <button
              type="button"
              onClick={() => {
                soundManager.playPop();
                setShowSoundscapePopover(true);
              }}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer border backdrop-blur-md ${
                activeSoundscape !== "off"
                  ? "bg-white/35 text-white border-white/60 shadow-xs"
                  : "bg-white/12 hover:bg-white/20 text-white border-white/25"
              }`}
              title="Atur Suara Alam"
              aria-label="Atur Suara Alam"
            >
              <Headphones className="w-4 h-4 stroke-[2.2] drop-shadow-xs" />
            </button>

            {/* Zen Mode Button */}
            {onEnterZen && (
              <button
                type="button"
                onClick={() => {
                  soundManager.playPop();
                  onEnterZen();
                }}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer border bg-white/12 hover:bg-white/20 text-white border-white/25 backdrop-blur-md"
                title="Mode Zen Layar Penuh"
                aria-label="Mode Zen"
              >
                <Maximize2 className="w-3.5 h-3.5 stroke-[2.2] drop-shadow-xs" />
              </button>
            )}
          </div>

          {/* SISI KANAN: Tombol Aksi (Batal / Panen) */}
          <div className="shrink-0 relative z-10">
            {isTimeReached ||
            (activeSession.is_stopwatch && !isWithinGracePeriod) ? (
              <button
                type="button"
                onClick={handleComplete}
                className="h-9 px-4 rounded-full font-bold text-xs shadow-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer bg-white text-[#0f2e1e] hover:bg-white/95"
                title="Panen hasil fokusmu!"
              >
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                <span>Panen!</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleAbandon(isWithinGracePeriod)}
                className={`h-9 px-3.5 rounded-full font-semibold text-xs active:scale-95 transition-all flex items-center justify-center cursor-pointer border backdrop-blur-md ${
                  isWithinGracePeriod
                    ? "bg-amber-400/25 text-amber-200 border-amber-300/40 shadow-xs"
                    : "bg-white/14 hover:bg-white/22 text-white border-white/25 shadow-xs"
                }`}
                title={
                  isWithinGracePeriod
                    ? `Masa tenggang ${graceSecondsLeft}s: Batalkan tanpa penalti`
                    : "Batalkan Sesi"
                }
              >
                {isWithinGracePeriod ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-200 mr-1" />
                    <span>Batal ({graceSecondsLeft}s)</span>
                  </>
                ) : (
                  <span>Batal</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {showHarvestModal && (
        <FocusHarvestModal
          isOpen={showHarvestModal}
          onClose={() => setShowHarvestModal(false)}
          session={activeSession}
          onConfirmHarvest={handleConfirmHarvest}
        />
      )}

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
            // Re-open focus setup
            soundManager.playPop();
          }}
        />
      )}
      {renderSoundscapePopover()}
    </>
  );
}

// Backward-compatible alias
export const FocusTimerCard = MobileFocusCard;
