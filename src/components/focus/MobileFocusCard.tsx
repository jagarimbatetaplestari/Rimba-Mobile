'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useGameStore } from '@/lib/game/useGameStore';
import { FOCUS_TAGS, GAME_CONFIG, TREE_SPECIES_CONFIG } from '@/lib/game/config';
import { calculateFocusRewards } from '@/lib/game/sessionRules';
import {
  getUnlockedTilesSet,
  getLandExpansionZoneInfo,
  findEmptyTileNearCenter,
  gridToWorld,
} from '@/lib/game/worldRules';
import { TreeSpecies, CustomTagItem } from '@/types/game';
import { getLevelFromXp } from '@/lib/game/levelRules';
import { soundManager } from '@/lib/audio/sounds';
import {
  hapticSuccess,
  hapticWarning,
  hapticMedium,
  hapticLight,
} from '@/lib/mobile/nativeBridge';
import {
  checkOrRequestNotificationPermission,
  scheduleFocusCompletionNotification,
  cancelPendingFocusNotifications,
} from '@/lib/mobile/notificationManager';
import { FocusHarvestModal } from '@/components/focus/FocusHarvestModal';
import { soundscapeManager, SOUNDSCAPES_LIST, SoundscapeType } from '@/lib/audio/soundscapes';
import { MobileBottomCockpit } from '@/components/hud/MobileBottomCockpit';
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
} from 'lucide-react';

import { TagLineIcon, LINE_ICON_KEYS } from '@/components/common/TagLineIcon';

export interface MobileFocusCardProps {
  onEnterZen?: () => void;
}

const EMPTY_CUSTOM_TAGS: CustomTagItem[] = [];
// Strictly Green & White aesthetic
const CUSTOM_TAG_COLORS = ['#1E5638', '#10B981', '#059669', '#2D6A4F', '#FFFFFF'];
const RULER_TICKS = [0, ...Array.from({ length: 24 }, (_, i) => (i + 1) * 5)]; // 0, 5m .. 120m

export function MobileFocusCard({ onEnterZen }: MobileFocusCardProps = {}) {
  const activeSession = useGameStore((state) => state.activeSession);
  const startFocus = useGameStore((state) => state.startFocus);
  const updateActiveSessionMeta = useGameStore((state) => state.updateActiveSessionMeta);
  const addCustomTag = useGameStore((state) => state.addCustomTag);
  const deleteCustomTag = useGameStore((state) => state.deleteCustomTag);
  const abandonFocus = useGameStore((state) => state.abandonFocus);
  const completeFocus = useGameStore((state) => state.completeFocus);
  const setZenMode = useGameStore((state) => state.setZenMode);
  const devFastMode = useGameStore((state) => state.devFastMode);
  const focusSetup = useGameStore((state) => state.focusSetup);
  const setFocusSetup = useGameStore((state) => state.setFocusSetup);
  const customTags = useGameStore((state) => state.saveData.custom_tags) || EMPTY_CUSTOM_TAGS;
  const world = useGameStore((state) => state.saveData.world);
  const worldObjects = useGameStore((state) => state.saveData.world_objects);

  const timeOfDay = useGameStore((state) => state.timeOfDay);
  const isNight = timeOfDay === 'night';
  const profile = useGameStore((state) => state.saveData.profile);
  const playerLevel = getLevelFromXp(profile.xp);

  // Compute Kubbo Land Expansion Zone Info for live reward preview
  const unlockedSet = useMemo(
    () => getUnlockedTilesSet(world, worldObjects),
    [world, worldObjects]
  );
  const zoneInfo = useMemo(
    () => getLandExpansionZoneInfo(unlockedSet.size),
    [unlockedSet.size]
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
      .filter((ct) => !base.some((b) => b.id.toLowerCase() === ct.id.toLowerCase()))
      .map((ct) => ({
        id: ct.id,
        label: ct.label,
        color: ct.color,
        icon: ct.icon || 'Target',
        isCustom: true,
      }));
    return [...base, ...extra];
  }, [customTags]);

  // Focus configuration derived from persistent store
  const selectedMinutes = focusSetup?.minutes ?? 25;
  const selectedTag = focusSetup?.tag ?? 'Belajar';
  const selectedSpecies = focusSetup?.species ?? 'oak';
  const isStrictMode = focusSetup?.strictMode ?? false;
  const taskNote = focusSetup?.taskNote ?? '';

  const [confirmingAbandon, setConfirmingAbandon] = useState<boolean>(false);

  // Modals: Tag Manager, Tree Species Picker, Ambient Soundscape, Custom Duration Scrubber
  const [showTagModal, setShowTagModal] = useState<boolean>(false);
  const [showSpeciesModal, setShowSpeciesModal] = useState<boolean>(false);
  const [showRulerModal, setShowRulerModal] = useState<boolean>(false);
  const [tagSearch, setTagSearch] = useState<string>('');
  const [newTagName, setNewTagName] = useState<string>('');
  const [newTagColor, setNewTagColor] = useState<string>(CUSTOM_TAG_COLORS[0]);
  const [newTagIcon, setNewTagIcon] = useState<string>('Target');

  // Harvest celebration modal & Ambient soundscape popover
  const [showHarvestModal, setShowHarvestModal] = useState<boolean>(false);
  const [showSoundscapePopover, setShowSoundscapePopover] = useState<boolean>(false);
  const [activeSoundscape, setActiveSoundscape] = useState<SoundscapeType>(soundscapeManager.getCurrentTrack());
  const [soundscapeVolume, setSoundscapeVolume] = useState<number>(soundscapeManager.getVolume());

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

    window.addEventListener('rimba:open_timer', handleOpenTimer);
    window.addEventListener('rimba:start_focus', handleStartFocusEvent);
    window.addEventListener('rimba:soundscape_change', handleSoundscapeEvt);
    window.addEventListener('rimba:open_harvest', handleHarvestEvt);
    return () => {
      window.removeEventListener('rimba:open_timer', handleOpenTimer);
      window.removeEventListener('rimba:start_focus', handleStartFocusEvent);
      window.removeEventListener('rimba:soundscape_change', handleSoundscapeEvt);
      window.removeEventListener('rimba:open_harvest', handleHarvestEvt);
    };
  }, [activeSession, onEnterZen, setZenMode, selectedMinutes, selectedTag, isStrictMode, selectedSpecies, taskNote, devFastMode]);

  // Local decoupled timer state (updates every 500ms)
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!activeSession) {
      setConfirmingAbandon(false);
      hasChimedRef.current = null;
      if (typeof document !== 'undefined') {
        document.title = 'Rimba — Fokus & Tumbuhkan Pulaumu';
      }
      return;
    }
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 500);
    return () => clearInterval(interval);
  }, [activeSession]);

  // Auto-reset 2-step abandon confirmation after 4 seconds
  useEffect(() => {
    if (!confirmingAbandon) return;
    const t = setTimeout(() => setConfirmingAbandon(false), 4000);
    return () => clearTimeout(t);
  }, [confirmingAbandon]);

  // Play gentle completion chime & update tab title when countdown reaches 00:00
  useEffect(() => {
    if (!activeSession || activeSession.status !== 'active') return;

    if (activeSession.is_stopwatch) {
      const startMs = new Date(activeSession.started_at).getTime();
      const elapsedSec = Math.floor(Math.max(0, now - startMs) / 1000);
      const m = Math.floor(elapsedSec / 60).toString().padStart(2, '0');
      const s = (elapsedSec % 60).toString().padStart(2, '0');
      if (typeof document !== 'undefined') {
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
        useGameStore.getState().notify('🌱 Waktu fokus selesai! Klik "Panen!" untuk menanam pohonmu.', 'success');
      }
      if (typeof document !== 'undefined') {
        document.title = '🌱 Pohon Siap Dipanen! — Rimba';
      }
    } else if (typeof document !== 'undefined') {
      const totalSec = Math.floor(remainingMs / 1000);
      const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
      const s = (totalSec % 60).toString().padStart(2, '0');
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

    const expectedEndAt = new Date(Date.now() + (isStopwatch ? 86400 : durationSec) * 1000);
    const speciesCfg = TREE_SPECIES_CONFIG.find((s) => s.id === selectedSpecies);

    startFocus(
      durationSec,
      selectedTag,
      isStrictMode,
      selectedSpecies,
      taskNote.trim() || undefined
    );

    // Cinematic camera zoom toward sapling tile
    const targetTile = findEmptyTileNearCenter(worldObjects, unlockedSet);
    if (targetTile && typeof window !== 'undefined') {
      const saplingWorldPos = gridToWorld(targetTile.grid_x, targetTile.grid_y, 0.05);
      window.dispatchEvent(
        new CustomEvent('rimba:camera_focus_target', {
          detail: { position: saplingWorldPos, distance: 7.0 },
        })
      );
    }

    if (!isStopwatch) {
      // Schedule background notification for iOS / native mobile
      scheduleFocusCompletionNotification({
        expectedEndAt,
        speciesName: speciesCfg?.name || 'Pohon Rimba',
        durationMinutes: Math.round(durationSec / 60),
      });
    }

    setFocusSetup({ taskNote: '' });
  };

  const handleAbandon = (isWithinGrace = false) => {
    // Within first 10 seconds: instant penalty-free cancel!
    if (isWithinGrace) {
      soundManager.playPop();
      hapticLight();
      setConfirmingAbandon(false);
      cancelPendingFocusNotifications();
      abandonFocus();
      return;
    }

    if (!confirmingAbandon) {
      soundManager.playPop();
      hapticWarning();
      setConfirmingAbandon(true);
      return;
    }
    setConfirmingAbandon(false);
    hapticWarning();
    cancelPendingFocusNotifications();
    abandonFocus();
  };

  const handleComplete = () => {
    soundManager.playPop();
    hapticLight();
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
  const currentTagInfo =
    allTags.find((t) => t.id === activeTagId) || {
      id: activeTagId,
      label: activeTagId,
      color: '#10B981',
      icon: 'Target',
      isCustom: true,
    };
  const currentSpeciesInfo =
    TREE_SPECIES_CONFIG.find((s) => s.id === (activeSession?.species || selectedSpecies)) ||
    TREE_SPECIES_CONFIG[0];

  const previewReward = calculateFocusRewards(selectedMinutes);
  const landProgressPct = Math.min(100, Math.round((previewReward.gold / zoneInfo.nextTileCost) * 100));

  // Tag Selection & Manager Modal
  const renderTagManagerModal = () => {
    if (!showTagModal) return null;
    const filteredTags = allTags.filter((t) =>
      t.label.toLowerCase().includes(tagSearch.trim().toLowerCase())
    );

    return (
      <div
        className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150 pointer-events-auto"
        onClick={() => setShowTagModal(false)}
      >
        <div
          className="w-full max-w-sm rounded-3xl bg-white/95 dark:bg-[#0D382C]/95 backdrop-blur-2xl p-5 border border-emerald-950/10 dark:border-white/20 shadow-2xl flex flex-col gap-3.5 text-[#1B4332] dark:text-white"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-2 border-b border-emerald-950/10 dark:border-white/15">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-bold text-[#1B4332] dark:text-white">Pilih Tag Kategori</span>
            </div>
            <button
              onClick={() => setShowTagModal(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 text-emerald-950/70 dark:text-white/80 active:scale-95 transition-all"
              aria-label="Tutup tag"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/5 dark:bg-black/25 border border-emerald-950/10 dark:border-white/15">
            <Search className="w-3.5 h-3.5 text-emerald-700/60 dark:text-emerald-300/70" />
            <input
              type="text"
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              placeholder="Cari tag fokus..."
              className="w-full bg-transparent text-xs text-[#1B4332] dark:text-white placeholder-emerald-900/40 dark:placeholder-white/45 outline-none font-medium"
            />
          </div>

          {/* Tag List with Color Dots */}
          <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
            {filteredTags.map((t) => {
              const isSelected = activeTagId === t.id;
              return (
                <div
                  key={t.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                      : 'bg-white/80 dark:bg-white/5 hover:bg-emerald-50 dark:hover:bg-white/10 border-emerald-950/10 dark:border-white/10 text-[#1B4332] dark:text-white/90'
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
                    className="flex items-center gap-2.5 flex-1 text-left"
                  >
                    <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-[#143525]/8 text-[#143525] dark:bg-white/10 dark:text-white flex-shrink-0">
                      <TagLineIcon name={t.icon} className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-xs font-bold truncate">{t.label}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    {t.isCustom && (
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playPop();
                          deleteCustomTag(t.id);
                          if (selectedTag === t.id) setFocusSetup({ tag: 'Belajar' });
                        }}
                        className="p-1 rounded-lg text-emerald-900/40 dark:text-white/40 hover:text-rose-500 hover:bg-rose-500/10"
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
          <div className="pt-2 border-t border-emerald-950/10 dark:border-white/15 flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              + Buat Tag Baru (Line Icon Hijau/Putih)
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
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
                    newTagIcon === key
                      ? 'bg-[#1E5638] text-white shadow-sm ring-2 ring-emerald-400 scale-105'
                      : 'bg-black/5 dark:bg-white/10 hover:bg-black/10 text-[#143525] dark:text-white'
                  }`}
                  title={key}
                >
                  <TagLineIcon name={key} className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
            {/* Color Swatches (Green & White only) */}
            <div className="flex items-center gap-2">
              {CUSTOM_TAG_COLORS.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setNewTagColor(col)}
                  className={`w-5 h-5 rounded-full border border-black/15 dark:border-white/20 transition-transform ${
                    newTagColor === col ? 'scale-125 ring-2 ring-emerald-600 dark:ring-white' : 'opacity-65 hover:opacity-100'
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
                className="flex-1 px-3 py-2 rounded-xl bg-black/5 dark:bg-black/25 border border-emerald-950/10 dark:border-white/15 text-xs text-[#1B4332] dark:text-white placeholder-emerald-900/40 dark:placeholder-white/45 outline-none font-medium"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newTagName.trim()) return;
                  soundManager.playPop();
                  const created = addCustomTag(newTagName.trim(), newTagColor, newTagIcon);
                  if (created) {
                    if (activeSession) {
                      updateActiveSessionMeta({ tag: created.id });
                    } else {
                      setFocusSetup({ tag: created.id });
                    }
                    setNewTagName('');
                    setShowTagModal(false);
                  }
                }}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-md active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
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
        className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150 pointer-events-auto"
        onClick={() => setShowSpeciesModal(false)}
      >
        <div
          className="w-full max-w-sm rounded-3xl bg-white/95 dark:bg-[#0D382C]/95 backdrop-blur-2xl p-5 border border-emerald-950/10 dark:border-white/20 shadow-2xl flex flex-col gap-3 text-[#1B4332] dark:text-white"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-2 border-b border-emerald-950/10 dark:border-white/15">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌲</span>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-[#1B4332] dark:text-white">Pilih Bibit Pohon Rimba</span>
                <span className="text-[10px] text-emerald-800/80 dark:text-emerald-300/80">Pohon yang akan mekar selama kamu fokus</span>
              </div>
            </div>
            <button
              onClick={() => setShowSpeciesModal(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 text-emerald-950/70 dark:text-white/80 active:scale-95 transition-all"
              aria-label="Tutup bibit pohon"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1">
            {TREE_SPECIES_CONFIG.map((sp) => {
              const isUnlocked = playerLevel >= sp.levelRequired;
              const isSelected = (activeSession?.species || selectedSpecies) === sp.id;
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
                  className={`p-2.5 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md ring-2 ring-emerald-400'
                      : isUnlocked
                      ? 'bg-white/80 dark:bg-white/10 border-emerald-950/10 dark:border-white/15 text-[#1B4332] dark:text-emerald-100 hover:bg-emerald-50/80'
                      : 'opacity-40 cursor-not-allowed bg-black/5 dark:bg-white/5 border-transparent text-emerald-950/40 dark:text-white/40'
                  }`}
                >
                  <span className="text-2xl p-1.5 rounded-xl bg-black/5 dark:bg-white/10 flex-shrink-0">
                    {sp.icon}
                  </span>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold truncate">{sp.name}</span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isUnlocked
                            ? isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300'
                            : 'bg-black/10 text-black/50 dark:text-white/50'
                        }`}
                      >
                        {isUnlocked ? 'Tersedia' : `Lvl ${sp.levelRequired}`}
                      </span>
                    </div>
                    <span className={`text-[11px] truncate mt-0.5 ${isSelected ? 'text-emerald-100' : 'opacity-70'}`}>
                      {sp.description}
                    </span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-white flex-shrink-0" />}
                  {!isUnlocked && <Lock className="w-3.5 h-3.5 text-black/40 dark:text-white/40 flex-shrink-0" />}
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
        className="fixed inset-0 z-[75] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150 pointer-events-auto"
        onClick={() => setShowSoundscapePopover(false)}
      >
        <div
          className="w-full max-w-xs rounded-3xl bg-white/95 dark:bg-[#0D382C]/95 backdrop-blur-2xl p-4 border border-emerald-950/10 dark:border-white/20 shadow-2xl flex flex-col gap-3 text-[#1B4332] dark:text-white"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-2 border-b border-emerald-950/10 dark:border-white/15">
            <div className="flex items-center gap-2">
              <Headphones className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold">Suara Latar Alam (Ambience)</span>
            </div>
            <button
              onClick={() => setShowSoundscapePopover(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 text-emerald-950/70 dark:text-white/80 active:scale-95 transition-all"
              aria-label="Tutup suara latar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => {
                soundManager.playPop();
                soundscapeManager.stop();
                setActiveSoundscape('off');
              }}
              className={`p-2 rounded-xl text-left text-xs font-bold border transition-all flex items-center gap-2 ${
                activeSoundscape === 'off'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                  : 'bg-black/5 dark:bg-white/5 border-emerald-950/10 dark:border-white/10 text-emerald-900/80 dark:text-white/70 hover:bg-emerald-50 dark:hover:bg-white/10'
              }`}
            >
              <VolumeX className="w-3.5 h-3.5 opacity-60" />
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
                      setActiveSoundscape('off');
                    } else {
                      soundscapeManager.play(sc.id);
                      setActiveSoundscape(sc.id);
                    }
                  }}
                  className={`p-2 rounded-xl text-left text-xs font-bold border transition-all flex items-center gap-2 ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm ring-1 ring-emerald-300'
                      : 'bg-black/5 dark:bg-white/5 border-emerald-950/10 dark:border-white/10 text-[#1B4332] dark:text-white/80 hover:bg-emerald-50 dark:hover:bg-white/10'
                  }`}
                >
                  <span className="text-base leading-none">{sc.icon}</span>
                  <span className="truncate">{sc.name}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-emerald-950/10 dark:border-white/15 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] text-emerald-800 dark:text-emerald-200">
              <span className="flex items-center gap-1 font-bold">
                <Volume2 className="w-3.5 h-3.5" />
                <span>Volume Alam</span>
              </span>
              <span className="font-mono font-bold">{Math.round(soundscapeVolume * 100)}%</span>
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
              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-black/10 dark:bg-white/20 rounded-lg"
              aria-label="Volume suara latar alam"
            />
          </div>
        </div>
      </div>
    );
  };

  // Horizontal Tick-Mark Ruler Scrubber
  const renderHorizontalRulerScrubber = () => (
    <div className="flex flex-col gap-2 p-3 rounded-2xl bg-black/5 dark:bg-black/25 border border-emerald-950/10 dark:border-white/15">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800/80 dark:text-emerald-200/80">
            Geser Durasi Fokus
          </span>
          <div className="flex items-baseline gap-1.5">
            {selectedMinutes === 0 ? (
              <span className="text-xl font-extrabold font-mono text-[#1B4332] dark:text-white flex items-center gap-1">
                <span>⏱️</span>
                <span>Bebas (Stopwatch)</span>
              </span>
            ) : (
              <>
                <span className="text-2xl font-extrabold font-mono text-[#1B4332] dark:text-white tabular-nums">
                  {selectedMinutes}
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-300">menit</span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end text-right">
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
            <span>+{previewReward.gold} Soul ✨</span>
            <span>•</span>
            <span className="text-teal-700 dark:text-teal-300">+{previewReward.xp} XP</span>
          </span>
          <span className="text-[10px] text-emerald-800/80 dark:text-emerald-200/80 flex items-center gap-1">
            <Maximize2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
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
                        ? 'w-2.5 h-2.5 bg-emerald-600 dark:bg-emerald-400 shadow-[0_0_8px_#10b981]'
                        : 'w-1.5 h-1.5 bg-emerald-950/30 dark:bg-white/40'
                    }`}
                  />
                ) : (
                  <div
                    className={`w-[2px] rounded-full transition-all ${
                      isActive
                        ? 'h-5 bg-emerald-600 dark:bg-emerald-400 shadow-[0_0_8px_#10b981]'
                        : isMajor
                        ? 'h-3.5 bg-emerald-950/40 dark:bg-white/60'
                        : 'h-2 bg-emerald-950/15 dark:bg-white/25'
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
          className="w-full accent-emerald-500 cursor-pointer h-2 bg-black/10 dark:bg-white/15 rounded-lg"
          aria-label="Penggaris durasi fokus (0 untuk stopwatch)"
        />
        <div className="flex justify-between text-[9px] font-mono text-emerald-950/60 dark:text-white/50 px-0.5 mt-0.5 font-bold">
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
        className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between border mt-0.5 ${
          isStrictMode
            ? 'bg-amber-500/15 border-amber-400/40 text-amber-300'
            : 'bg-black/5 dark:bg-white/5 border-emerald-950/10 dark:border-white/10 text-emerald-900/60 dark:text-emerald-300/60'
        }`}
      >
        <span className="flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5" />
          <span>Mode Ketat (Tenggang 10s)</span>
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/10 dark:bg-white/10">
          {isStrictMode ? 'Aktif' : 'Mati'}
        </span>
      </button>
    </div>
  );

  // Custom Duration Scrubber Modal
  const renderRulerModal = () => {
    if (!showRulerModal) return null;
    return (
      <div
        className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150 pointer-events-auto"
        onClick={() => setShowRulerModal(false)}
      >
        <div
          className="w-full max-w-xs rounded-3xl bg-white/95 dark:bg-[#0D382C]/95 backdrop-blur-2xl p-5 border border-emerald-950/10 dark:border-white/20 shadow-2xl flex flex-col gap-3 text-[#1B4332] dark:text-white"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-2 border-b border-emerald-950/10 dark:border-white/15">
            <span className="text-xs font-bold text-[#1B4332] dark:text-white">Atur Durasi Fokus</span>
            <button
              onClick={() => setShowRulerModal(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 text-emerald-950/70 dark:text-white/80 active:scale-95 transition-all"
              aria-label="Tutup atur durasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {renderHorizontalRulerScrubber()}
          <button
            onClick={() => setShowRulerModal(false)}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md active:scale-95 transition-all"
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
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('rimba:open_workshop'));
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
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {renderTagManagerModal()}
      <div
        className="fixed left-1/2 -translate-x-1/2 z-30 pointer-events-auto w-[92%] max-w-[390px] flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-300"
        style={{ bottom: 'max(env(safe-area-inset-bottom, 0px), 20px)' }}
      >
        {/* Sleek Apple-Style Liquid Glass Running Focus Capsule */}
        <div
          className="w-full h-[62px] px-4 rounded-full bg-white/60 backdrop-blur-2xl backdrop-saturate-180 border border-white/75 shadow-[0_16px_40px_rgba(10,40,25,0.08)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] text-[#0A3324] flex items-center justify-between gap-3 transition-all"
        >
          {/* SISI KIRI: Indikator & Timer Utama & Mini-Tag Kategori */}
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Pulsing emerald indicator */}
            <div className="relative flex items-center justify-center flex-shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute opacity-75" />
              <span className="w-2 h-2 rounded-full bg-emerald-500 relative" />
            </div>

            <button
              type="button"
              onClick={() => {
                soundManager.playPop();
                setShowTagModal(true);
              }}
              className="flex flex-col text-left leading-none min-w-0 active:scale-95 transition-transform cursor-pointer"
              title="Ketuk untuk mengganti Tag atau Bibit Pohon"
            >
              {/* Mini-Tag Kategori & Pohon */}
              <div className="flex items-center gap-1.5 min-w-0 mb-1">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0 ring-1 ring-black/10"
                  style={{ backgroundColor: currentTagInfo.color }}
                />
                <span className="text-[11px] font-bold tracking-tight text-[#166534] truncate max-w-[140px] flex items-center gap-1.5">
                  <TagLineIcon name={currentTagInfo.icon} className="w-3 h-3 text-[#166534] dark:text-emerald-300 flex-shrink-0" />
                  <span className="truncate">{currentTagInfo.label} • {currentSpeciesInfo.name}</span>
                </span>
                {activeSession.strict_mode && (
                  <span className="text-[9px] text-amber-500 font-bold" title="Mode Ketat Aktif">🔥</span>
                )}
              </div>

              {/* Timer Utama: Angka besar, tegas, dan elegan */}
              <span className="text-xl font-extrabold font-mono tracking-tight text-[#0A3324] tabular-nums">
                {activeSession.is_stopwatch ? `⏱️ ${formatTime(elapsedMs)}` : formatTime(remainingMs)}
              </span>
            </button>
          </div>

          {/* SISI KANAN: Kontrol Audio, Zen, dan Tombol Aksi */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Ambient Sound Button */}
            <button
              type="button"
              onClick={() => {
                soundManager.playPop();
                setShowSoundscapePopover(true);
              }}
              className={`w-[36px] h-[36px] rounded-full flex items-center justify-center text-xs transition-all active:scale-90 cursor-pointer border ${
                activeSoundscape !== 'off'
                  ? 'bg-emerald-500/20 text-emerald-800 border-emerald-400/50 shadow-xs'
                  : 'bg-white/80 hover:bg-[#20513B]/10 text-[#0A3324] border-white/80'
              }`}
              title="Atur Suara Alam"
              aria-label="Atur Suara Alam"
            >
              <Headphones className="w-4 h-4 stroke-[2.2]" />
            </button>

            {/* Zen Mode Button (Clean vector icon, no emoji) */}
            {onEnterZen && (
              <button
                type="button"
                onClick={() => {
                  soundManager.playPop();
                  onEnterZen();
                }}
                className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-xs transition-all active:scale-90 cursor-pointer border bg-white/80 hover:bg-[#20513B]/10 text-[#0A3324] border-white/80"
                title="Masuk ke Mode Zen (Layar Penuh)"
                aria-label="Masuk ke Mode Zen"
              >
                <Maximize2 className="w-3.5 h-3.5 stroke-[2.2]" />
              </button>
            )}

            {/* Action Button: Batal / Panen */}
            {isTimeReached || (activeSession.is_stopwatch && !isWithinGracePeriod) ? (
              <button
                type="button"
                onClick={handleComplete}
                className="h-[36px] px-3.5 rounded-full font-extrabold text-xs shadow-md shadow-emerald-700/25 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer bg-[#059669] hover:bg-[#047857] text-white"
              >
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                <span>{activeSession.is_stopwatch ? 'Selesai' : 'Panen!'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleAbandon(isWithinGracePeriod)}
                className={`h-[36px] px-3.5 rounded-full text-xs font-bold active:scale-95 transition-all flex items-center gap-1 border cursor-pointer ${
                  isWithinGracePeriod
                    ? 'bg-amber-100/90 text-amber-900 border-amber-300/80 shadow-xs'
                    : confirmingAbandon
                    ? 'bg-rose-600 text-white border-rose-400 shadow-md animate-pulse'
                    : 'bg-rose-50/90 hover:bg-rose-100 text-rose-700 border-rose-200/80'
                }`}
                title={
                  isWithinGracePeriod
                    ? `Masa tenggang ${graceSecondsLeft}s: Batalkan tanpa penalti`
                    : 'Menyerah'
                }
              >
                {isWithinGracePeriod ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                    <span>Batal ({graceSecondsLeft}s)</span>
                  </>
                ) : (
                  <span>{confirmingAbandon ? 'Yakin?' : 'Batal'}</span>
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
      {renderSoundscapePopover()}
    </>
  );
}

// Backward-compatible alias
export const FocusTimerCard = MobileFocusCard;
