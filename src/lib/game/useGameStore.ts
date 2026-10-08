import { create } from 'zustand';
import {
  CustomTagItem,
  FaunaSpecies,
  FocusSession,
  FocusTag,
  ObjectType,
  RimbaSaveData,
  TimeOfDay,
  TodoItem,
  TreeSpecies,
  WorldObject,
} from '@/types/game';
import { BUILD_CATALOG, CatalogItem, GAME_CONFIG, ATMOSPHERE_CONFIG, detectLocalTimeOfDay } from './config';
import { calculateBalances, canAfford, createLedgerEntry, getObjectBaseCost } from './economy';
import {
  abandonFocusSession,
  completeFocusSession,
  startFocusSession,
} from './sessionRules';
import {
  claimDailyQuest,
  claimAllClearDailyBonus,
} from './quests';
import { STORY_CHAPTERS } from './storyLore';
import { calculateAnalytics, toLocalDateString } from './analytics';
import { claimAchievementReward } from './achievements';
import { greetFauna, FAUNA_CONFIG } from './faunaRules';
import {
  executeReclamation,
  restoreObject,
  triggerBulldozerReclamation,
  canExecuteBulldozerTier2,
  bribeBulldozer,
  dismissBulldozerViaFocus,
} from './reclamation';
import {
  isTileOccupied,
  isValidCoord,
  getUnlockedTilesSet,
  isTileUnlocked,
  canUnlockTile,
  findEmptyTileNearCenter,
  getLandExpansionZoneInfo,
} from './worldRules';
import { createInitialSaveData, loadSaveData, saveSaveData } from './storage';
import { requestScreenWakeLock, releaseScreenWakeLock } from '@/lib/mobile/nativeBridge';

export interface NotificationState {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'reclamation';
}

interface GameState {
  saveData: RimbaSaveData;
  activeSession: FocusSession | null;
  selectedTool: ObjectType | null;
  selectedCatalogItem: CatalogItem | null;
  selectedObject: WorldObject | null;
  hoveredGridTile: { grid_x: number; grid_y: number } | null;
  devFastMode: boolean;
  isInitialized: boolean;
  notification: NotificationState | null;
  backgroundTheme: 'cream' | 'matcha';
  grassPalette: 'natural' | 'emerald';
  timeOfDay: TimeOfDay;
  isTimeAuto: boolean;
  placementRotation: number;
  relocatingObjectId: string | null;
  isTabBlurred: boolean;
  isGridVisible: boolean;
  isExpandLandMode: boolean;
  selectedFauna: FaunaSpecies | null;
  isZenMode: boolean;
  focusSetup: {
    minutes: number;
    tag: FocusTag;
    species: TreeSpecies;
    strictMode: boolean;
    taskNote: string;
  };

  // Actions
  setFocusSetup: (
    updates: Partial<{
      minutes: number;
      tag: FocusTag;
      species: TreeSpecies;
      strictMode: boolean;
      taskNote: string;
    }>
  ) => void;
  init: () => void;
  toggleGrid: () => void;
  setZenMode: (val: boolean) => void;
  toggleZenMode: () => void;
  setIsExpandLandMode: (active: boolean) => void;
  unlockLandTile: (grid_x: number, grid_y: number) => boolean;
  setSelectedFauna: (species: FaunaSpecies | null) => void;
  greetAnimal: (species: FaunaSpecies) => { success: boolean; gold: number; xp: number; message: string };
  setDevFastMode: (enabled: boolean) => void;
  setBackgroundTheme: (theme: 'cream' | 'matcha') => void;
  toggleBackgroundTheme: () => void;
  setGrassPalette: (palette: 'natural' | 'emerald') => void;
  setTimeOfDay: (time: TimeOfDay) => void;
  toggleTimeOfDay: () => void;
  setAutoTime: (enabled: boolean) => void;
  setTabBlurred: (blurred: boolean) => void;
  rotatePlacement: () => void;
  setSelectedTool: (tool: ObjectType | null) => void;
  setSelectedCatalogItem: (item: CatalogItem | null) => void;
  setSelectedObject: (object: WorldObject | null) => void;
  setHoveredGridTile: (tile: { grid_x: number; grid_y: number } | null) => void;
  startRelocatingObject: (objectId: string) => void;
  confirmRelocation: (grid_x: number, grid_y: number) => boolean;
  cancelRelocation: () => void;
  removeObject: (objectId: string) => boolean;
  startFocus: (
    customDurationSec?: number,
    tag?: FocusTag,
    strictMode?: boolean,
    species?: TreeSpecies,
    taskNote?: string,
    todoId?: string
  ) => void;
  updateActiveSessionMeta: (updates: { tag?: FocusTag; task_note?: string }) => void;
  addCustomTag: (label: string, color?: string, icon?: string) => CustomTagItem | null;
  deleteCustomTag: (tagId: string) => void;
  setDistractionSource: (source: string) => void;
  setProfileName: (name: string) => void;
  markPioneerStepDone: (stepId: string) => void;
  claimPioneerMysteryReward: () => boolean;
  abandonFocus: () => void;
  completeFocus: () => boolean;
  addTodo: (text: string, tag?: FocusTag) => TodoItem | null;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  claimQuest: (questId: string) => boolean;
  claimAllClearBonus: () => boolean;
  claimAchievement: (achievementId: string) => boolean;
  updateSessionNote: (sessionId: string, note: string) => void;
  buyStreakShield: () => boolean;
  claimStoryChapter: (chapterId: string) => boolean;
  placeObject: (type: ObjectType, grid_x: number, grid_y: number) => boolean;
  placeCatalogItem: (item: CatalogItem, grid_x: number, grid_y: number) => boolean;
  restoreReclaimedObject: (objectId: string) => boolean;
  bribeBulldozerCrew: () => boolean;
  checkReclamation: () => void;
  simulateInactivity: (hours: number) => void;
  addDevGold: (amount: number) => void;
  loadThrivingPreset: () => void;
  resetWorld: () => void;
  resetToStarterHub: () => void;
  importSaveData: (data: RimbaSaveData) => boolean;
  dismissNotification: () => void;
  notify: (message: string, type?: NotificationState['type']) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  saveData: createInitialSaveData(),
  activeSession: null,
  selectedTool: null,
  selectedCatalogItem: null,
  selectedObject: null,
  hoveredGridTile: null,
  devFastMode: false,
  isInitialized: false,
  notification: null,
  backgroundTheme: 'cream',
  grassPalette: 'natural',
  timeOfDay: 'day',
  isTimeAuto: true,
  placementRotation: 0,
  relocatingObjectId: null,
  isTabBlurred: false,
  isGridVisible: false,
  isExpandLandMode: false,
  selectedFauna: null,
  isZenMode: false,
  focusSetup: {
    minutes: 25,
    tag: 'Belajar',
    species: 'oak',
    strictMode: false,
    taskNote: '',
  },

  setFocusSetup: (updates) =>
    set((state) => ({ focusSetup: { ...state.focusSetup, ...updates } })),

  setZenMode: (val) => set({ isZenMode: val }),
  toggleZenMode: () => set((state) => ({ isZenMode: !state.isZenMode })),

  toggleGrid: () => set((state) => ({ isGridVisible: !state.isGridVisible })),

  setIsExpandLandMode: (active) =>
    set({
      isExpandLandMode: active,
      selectedTool: null,
      selectedCatalogItem: null,
      selectedObject: null,
      relocatingObjectId: null,
    }),

  unlockLandTile: (grid_x, grid_y) => {
    const { saveData } = get();
    const unlockedSet = getUnlockedTilesSet(saveData.world, saveData.world_objects);

    if (!canUnlockTile(grid_x, grid_y, unlockedSet)) {
      get().notify('Hanya bisa membuka petak yang bersinggungan langsung dengan lahan aktif!', 'error');
      return false;
    }

    const zoneInfo = getLandExpansionZoneInfo(unlockedSet.size);
    const cost = zoneInfo.nextTileCost;
    if (!canAfford(saveData.currency_ledger, cost)) {
      get().notify(`Soul tidak cukup! Membuka petak di ${zoneInfo.shortZoneName} butuh ${cost} Soul.`, 'error');
      return false;
    }

    const coordKey = `${grid_x},${grid_y}`;
    const ledgerEntry = createLedgerEntry(
      'gold',
      -cost,
      'expand_land_tile',
      coordKey
    );

    const currentUnlocked = Array.from(unlockedSet);
    currentUnlocked.push(coordKey);
    const newCount = currentUnlocked.length;

    const existingPioneer = new Set(saveData.pioneer_completed_ids || []);
    existingPioneer.add('expand_land');

    const updatedData: RimbaSaveData = {
      ...saveData,
      world: {
        ...saveData.world,
        unlocked_tiles: currentUnlocked,
        last_expanded_tile: coordKey,
      },
      currency_ledger: [...saveData.currency_ledger, ledgerEntry],
      pioneer_completed_ids: Array.from(existingPioneer),
    };

    saveSaveData(updatedData);
    set({ saveData: updatedData });

    if (newCount === 25) {
      get().notify(
        `🌊 Milestone 25 Petak (5×5)! Kamu memasuki Zona 2: Lembah Sungai! Jalur sungai & jembatan kini siap ditata.`,
        'success'
      );
    } else if (newCount === 49) {
      get().notify(
        `👑 Milestone 49 Petak (7×7)! Kamu memasuki Zona 3: Rimba Raya! Area pesisir & pohon leluhur menanti.`,
        'success'
      );
    } else if (newCount === 100) {
      get().notify(
        `🏆 KEDAULATAN PENUH 10×10 (100 Petak)! Seluruh Pulau Rimba telah terbuka sempurna!`,
        'success'
      );
    } else {
      get().notify(
        `🌱 Petak (${grid_x},${grid_y}) bangkit dari air! (${newCount}/${zoneInfo.zoneTargetTiles} Petak ${zoneInfo.shortZoneName} • -${cost} Soul)`,
        'success'
      );
    }
    return true;
  },

  setSelectedFauna: (species) => set({ selectedFauna: species }),

  greetAnimal: (species) => {
    const { saveData, timeOfDay } = get();
    const result = greetFauna(species, saveData, timeOfDay);

    if (!result.ok) {
      get().notify(result.message, 'error');
      return { success: false, gold: 0, xp: 0, message: result.message };
    }

    saveSaveData(result.updatedSaveData);
    set({ saveData: result.updatedSaveData });
    get().notify(result.message, 'success');
    return { success: true, gold: result.goldEarned, xp: result.xpEarned, message: result.message };
  },

  setTabBlurred: (blurred) => set({ isTabBlurred: blurred }),

  rotatePlacement: () => {
    set((state) => {
      const next = (state.placementRotation + Math.PI / 2) % (Math.PI * 2);
      const degrees = Math.round((next * 180) / Math.PI);
      get().notify(`Rotasi Objek: ${degrees}° ↺`, 'info');
      return { placementRotation: next };
    });
  },

  startRelocatingObject: (objectId) => {
    const { saveData } = get();
    const target = saveData.world_objects.find((o) => o.id === objectId);
    if (!target) return;

    set({
      relocatingObjectId: objectId,
      selectedObject: null,
      selectedTool: null,
      selectedCatalogItem: null,
      placementRotation: target.rotation || 0,
    });
    get().notify(
      `Pindahkan ${target.object_type}: Klik petak kosong baru untuk menaruh (Tekan R untuk putar, Esc untuk batal)`,
      'info'
    );
  },

  cancelRelocation: () => {
    if (get().relocatingObjectId) {
      set({ relocatingObjectId: null });
      get().notify('Pemindahan objek dibatalkan.', 'info');
    }
  },

  confirmRelocation: (grid_x, grid_y) => {
    const { saveData, relocatingObjectId, placementRotation } = get();
    if (!relocatingObjectId) return false;

    if (!isValidCoord(grid_x, grid_y)) {
      get().notify('Posisi grid di luar batas!', 'error');
      return false;
    }

    const unlockedSet = getUnlockedTilesSet(saveData.world, saveData.world_objects);
    if (!isTileUnlocked(grid_x, grid_y, unlockedSet)) {
      get().notify('Objek hanya bisa dipindah ke petak lahan yang sudah dibuka!', 'error');
      return false;
    }

    // Check collision against all OTHER objects
    const otherObjects = saveData.world_objects.filter((o) => o.id !== relocatingObjectId);
    if (isTileOccupied(grid_x, grid_y, otherObjects)) {
      get().notify('Petak tersebut sudah terisi objek lain!', 'error');
      return false;
    }

    const updatedObjects = saveData.world_objects.map((obj) => {
      if (obj.id === relocatingObjectId) {
        return {
          ...obj,
          grid_x,
          grid_y,
          rotation: placementRotation,
        };
      }
      return obj;
    });

    const updatedData: RimbaSaveData = {
      ...saveData,
      world_objects: updatedObjects,
    };

    saveSaveData(updatedData);
    set({
      saveData: updatedData,
      relocatingObjectId: null,
    });

    get().notify('🌿 Posisi objek berhasil dipindahkan (Gratis)!', 'success');
    return true;
  },

  removeObject: (objectId) => {
    const { saveData } = get();
    const target = saveData.world_objects.find((o) => o.id === objectId);
    if (!target) {
      get().notify('Objek tidak ditemukan.', 'error');
      return false;
    }

    // 50% Gold refund
    const baseCost = getObjectBaseCost(target);
    const refund = Math.max(1, Math.floor(baseCost * 0.5));

    const ledgerEntry = createLedgerEntry(
      'gold',
      refund,
      'demolish_refund',
      objectId
    );

    const updatedObjects = saveData.world_objects.filter((o) => o.id !== objectId);
    const updatedLedger = [...saveData.currency_ledger, ledgerEntry];

    const updatedData: RimbaSaveData = {
      ...saveData,
      world_objects: updatedObjects,
      currency_ledger: updatedLedger,
    };

    saveSaveData(updatedData);
    set({
      saveData: updatedData,
      selectedObject: null,
    });

    get().notify(
      `🗑️ Objek ${target.object_type} dihapus. Energi dikembalikan +${refund} Soul (50% refund)! ✨`,
      'success'
    );
    return true;
  },

  init: () => {
    if (get().isInitialized) return;

    const data = loadSaveData();
    const active = data.focus_sessions.find((s) => s.status === 'active') || null;

    let savedTheme: 'cream' | 'matcha' = 'cream';
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('rimba_bg_theme');
      if (stored === 'cream' || stored === 'matcha') {
        savedTheme = stored;
      }
    }

    let initialTime: TimeOfDay = detectLocalTimeOfDay();
    let isAuto = true;
    if (typeof window !== 'undefined') {
      const storedTime = localStorage.getItem('rimba_time_of_day');
      if (storedTime === 'day' || storedTime === 'sunset' || storedTime === 'night') {
        initialTime = storedTime as TimeOfDay;
        isAuto = false;
      }
    }

    let savedGrass: 'natural' | 'emerald' = 'natural';
    if (typeof window !== 'undefined') {
      const storedGrass = localStorage.getItem('rimba_grass_palette');
      if (storedGrass === 'natural' || storedGrass === 'emerald') {
        savedGrass = storedGrass;
      }
    }

    // Auto-rescue check for Streak Shield
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = toLocalDateString(yesterday);
    const dayBefore = new Date(now);
    dayBefore.setDate(dayBefore.getDate() - 2);
    const dayBeforeStr = toLocalDateString(dayBefore);

    const analyticsBefore = calculateAnalytics(data.focus_sessions, yesterday, data.used_shield_dates || []);
    const hadActiveDayBefore = (analyticsBefore.activityMap[dayBeforeStr]?.sessionCount || 0) > 0;
    const missingYesterday = !analyticsBefore.activityMap[yesterdayStr];
    const alreadyShielded = (data.used_shield_dates || []).includes(yesterdayStr);

    if (hadActiveDayBefore && missingYesterday && !alreadyShielded && (data.streak_shields || 0) > 0) {
      const updatedShields = (data.streak_shields || 0) - 1;
      const updatedUsedDates = [...(data.used_shield_dates || []), yesterdayStr];
      data.streak_shields = updatedShields;
      data.used_shield_dates = updatedUsedDates;
      saveSaveData(data);
      get().notify(
        `🛡️ Embun Pelindung aktif! Absen kemarin dimaafkan, streak harianmu tetap utuh! (Sisa perisai: ${updatedShields})`,
        'success'
      );
    }

    set({
      saveData: data,
      activeSession: active,
      backgroundTheme: savedTheme,
      grassPalette: savedGrass,
      timeOfDay: initialTime,
      isTimeAuto: isAuto,
      isInitialized: true,
    });

    get().checkReclamation();
  },

  setGrassPalette: (palette) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('rimba_grass_palette', palette);
    }
    set({ grassPalette: palette });
  },

  setBackgroundTheme: (theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('rimba_bg_theme', theme);
    }
    set({ backgroundTheme: theme });
  },

  toggleBackgroundTheme: () => {
    const current = get().backgroundTheme;
    const nextTheme = current === 'cream' ? 'matcha' : 'cream';
    if (typeof window !== 'undefined') {
      localStorage.setItem('rimba_bg_theme', nextTheme);
    }
    set({ backgroundTheme: nextTheme });
    get().notify(
      nextTheme === 'cream'
        ? '🌾 Nuansa Warm Cream Oat aktif (hangat & nyaman mata)'
        : '🍵 Nuansa Calm Soft Matcha aktif (sejuk & rileks)',
      'info'
    );
  },

  setTimeOfDay: (time) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('rimba_time_of_day', time);
    }
    set({ timeOfDay: time, isTimeAuto: false });
    const cfg = ATMOSPHERE_CONFIG[time];
    get().notify(`${cfg.icon} Suasana ${cfg.name} aktif`, 'info');
  },

  toggleTimeOfDay: () => {
    const current = get().timeOfDay;
    const next: TimeOfDay = current === 'day' ? 'sunset' : current === 'sunset' ? 'night' : 'day';
    if (typeof window !== 'undefined') {
      localStorage.setItem('rimba_time_of_day', next);
    }
    set({ timeOfDay: next, isTimeAuto: false });
    const cfg = ATMOSPHERE_CONFIG[next];
    get().notify(`${cfg.icon} Suasana ${cfg.name} aktif`, 'info');
  },

  setAutoTime: (enabled) => {
    if (typeof window !== 'undefined') {
      if (enabled) {
        localStorage.removeItem('rimba_time_of_day');
      }
    }
    const detected = detectLocalTimeOfDay();
    set({ timeOfDay: enabled ? detected : get().timeOfDay, isTimeAuto: enabled });
    if (enabled) {
      const cfg = ATMOSPHERE_CONFIG[detected];
      get().notify(`🕒 Mode Waktu Otomatis Aktif (${cfg.icon} ${cfg.name})`, 'info');
    }
  },

  setDevFastMode: (enabled) => {
    set({ devFastMode: enabled });
    get().notify(
      enabled
        ? 'Dev Fast Mode active: 10s focus & 5m reclamation.'
        : 'Standard Mode active: 25m focus & 48h reclamation.',
      'info'
    );
  },

  setSelectedTool: (tool) => {
    if (!tool) {
      set({ selectedTool: null, selectedCatalogItem: null });
      return;
    }
    const defaultItem = BUILD_CATALOG.find((c) => c.type === tool) || null;
    set({
      selectedTool: tool,
      selectedCatalogItem: defaultItem,
      selectedObject: null,
      isExpandLandMode: false,
      relocatingObjectId: null,
    });
  },

  setSelectedCatalogItem: (item) => {
    if (!item) {
      set({ selectedTool: null, selectedCatalogItem: null });
    } else {
      set({
        selectedTool: item.type,
        selectedCatalogItem: item,
        selectedObject: null,
        isExpandLandMode: false,
        relocatingObjectId: null,
      });
    }
  },

  setSelectedObject: (object) => {
    set((state) => ({
      selectedObject: object,
      selectedTool: null,
      selectedCatalogItem: null,
      isExpandLandMode: object ? false : state.isExpandLandMode,
      relocatingObjectId: object ? null : state.relocatingObjectId,
    }));
  },

  setHoveredGridTile: (tile) => {
    const prev = get().hoveredGridTile;
    if (prev === null && tile === null) return;
    if (prev && tile && prev.grid_x === tile.grid_x && prev.grid_y === tile.grid_y) {
      return;
    }
    set({ hoveredGridTile: tile });
  },

  notify: (message, type = 'info') => {
    set({
      notification: {
        id: `${Date.now()}_${Math.random()}`,
        message,
        type,
      },
    });
  },

  dismissNotification: () => {
    set({ notification: null });
  },

  startFocus: (customDurationSec, tag, strictMode, species, taskNote, todoId) => {
    const { activeSession, devFastMode, saveData, focusSetup } = get();
    if (activeSession && activeSession.status === 'active') {
      get().notify('Sesi fokus sedang berjalan.', 'error');
      return;
    }

    const finalTag = tag ?? focusSetup?.tag ?? 'Belajar';
    const finalSpecies = species ?? focusSetup?.species ?? 'oak';
    const finalStrictMode = strictMode ?? focusSetup?.strictMode ?? false;
    const finalTaskNote = taskNote ?? (focusSetup?.taskNote?.trim() || undefined);

    const isStopwatch =
      customDurationSec === 0 ||
      (customDurationSec === undefined && !devFastMode && focusSetup?.minutes === 0);

    const duration =
      customDurationSec !== undefined
        ? (customDurationSec === 0 ? 86400 : customDurationSec)
        : devFastMode
        ? GAME_CONFIG.focus.devFastDurationSec
        : focusSetup?.minutes !== undefined
        ? (focusSetup.minutes === 0 ? 86400 : focusSetup.minutes * 60)
        : GAME_CONFIG.focus.defaultDurationSec;

    const newSession = startFocusSession({
      durationSeconds: duration,
      tag: finalTag,
      species: finalSpecies,
      strictMode: finalStrictMode,
      taskNote: finalTaskNote,
      todoId,
      isStopwatch,
    });

    const updatedData: RimbaSaveData = {
      ...saveData,
      focus_sessions: [...saveData.focus_sessions, newSession],
    };

    saveSaveData(updatedData);
    requestScreenWakeLock();
    set({
      saveData: updatedData,
      activeSession: newSession,
      selectedTool: null,
      selectedCatalogItem: null,
      selectedObject: null,
      isExpandLandMode: false,
      relocatingObjectId: null,
      isTabBlurred: false,
    });

    const mins = Math.max(1, Math.round(duration / 60));
    const modeLabel = strictMode ? ' [Mode Ketat 🔥]' : '';
    const taskLabel = newSession.task_note ? ` — "${newSession.task_note}"` : '';
    if (isStopwatch) {
      get().notify(`Sesi fokus ${finalTag} dimulai (Mode Stopwatch ⏱️)${modeLabel}${taskLabel}. Fokus mengalir bebas!`, 'info');
    } else {
      get().notify(`Sesi fokus ${finalTag} dimulai (${mins} menit)${modeLabel}${taskLabel}. Tumbuhkan pohonmu!`, 'info');
    }
  },

  updateActiveSessionMeta: (updates) => {
    const { activeSession, saveData } = get();
    if (!activeSession || activeSession.status !== 'active') return;

    const updatedSession: FocusSession = {
      ...activeSession,
      ...(updates.tag !== undefined ? { tag: updates.tag } : {}),
      ...(updates.task_note !== undefined ? { task_note: updates.task_note.trim() || undefined } : {}),
    };

    const updatedSessions = saveData.focus_sessions.map((s) =>
      s.id === updatedSession.id ? updatedSession : s
    );

    const updatedData: RimbaSaveData = {
      ...saveData,
      focus_sessions: updatedSessions,
    };

    saveSaveData(updatedData);
    set({
      saveData: updatedData,
      activeSession: updatedSession,
    });
  },

  addCustomTag: (label, color = '#10B981', icon = 'Target') => {
    const clean = label.trim();
    if (!clean) return null;
    const { saveData } = get();
    const existing = saveData.custom_tags || [];
    if (existing.some((t) => t.label.toLowerCase() === clean.toLowerCase())) {
      get().notify(`Tag "${clean}" sudah ada.`, 'info');
      return existing.find((t) => t.label.toLowerCase() === clean.toLowerCase()) || null;
    }

    const newTag: CustomTagItem = {
      id: clean,
      label: clean,
      color,
      icon,
    };

    const updatedData: RimbaSaveData = {
      ...saveData,
      custom_tags: [...existing, newTag],
    };
    saveSaveData(updatedData);
    set({ saveData: updatedData });
    get().notify(`🏷️ Tag baru "${clean}" ditambahkan!`, 'success');
    return newTag;
  },

  deleteCustomTag: (tagId) => {
    const { saveData } = get();
    const existing = saveData.custom_tags || [];
    const updatedData: RimbaSaveData = {
      ...saveData,
      custom_tags: existing.filter((t) => t.id !== tagId),
    };
    saveSaveData(updatedData);
    set({ saveData: updatedData });
    get().notify(`Tag "${tagId}" dihapus.`, 'info');
  },

  setDistractionSource: (source) => {
    const { saveData } = get();
    const updatedData: RimbaSaveData = {
      ...saveData,
      distraction_source: source,
    };
    saveSaveData(updatedData);
    set({ saveData: updatedData });
  },

  setProfileName: (name: string) => {
    const { saveData } = get();
    const cleanName = name.trim();
    if (!cleanName) return;
    const updatedData: RimbaSaveData = {
      ...saveData,
      profile: {
        ...saveData.profile,
        name: cleanName,
      },
      world: {
        ...saveData.world,
        name: `Suaka ${cleanName}`,
      },
    };
    saveSaveData(updatedData);
    set({ saveData: updatedData });
  },

  markPioneerStepDone: (stepId) => {
    const { saveData } = get();
    const current = new Set(saveData.pioneer_completed_ids || []);
    if (current.has(stepId)) return;
    current.add(stepId);
    const updatedData: RimbaSaveData = {
      ...saveData,
      pioneer_completed_ids: Array.from(current),
    };
    saveSaveData(updatedData);
    set({ saveData: updatedData });
  },

  claimPioneerMysteryReward: () => {
    const { saveData } = get();
    if (saveData.pioneer_reward_claimed) {
      get().notify('Hadiah Misterius Perintis sudah pernah diklaim!', 'info');
      return false;
    }

    const unlockedSet = getUnlockedTilesSet(saveData.world, saveData.world_objects);
    const emptyTile = findEmptyTileNearCenter(saveData.world_objects, unlockedSet);

    const goldEntry = createLedgerEntry('gold', 50, 'pioneer_mystery_reward', 'pioneer_grand');
    const xpEntry = createLedgerEntry('xp', 250, 'pioneer_mystery_reward', 'pioneer_grand');

    const newObjects = [...saveData.world_objects];
    if (emptyTile) {
      newObjects.push({
        id: `obj_landmark_pioneer_${Date.now()}`,
        object_type: 'tree',
        grid_x: emptyTile.grid_x,
        grid_y: emptyTile.grid_y,
        rotation: 0,
        scale: 1.25,
        status: 'active',
        created_at: new Date().toISOString(),
        reclaimed_at: null,
        model_variant: 'tree_detailed',
        species: 'ancient',
        task_note: 'Pohon Leluhur Sakral (Hadiah Perintis Pulau Rimba)',
      });
    }

    const updatedData: RimbaSaveData = {
      ...saveData,
      world_objects: newObjects,
      currency_ledger: [...saveData.currency_ledger, goldEntry, xpEntry],
      pioneer_reward_claimed: true,
    };

    saveSaveData(updatedData);
    set({ saveData: updatedData });
    get().notify(
      '🎁 SELAMAT! Kamu membuka Hadiah Misterius Perintis: Pohon Leluhur Sakral (Ancient Elder Oak) + 50 Soul + 250 XP!',
      'success'
    );
    return true;
  },

  abandonFocus: () => {
    const { activeSession, saveData } = get();
    if (!activeSession || activeSession.status !== 'active') return;

    const elapsedSec = (Date.now() - new Date(activeSession.started_at).getTime()) / 1000;
    const isWithinGracePeriod = elapsedSec <= 10.5;

    // If cancelled within the 10-second grace period (#42): remove session cleanly with ZERO penalty!
    if (isWithinGracePeriod) {
      const filteredSessions = saveData.focus_sessions.filter((s) => s.id !== activeSession.id);
      const updatedData: RimbaSaveData = {
        ...saveData,
        focus_sessions: filteredSessions,
      };
      saveSaveData(updatedData);
      releaseScreenWakeLock();
      set({
        saveData: updatedData,
        activeSession: null,
        isZenMode: false,
      });
      get().notify('Sesi dibatalkan dalam masa tenggang 10 detik (Bebas Penalti).', 'info');
      return;
    }

    // If abandoned AFTER 10 seconds: record abandoned session AND spawn a Withered Stump (nature_stump) on the island!
    const abandoned = abandonFocusSession(activeSession);

    const updatedSessions = saveData.focus_sessions.map((s) =>
      s.id === abandoned.id ? abandoned : s
    );

    const unlockedSet = getUnlockedTilesSet(saveData.world, saveData.world_objects);
    const emptyTile = findEmptyTileNearCenter(saveData.world_objects, unlockedSet);
    const updatedObjects = [...saveData.world_objects];

    if (emptyTile) {
      updatedObjects.push({
        id: `obj_stump_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        object_type: 'rock',
        grid_x: emptyTile.grid_x,
        grid_y: emptyTile.grid_y,
        rotation: Math.floor(Math.random() * 4) * (Math.PI / 2),
        scale: 1.0,
        status: 'reclaimed',
        created_at: new Date().toISOString(),
        reclaimed_at: new Date().toISOString(),
        model_variant: 'nature_stump',
        species: activeSession.species || 'oak',
        task_note: activeSession.task_note || 'Sesi fokus terputus (Tunggul Layu)',
        focus_tag: activeSession.tag,
      });
    }

    const updatedData: RimbaSaveData = {
      ...saveData,
      focus_sessions: updatedSessions,
      world_objects: updatedObjects,
    };

    saveSaveData(updatedData);
    releaseScreenWakeLock();
    set({
      saveData: updatedData,
      activeSession: null,
      isZenMode: false,
    });

    get().notify(
      emptyTile
        ? `🥀 Kamu menyerah setelah masa tenggang. Tunggul Layu muncul di petak (${emptyTile.grid_x},${emptyTile.grid_y}) — ketuk tunggul untuk merestorasinya!`
        : '🥀 Sesi fokus dihentikan. Bibit pohon layu tanpa menghasilkan hadiah.',
      'error'
    );
  },

  completeFocus: () => {
    const { activeSession, saveData } = get();
    if (!activeSession) {
      get().notify('Tidak ada sesi fokus aktif untuk diselesaikan.', 'error');
      return false;
    }

    const unlockedSet = getUnlockedTilesSet(saveData.world, saveData.world_objects);
    const result = completeFocusSession(activeSession, saveData.world_objects, unlockedSet);
    if (!result.success) {
      get().notify(result.error || 'Gagal menyelesaikan sesi fokus.', 'error');
      return false;
    }

    const updatedSessions = saveData.focus_sessions.map((s) =>
      s.id === result.updatedSession.id ? result.updatedSession : s
    );

    const updatedObjects = result.newWorldObject
      ? [...saveData.world_objects, result.newWorldObject]
      : saveData.world_objects;

    const updatedLedger = [...saveData.currency_ledger, ...result.newLedgerEntries];

    // Auto-complete linked To-Do item if present
    let updatedTodos = saveData.todos;
    if (saveData.todos && saveData.todos.length > 0) {
      if (activeSession.todo_id) {
        updatedTodos = saveData.todos.map((t) =>
          t.id === activeSession.todo_id
            ? { ...t, completed: true, completed_at: result.updatedSession.completed_at }
            : t
        );
      } else if (activeSession.task_note) {
        const normalizedNote = activeSession.task_note.trim().toLowerCase();
        let matched = false;
        updatedTodos = saveData.todos.map((t) => {
          if (!matched && !t.completed && t.text.trim().toLowerCase() === normalizedNote) {
            matched = true;
            return { ...t, completed: true, completed_at: result.updatedSession.completed_at };
          }
          return t;
        });
      }
    }

    // If bulldozer threat is active or tiles were sealed by Bulldozer, mindful focus chases the crew away & unseals tiles!
    let finalObjects = updatedObjects;
    let finalWorld = {
      ...saveData.world,
      ...result.updatedWorld,
    };
    let chasedBulldozer = false;

    const hadBulldozerOrSeal =
      Boolean(saveData.world.bulldozer && saveData.world.bulldozer.active) ||
      Boolean(saveData.world.sealed_tiles && saveData.world.sealed_tiles.length > 0);

    if (hadBulldozerOrSeal) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('rimba:bulldozer_retreat'));
      }
      const dismissed = dismissBulldozerViaFocus(finalObjects, saveData.world.bulldozer);
      finalObjects = dismissed.updatedObjects;
      finalWorld = { ...finalWorld, ...dismissed.updatedWorld };
      chasedBulldozer = true;
    }

    const pioneerSet = new Set(saveData.pioneer_completed_ids || []);
    pioneerSet.add('first_focus');
    if (activeSession.strict_mode) {
      pioneerSet.add('strict_focus');
    }

    const updatedData: RimbaSaveData = {
      ...saveData,
      world: finalWorld,
      focus_sessions: updatedSessions,
      world_objects: finalObjects,
      currency_ledger: updatedLedger,
      todos: updatedTodos,
      pioneer_completed_ids: Array.from(pioneerSet),
    };

    saveSaveData(updatedData);
    releaseScreenWakeLock();
    set({
      saveData: updatedData,
      activeSession: null,
      isZenMode: false,
    });

    const earnedGold = result.rewardGold || GAME_CONFIG.focus.baseGold;
    const earnedXp = result.rewardXp || GAME_CONFIG.focus.baseXp;

    get().notify(
      chasedBulldozer
        ? `🎉 Fokus tuntas! Ketekunanmu menghalau kru Bulldozer & membuka segel petak pulau! (+${earnedGold} Soul & +${earnedXp} XP)`
        : `🎉 Fokus selesai! Kamu meraih +${earnedGold} Soul & +${earnedXp} XP. Pohon baru tumbuh di pulaumu!`,
      'success'
    );
    return true;
  },

  placeCatalogItem: (item, grid_x, grid_y) => {
    const { saveData } = get();

    if (!isValidCoord(grid_x, grid_y)) {
      get().notify('Posisi petak di luar batas pulau.', 'error');
      return false;
    }

    const unlockedSet = getUnlockedTilesSet(saveData.world, saveData.world_objects);
    if (!isTileUnlocked(grid_x, grid_y, unlockedSet)) {
      get().notify('Petak ini belum dibuka! Buka lahan terlebih dahulu.', 'error');
      return false;
    }

    const coordKey = `${grid_x},${grid_y}`;
    if (saveData.world.sealed_tiles && saveData.world.sealed_tiles.includes(coordKey)) {
      get().notify(
        '🚧 Petak ini sedang disegel oleh kru Bulldozer! Selesaikan 1 sesi fokus atau restorasi tunggul untuk membuka segel.',
        'error'
      );
      return false;
    }

    if (isTileOccupied(grid_x, grid_y, saveData.world_objects)) {
      get().notify('Petak tersebut sudah terisi objek lain!', 'error');
      return false;
    }

    const cost = item.cost;
    if (!canAfford(saveData.currency_ledger, cost)) {
      get().notify(`Soul tidak cukup! Menempatkan ${item.name} membutuhkan ${cost} Soul.`, 'error');
      return false;
    }

    const newObjectId = `obj_${item.type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const ledgerEntry = createLedgerEntry(
      'gold',
      -cost,
      `place_${item.id}`,
      newObjectId
    );

    const newObj: WorldObject = {
      id: newObjectId,
      object_type: item.type,
      grid_x,
      grid_y,
      rotation: get().placementRotation,
      scale: item.type === 'path' ? 1.0 : 0.9 + Math.random() * 0.35,
      status: 'active',
      created_at: new Date().toISOString(),
      reclaimed_at: null,
      model_variant: item.model,
    };

    const pioneerSet = new Set(saveData.pioneer_completed_ids || []);
    pioneerSet.add('place_object');
    const lowerModel = item.model.toLowerCase();
    if (lowerModel.includes('river') || lowerModel.includes('bridge')) {
      pioneerSet.add('river_bridge');
    }

    const updatedLedger = [...saveData.currency_ledger, ledgerEntry];
    const updatedData: RimbaSaveData = {
      ...saveData,
      world_objects: [...saveData.world_objects, newObj],
      currency_ledger: updatedLedger,
      pioneer_completed_ids: Array.from(pioneerSet),
    };

    // Continuous Placement: Keep item selected as long as the user can afford another copy!
    const stillAffordable = canAfford(updatedLedger, cost);

    saveSaveData(updatedData);
    set({
      saveData: updatedData,
      selectedTool: stillAffordable ? item.type : null,
      selectedCatalogItem: stillAffordable ? item : null,
    });

    get().notify(
      stillAffordable
        ? `🌿 ${item.name} ditempatkan! (-${cost} Soul) • Klik petak lain untuk lanjut menaruh atau tekan Esc.`
        : `🌿 ${item.name} ditempatkan! (-${cost} Soul)`,
      'success'
    );
    return true;
  },

  placeObject: (type, grid_x, grid_y) => {
    const item = get().selectedCatalogItem || BUILD_CATALOG.find((c) => c.type === type) || BUILD_CATALOG[0];
    return get().placeCatalogItem(item, grid_x, grid_y);
  },

  restoreReclaimedObject: (objectId) => {
    const { saveData } = get();
    const result = restoreObject(objectId, saveData.world_objects, saveData.currency_ledger);

    if (!result.success || !result.updatedObject || !result.ledgerEntry) {
      get().notify(result.error || 'Gagal memulihkan objek.', 'error');
      return false;
    }

    const updatedObjects = saveData.world_objects.map((obj) =>
      obj.id === objectId ? result.updatedObject! : obj
    );

    const updatedLedger = [...saveData.currency_ledger, result.ledgerEntry];
    const pioneerSet = new Set(saveData.pioneer_completed_ids || []);
    pioneerSet.add('restore_stump');

    const updatedData: RimbaSaveData = {
      ...saveData,
      world: {
        ...saveData.world,
        sealed_tiles: [],
      },
      world_objects: updatedObjects,
      currency_ledger: updatedLedger,
      pioneer_completed_ids: Array.from(pioneerSet),
    };

    saveSaveData(updatedData);
    set({
      saveData: updatedData,
      selectedObject: result.updatedObject,
    });

    get().notify(
      `🌿 Tunggul/Objek berhasil dipulihkan kembali segar & segel petak dibuka! (-${GAME_CONFIG.restore} Soul)`,
      'success'
    );
    return true;
  },

  bribeBulldozerCrew: () => {
    const { saveData } = get();
    const result = bribeBulldozer(
      saveData.world_objects,
      saveData.currency_ledger,
      saveData.world.bulldozer
    );

    if (!result.success || !result.ledgerEntry) {
      get().notify(result.error || 'Gagal menghalau kru konstruksi.', 'error');
      return false;
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rimba:bulldozer_retreat'));
    }

    // Immediately restore objects and record Soul deduction
    const intermediateData: RimbaSaveData = {
      ...saveData,
      world_objects: result.updatedObjects,
      currency_ledger: [...saveData.currency_ledger, result.ledgerEntry],
    };

    saveSaveData(intermediateData);
    set({
      saveData: intermediateData,
      selectedObject: null,
    });

    get().notify(
      `🛡️ Perisai energi suaka berhasil menghalau Bulldozer! Truk konstruksi mundur. (-${GAME_CONFIG.reclamation.bulldozer_mark_cost} Soul)`,
      'success'
    );

    // Allow 1.4s retreat drive-off animation before unmounting bulldozer
    setTimeout(() => {
      const current = get().saveData;
      const finalData: RimbaSaveData = {
        ...current,
        world: {
          ...current.world,
          ...result.updatedWorld,
          bulldozer: null,
        },
      };
      saveSaveData(finalData);
      set({ saveData: finalData });
    }, 1400);

    return true;
  },

  checkReclamation: () => {
    const { saveData, devFastMode } = get();

    // Protect Tier 1 marked trees from being immediately chopped by the 30s polling interval
    // before the 24h (or 3m devFast) grace period has elapsed since the bulldozer arrived.
    if (
      saveData.world.bulldozer?.active &&
      !canExecuteBulldozerTier2(saveData.world.bulldozer, devFastMode)
    ) {
      return;
    }

    const result = triggerBulldozerReclamation(
      saveData.world_objects,
      saveData.world.bulldozer,
      saveData.world.last_focus_completed_at,
      devFastMode
    );

    if (result.triggered) {
      const updatedEvents = result.event
        ? [...saveData.reclamation_events, result.event]
        : saveData.reclamation_events;

      const updatedLedger = result.ledgerEntry
        ? [...saveData.currency_ledger, result.ledgerEntry]
        : saveData.currency_ledger;

      const updatedWorld = {
        ...saveData.world,
        ...result.updatedWorld,
        bulldozer: result.bulldozer,
      };

      const updatedData: RimbaSaveData = {
        ...saveData,
        world: updatedWorld,
        world_objects: result.affectedObjects,
        currency_ledger: updatedLedger,
        reclamation_events: updatedEvents,
      };

      saveSaveData(updatedData);
      set({ saveData: updatedData });

      if (result.tier === 1) {
        get().notify(
          '🚜 Kru konstruksi tiba di tepi pulau! Selesaikan sesi fokus untuk menghalau mereka.',
          'reclamation'
        );
      } else {
        get().notify(
          '⚠️ Kru konstruksi menebang pohon yang ditandai menjadi tunggul karena tidak aktif terlalu lama!',
          'error'
        );
      }
    }
  },

  simulateInactivity: (hours) => {
    const { saveData } = get();
    const simulatedPastTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const updatedBulldozer = saveData.world.bulldozer?.active
      ? {
          ...saveData.world.bulldozer,
          spawned_at: simulatedPastTime,
        }
      : saveData.world.bulldozer;

    const updatedWorld = {
      ...saveData.world,
      last_focus_completed_at: simulatedPastTime,
      bulldozer: updatedBulldozer,
    };

    const updatedData: RimbaSaveData = {
      ...saveData,
      world: updatedWorld,
    };

    saveSaveData(updatedData);
    set({ saveData: updatedData });

    get().notify(`Simulasi +${hours} jam tidak aktif dijalankan. Memeriksa status hutan...`, 'info');
    get().checkReclamation();
  },

  addDevGold: (amount) => {
    const { saveData } = get();
    const entry = createLedgerEntry('gold', amount, 'dev_wealth_grant', 'manual');
    const updatedData: RimbaSaveData = {
      ...saveData,
      currency_ledger: [...saveData.currency_ledger, entry],
    };
    saveSaveData(updatedData);
    set({ saveData: updatedData });
    get().notify(`Granted +${amount} Soul to sanctuary ledger! ✨`, 'success');
  },

  loadThrivingPreset: () => {
    const now = new Date();
    const nowIso = now.toISOString();
    // Grant rich ledger with 2500 Soul and 1500 XP
    const goldBonus = createLedgerEntry('gold', 2500, 'thriving_garden_grant', 'preset');
    const xpBonus = createLedgerEntry('xp', 1500, 'thriving_garden_grant', 'preset');
    const ledger = [goldBonus, xpBonus];

    // Unlock the full 10x10 island (all 100 tiles) so every asset & biome zone is visible
    const allUnlockedTiles: string[] = [];
    for (let gx = 0; gx < 10; gx++) {
      for (let gy = 0; gy < 10; gy++) {
        allUnlockedTiles.push(`${gx},${gy}`);
      }
    }

    const halfPi = Math.PI / 2;

    // Comprehensive 10x10 Grand Showcase featuring authentic Rimba 3D models,
    // a continuous East-West river stream across y=4, and all 3 wooden bridges spanning the water!
    const thrivingObjects: WorldObject[] = [
      // --- ROW y=0: Northern Highland Canopy, Pines, Ancient Trees & Tropical Palms ---
      { id: 'thrive_r0_0', object_type: 'tree', grid_x: 0, grid_y: 0, rotation: 0.2, scale: 1.18, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'lpset_tree_nordic_pine', species: 'pine', task_note: 'Riset arsitektur sistem terdistribusi', focus_tag: 'Belajar', focus_duration: 45 },
      { id: 'thrive_r0_1', object_type: 'tree', grid_x: 1, grid_y: 0, rotation: 1.1, scale: 1.2, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'pack_tree_tiered_pine', species: 'pine', task_note: 'Optimasi shader rumput Ghibli', focus_tag: 'Koding', focus_duration: 60 },
      { id: 'thrive_r0_2', object_type: 'tree', grid_x: 2, grid_y: 0, rotation: 0.7, scale: 1.2, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'tree_pine', species: 'pine', task_note: 'Deep work sprint modul backend', focus_tag: 'Kerja', focus_duration: 45 },
      { id: 'thrive_r0_3', object_type: 'tree', grid_x: 3, grid_y: 0, rotation: 1.8, scale: 1.22, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'pack_tree_tall_cypress', species: 'pine', task_note: 'Membaca dokumentasi Three.js & WebGL', focus_tag: 'Membaca', focus_duration: 25 },
      { id: 'thrive_r0_4', object_type: 'tree', grid_x: 4, grid_y: 0, rotation: 0.4, scale: 1.28, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'tree_detailed', species: 'ancient', task_note: 'Menyelesaikan bab 4 tesis dan revisi metode', focus_tag: 'Belajar', focus_duration: 60 },
      { id: 'thrive_r0_5', object_type: 'tree', grid_x: 5, grid_y: 0, rotation: 0.3, scale: 1.22, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'mini_forest_tree_high', species: 'pine', task_note: 'Meditasi keheningan hutan pagi', focus_tag: 'Mindfulness', focus_duration: 25 },
      { id: 'thrive_r0_6', object_type: 'tree', grid_x: 6, grid_y: 0, rotation: 2.1, scale: 1.22, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'fabz_tree_baobab', species: 'ancient', task_note: 'Eksplorasi desain UI Liquid Glass', focus_tag: 'Kreatif', focus_duration: 45 },
      { id: 'thrive_r0_7', object_type: 'tree', grid_x: 7, grid_y: 0, rotation: 0.9, scale: 1.18, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'fabz_tree_savannah', species: 'autumn', task_note: 'Kurasi aset 3D suaka Rimba', focus_tag: 'Kreatif', focus_duration: 45 },
      { id: 'thrive_r0_8', object_type: 'tree', grid_x: 8, grid_y: 0, rotation: 1.4, scale: 1.2, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'lpset_tree_coconut', species: 'palm', task_note: 'Jurnal refleksi pagi & pernapasan', focus_tag: 'Mindfulness', focus_duration: 15 },
      { id: 'thrive_r0_9', object_type: 'tree', grid_x: 9, grid_y: 0, rotation: 2.6, scale: 1.15, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'tree_palm', species: 'palm', task_note: 'Perencanaan roadmap produk Q4', focus_tag: 'Kerja', focus_duration: 25 },

      // --- ROW y=1: Woodland Grove & Tropical Sanctuary ---
      { id: 'thrive_r1_0', object_type: 'tree', grid_x: 0, grid_y: 1, rotation: 0.5, scale: 1.1, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'fabz_pine_green', species: 'pine' },
      { id: 'thrive_r1_1', object_type: 'tree', grid_x: 1, grid_y: 1, rotation: 1.3, scale: 1.18, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'mini_forest_tree_high', species: 'pine' },
      { id: 'thrive_r1_2', object_type: 'tree', grid_x: 2, grid_y: 1, rotation: 2.2, scale: 1.15, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'pack_tree_round_oak', species: 'oak' },
      { id: 'thrive_r1_3', object_type: 'tree', grid_x: 3, grid_y: 1, rotation: 0.8, scale: 1.22, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'tree_fat', species: 'ancient' },
      { id: 'thrive_r1_5', object_type: 'tree', grid_x: 5, grid_y: 1, rotation: 1.7, scale: 1.15, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'fabz_tree_forest', species: 'oak' },
      { id: 'thrive_r1_6', object_type: 'tree', grid_x: 6, grid_y: 1, rotation: 0.4, scale: 1.15, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'tree_default', species: 'oak' },
      { id: 'thrive_r1_7', object_type: 'tree', grid_x: 7, grid_y: 1, rotation: 1.1, scale: 1.15, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'lpset_tree_banana', species: 'palm' },
      { id: 'thrive_r1_8', object_type: 'rock', grid_x: 8, grid_y: 1, rotation: 0.9, scale: 1.25, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'rock_tall' },
      { id: 'thrive_r1_9', object_type: 'rock', grid_x: 9, grid_y: 1, rotation: 0.6, scale: 1.1, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'fabz_plant_fern' },

      // --- ROW y=2: Cozy Ranger Campsite & Shrubbery Glade ---
      { id: 'thrive_r2_0', object_type: 'tree', grid_x: 0, grid_y: 2, rotation: 1.5, scale: 1.15, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'survival_tree', species: 'pine' },
      { id: 'thrive_r2_1', object_type: 'rock', grid_x: 1, grid_y: 2, rotation: 1.2, scale: 1.05, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'tent' },
      { id: 'thrive_r2_2', object_type: 'rock', grid_x: 2, grid_y: 2, rotation: 0.4, scale: 1.1, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'campfire' },
      { id: 'thrive_r2_3', object_type: 'rock', grid_x: 3, grid_y: 2, rotation: 0.3, scale: 1.1, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'log' },
      { id: 'thrive_r2_5', object_type: 'path', grid_x: 5, grid_y: 2, rotation: halfPi, scale: 1.0, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'path_wood' },
      { id: 'thrive_r2_6', object_type: 'rock', grid_x: 6, grid_y: 2, rotation: 0.7, scale: 1.1, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'forest_fruit_bush' },
      { id: 'thrive_r2_7', object_type: 'rock', grid_x: 7, grid_y: 2, rotation: 1.9, scale: 1.05, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'lp_bush_round' },
      { id: 'thrive_r2_8', object_type: 'rock', grid_x: 8, grid_y: 2, rotation: 2.4, scale: 1.1, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'bush' },

      // --- ROW y=3: North Riverbank & Mossy River Stones ---
      { id: 'thrive_r3_0', object_type: 'rock', grid_x: 0, grid_y: 3, rotation: 0.4, scale: 1.1, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'lpset_rock_mossy_a' },
      { id: 'thrive_r3_1', object_type: 'rock', grid_x: 1, grid_y: 3, rotation: 1.2, scale: 1.05, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'fabz_plant_fern' },
      { id: 'thrive_r3_2', object_type: 'path', grid_x: 2, grid_y: 3, rotation: 0.0, scale: 1.0, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'path_stepping' },
      { id: 'thrive_r3_3', object_type: 'rock', grid_x: 3, grid_y: 3, rotation: 0.8, scale: 1.15, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'rock_large' },
      { id: 'thrive_r3_4', object_type: 'rock', grid_x: 4, grid_y: 3, rotation: 0.6, scale: 1.15, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'lpset_rock_mossy_a' },
      { id: 'thrive_r3_5', object_type: 'path', grid_x: 5, grid_y: 3, rotation: halfPi, scale: 1.0, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'path_wood' },
      { id: 'thrive_r3_6', object_type: 'rock', grid_x: 6, grid_y: 3, rotation: 1.6, scale: 1.12, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'lpset_rock_mossy_b' },
      { id: 'thrive_r3_7', object_type: 'rock', grid_x: 7, grid_y: 3, rotation: 2.1, scale: 1.08, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'fabz_rounded_rock' },
      { id: 'thrive_r3_8', object_type: 'path', grid_x: 8, grid_y: 3, rotation: 0.0, scale: 1.0, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'path_stone' },

      // --- ROW y=4: Continuous Rimba River Stream & Natural Rustic Wooden Bridges ---
      { id: 'thrive_river_0', object_type: 'path', grid_x: 0, grid_y: 4, rotation: 0, scale: 1.0, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'river_stream' },
      { id: 'thrive_river_1', object_type: 'path', grid_x: 1, grid_y: 4, rotation: 0, scale: 1.0, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'river_stream' },
      { id: 'thrive_river_2', object_type: 'path', grid_x: 2, grid_y: 4, rotation: 0, scale: 1.0, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'river_stream' },
      { id: 'thrive_river_3', object_type: 'path', grid_x: 3, grid_y: 4, rotation: 0, scale: 1.0, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'river_stream' },
      { id: 'thrive_river_4', object_type: 'path', grid_x: 4, grid_y: 4, rotation: 0, scale: 1.0, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'river_stream' },
      { id: 'thrive_bridge_main', object_type: 'path', grid_x: 5, grid_y: 4, rotation: halfPi, scale: 1.05, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'fabz_flat_bridge' },
      { id: 'thrive_river_6', object_type: 'path', grid_x: 6, grid_y: 4, rotation: 0, scale: 1.0, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'river_stream' },
      { id: 'thrive_river_7', object_type: 'path', grid_x: 7, grid_y: 4, rotation: 0, scale: 1.0, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'river_stream' },
      { id: 'thrive_bridge_south', object_type: 'path', grid_x: 8, grid_y: 4, rotation: halfPi, scale: 1.05, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'fabz_flat_bridge' },
      { id: 'thrive_river_9', object_type: 'path', grid_x: 9, grid_y: 4, rotation: 0, scale: 1.0, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'river_stream' },

      // --- ROW y=5: South Riverbank, Ferns, Mossy Logs & Wildflowers ---
      { id: 'thrive_r5_0', object_type: 'rock', grid_x: 0, grid_y: 5, rotation: 0.5, scale: 0.95, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'rock_small' },
      { id: 'thrive_r5_1', object_type: 'rock', grid_x: 1, grid_y: 5, rotation: 0.4, scale: 1.05, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'pack_stump_moss' },
      { id: 'thrive_r5_2', object_type: 'path', grid_x: 2, grid_y: 5, rotation: 0.2, scale: 1.0, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'path_stepping' },
      { id: 'thrive_r5_3', object_type: 'rock', grid_x: 3, grid_y: 5, rotation: 0.0, scale: 1.05, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'pack_wood_log_moss' },
      { id: 'thrive_r5_5', object_type: 'rock', grid_x: 5, grid_y: 5, rotation: 0.3, scale: 1.05, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'fabz_plant_fern' },
      { id: 'thrive_r5_6', object_type: 'rock', grid_x: 6, grid_y: 5, rotation: 0.0, scale: 1.05, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'lp_bush_round' },
      { id: 'thrive_r5_8', object_type: 'rock', grid_x: 8, grid_y: 5, rotation: 0.2, scale: 1.05, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'shroom_chanterelle' },
      { id: 'thrive_r5_9', object_type: 'rock', grid_x: 9, grid_y: 5, rotation: 1.1, scale: 1.05, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'fabz_flower_crimson' },

      // --- ROW y=6: Fungi Hollow & Wildflower Meadow ---
      { id: 'thrive_r6_0', object_type: 'rock', grid_x: 0, grid_y: 6, rotation: 0.3, scale: 1.05, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'shroom_amanita' },
      { id: 'thrive_r6_1', object_type: 'rock', grid_x: 1, grid_y: 6, rotation: 1.4, scale: 1.05, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'shroom_chanterelle' },
      { id: 'thrive_r6_2', object_type: 'rock', grid_x: 2, grid_y: 6, rotation: 0.8, scale: 1.08, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'lp_mushroom_cluster' },
      { id: 'thrive_r6_3', object_type: 'rock', grid_x: 3, grid_y: 6, rotation: 2.1, scale: 1.1, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'mushroom_red' },
      { id: 'thrive_r6_6', object_type: 'rock', grid_x: 6, grid_y: 6, rotation: 0.5, scale: 1.0, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'flower_red' },
      { id: 'thrive_r6_7', object_type: 'rock', grid_x: 7, grid_y: 6, rotation: 1.2, scale: 1.0, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'flower_yellow' },
      { id: 'thrive_r6_8', object_type: 'rock', grid_x: 8, grid_y: 6, rotation: 2.5, scale: 1.0, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'flower_purple' },

      // --- ROW y=7: Ancient Timber, Mossy Logs, Stumps & Roots ---
      { id: 'thrive_r7_0', object_type: 'rock', grid_x: 0, grid_y: 7, rotation: 1.9, scale: 1.05, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'stump' },
      { id: 'thrive_r7_1', object_type: 'rock', grid_x: 1, grid_y: 7, rotation: 0.6, scale: 1.05, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'pack_stump_moss' },
      { id: 'thrive_r7_2', object_type: 'rock', grid_x: 2, grid_y: 7, rotation: 1.3, scale: 1.05, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'fabz_cut_trunk' },
      { id: 'thrive_r7_6', object_type: 'rock', grid_x: 6, grid_y: 7, rotation: 0.4, scale: 1.1, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'pack_wood_log_moss' },
      { id: 'thrive_r7_7', object_type: 'rock', grid_x: 7, grid_y: 7, rotation: 1.7, scale: 1.05, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'pack_wood_branch' },
      { id: 'thrive_r7_8', object_type: 'rock', grid_x: 8, grid_y: 7, rotation: 0.9, scale: 1.08, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'lp_ancient_root' },

      // --- ROW y=8: Southern Oak, Birch & Autumn Ridge ---
      { id: 'thrive_r8_0', object_type: 'tree', grid_x: 0, grid_y: 8, rotation: 0.3, scale: 1.15, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'tree_oak', species: 'oak' },
      { id: 'thrive_r8_1', object_type: 'tree', grid_x: 1, grid_y: 8, rotation: 1.4, scale: 0.95, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'tree_small', species: 'oak' },
      { id: 'thrive_r8_2', object_type: 'tree', grid_x: 2, grid_y: 8, rotation: 2.1, scale: 1.1, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'mini_forest_tree', species: 'pine' },
      { id: 'thrive_r8_6', object_type: 'tree', grid_x: 6, grid_y: 8, rotation: 0.7, scale: 1.2, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'tree_fall', species: 'autumn' },
      { id: 'thrive_r8_7', object_type: 'tree', grid_x: 7, grid_y: 8, rotation: 1.8, scale: 1.2, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'survival_tree_autumn', species: 'autumn' },
      { id: 'thrive_r8_8', object_type: 'tree', grid_x: 8, grid_y: 8, rotation: 0.5, scale: 1.1, status: 'active', created_at: nowIso, reclaimed_at: null, model_variant: 'forest_dead_tree', species: 'oak' },

      // --- ROW y=9: Reclaimed Relics (Ready for Restoration Test) ---
      { id: 'thrive_rec1', object_type: 'tree', grid_x: 1, grid_y: 9, rotation: 1.5, scale: 1.1, status: 'reclaimed', created_at: new Date(now.getTime() - 1000000).toISOString(), reclaimed_at: nowIso, model_variant: 'tree_oak', species: 'oak', task_note: 'Menyusun rencana belajar semester depan', focus_tag: 'Belajar', focus_duration: 25 },
      { id: 'thrive_rec2', object_type: 'rock', grid_x: 7, grid_y: 9, rotation: 0.8, scale: 1.15, status: 'reclaimed', created_at: new Date(now.getTime() - 1000000).toISOString(), reclaimed_at: nowIso, model_variant: 'lpset_rock_mossy_b' },
    ];

    const balances = calculateBalances(ledger);

    const thrivingSave: RimbaSaveData = {
      version: 1,
      profile: {
        id: 'local-user',
        xp: balances.xp,
        goldCached: balances.gold,
      },
      world: {
        id: 'world_thriving_mature',
        name: 'Thriving Rimba Sanctuary',
        last_focus_completed_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        last_reclamation_at: nowIso,
        unlocked_tiles: allUnlockedTiles,
      },
      focus_sessions: [],
      world_objects: thrivingObjects,
      currency_ledger: ledger,
      reclamation_events: [
        {
          id: 'reclaim_thriving_demo',
          triggered_at: nowIso,
          inactivity_hours: 48,
          objects_affected: ['thrive_rec1', 'thrive_rec2'],
        },
      ],
    };

    saveSaveData(thrivingSave);
    set({
      saveData: thrivingSave,
      activeSession: null,
      selectedTool: null,
      selectedCatalogItem: null,
      selectedObject: null,
      hoveredGridTile: null,
    });

    get().notify(
      '🌳 Thriving Sanctuary 10x10 Dimuat! Menampilkan suaka alami Rimba, aliran sungai jernih & jembatan papan kayu (+2,500 Soul).',
      'success'
    );
  },

  resetWorld: () => {
    const initial = createInitialSaveData();
    saveSaveData(initial);
    set({
      saveData: initial,
      activeSession: null,
      selectedTool: null,
      selectedCatalogItem: null,
      selectedObject: null,
      hoveredGridTile: null,
      isExpandLandMode: false,
    });
    get().notify('Pulau disetel ulang ke Starter Hub 3x3 (9 Petak Lahan).', 'info');
  },

  resetToStarterHub: () => {
    const initial = createInitialSaveData();
    const testBonus = createLedgerEntry('gold', 150, 'expansion_test_grant', 'manual');
    const updated = {
      ...initial,
      currency_ledger: [...initial.currency_ledger, testBonus],
      profile: {
        ...initial.profile,
        goldCached: initial.profile.goldCached + 150,
      },
    };
    saveSaveData(updated);
    set({
      saveData: updated,
      activeSession: null,
      selectedTool: null,
      selectedCatalogItem: null,
      selectedObject: null,
      hoveredGridTile: null,
      isExpandLandMode: true,
    });
    get().notify('🌱 Starter Hub 3x3 aktif (+150 Soul)! Mode Perluas Lahan otomatis menyala.', 'success');
  },

  importSaveData: (newData: RimbaSaveData) => {
    try {
      saveSaveData(newData);
      set({
        saveData: newData,
        activeSession: null,
        selectedTool: null,
        selectedCatalogItem: null,
        selectedObject: null,
        hoveredGridTile: null,
        isExpandLandMode: false,
      });
      get().notify(`✨ Suaka "${newData.world.name || 'Rimba'}" berhasil dipulihkan dari berkas cadangan!`, 'success');
      return true;
    } catch (err) {
      console.error('Failed to import save data:', err);
      get().notify('Gagal memulihkan berkas cadangan.', 'error');
      return false;
    }
  },

  addTodo: (text, tag) => {
    const trimmed = text.trim();
    if (!trimmed) return null;
    const { saveData } = get();
    const newTodo: TodoItem = {
      id: `todo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text: trimmed,
      tag: tag || 'Belajar',
      completed: false,
      created_at: new Date().toISOString(),
      completed_at: null,
    };
    const updatedData: RimbaSaveData = {
      ...saveData,
      todos: [...(saveData.todos || []), newTodo],
    };
    saveSaveData(updatedData);
    set({ saveData: updatedData });
    return newTodo;
  },

  toggleTodo: (id) => {
    const { saveData } = get();
    const existing = saveData.todos || [];
    const nowStr = new Date().toISOString();
    const updatedTodos = existing.map((t) =>
      t.id === id
        ? { ...t, completed: !t.completed, completed_at: !t.completed ? nowStr : null }
        : t
    );
    const updatedData: RimbaSaveData = {
      ...saveData,
      todos: updatedTodos,
    };
    saveSaveData(updatedData);
    set({ saveData: updatedData });
  },

  deleteTodo: (id) => {
    const { saveData } = get();
    const existing = saveData.todos || [];
    const updatedData: RimbaSaveData = {
      ...saveData,
      todos: existing.filter((t) => t.id !== id),
    };
    saveSaveData(updatedData);
    set({ saveData: updatedData });
  },

  claimQuest: (questId) => {
    const { saveData } = get();
    const result = claimDailyQuest(saveData, questId);
    if (!result.success) {
      get().notify(result.error || 'Gagal mengklaim misi.', 'error');
      return false;
    }
    const updatedLedger = [...saveData.currency_ledger, ...result.newLedgerEntries];
    const balances = calculateBalances(updatedLedger);
    const updatedClaimed = result.claimKey
      ? Array.from(new Set([...(saveData.claimed_quests || []), result.claimKey]))
      : saveData.claimed_quests;
    const updatedData: RimbaSaveData = {
      ...saveData,
      profile: {
        ...saveData.profile,
        goldCached: balances.gold,
        xp: balances.xp,
      },
      currency_ledger: updatedLedger,
      claimed_quests: updatedClaimed,
    };
    saveSaveData(updatedData);
    set({ saveData: updatedData });
    get().notify(
      `🎁 Misi diklaim! +${result.rewardGold} Soul & +${result.rewardXp} XP ditambahkan ke jurnalmu.`,
      'success'
    );
    return true;
  },

  claimAllClearBonus: () => {
    const { saveData } = get();
    const result = claimAllClearDailyBonus(saveData);
    if (!result.success) {
      get().notify(result.error || 'Gagal mengklaim peti bonus harian.', 'error');
      return false;
    }
    const updatedLedger = [...saveData.currency_ledger, ...result.newLedgerEntries];
    const balances = calculateBalances(updatedLedger);
    const updatedClaimed = result.claimKey
      ? Array.from(new Set([...(saveData.claimed_quests || []), result.claimKey]))
      : saveData.claimed_quests;
    const updatedData: RimbaSaveData = {
      ...saveData,
      profile: {
        ...saveData.profile,
        goldCached: balances.gold,
        xp: balances.xp,
      },
      currency_ledger: updatedLedger,
      claimed_quests: updatedClaimed,
    };
    saveSaveData(updatedData);
    set({ saveData: updatedData });
    get().notify(
      `🏆 Peti All-Clear Harian terbuka! +${result.rewardGold} Soul & +${result.rewardXp} XP!`,
      'success'
    );
    return true;
  },

  claimAchievement: (achievementId) => {
    const { saveData } = get();
    const result = claimAchievementReward(achievementId, saveData);
    if (!result.ok) {
      get().notify(result.message, 'error');
      return false;
    }
    saveSaveData(result.updatedSaveData);
    set({ saveData: result.updatedSaveData });
    get().notify(result.message, 'success');
    return true;
  },

  updateSessionNote: (sessionId, note) => {
    const { saveData } = get();
    const cleanNote = note.trim();
    const updatedSessions = saveData.focus_sessions.map((s) =>
      s.id === sessionId ? { ...s, task_note: cleanNote } : s
    );

    const session = saveData.focus_sessions.find((s) => s.id === sessionId);
    const updatedObjects = saveData.world_objects.map((o) => {
      if (session && session.completed_at && o.created_at === session.completed_at) {
        return { ...o, task_note: cleanNote };
      }
      return o;
    });

    const updatedData: RimbaSaveData = {
      ...saveData,
      focus_sessions: updatedSessions,
      world_objects: updatedObjects,
    };
    saveSaveData(updatedData);
    set({ saveData: updatedData });
    get().notify('📝 Catatan refleksi berhasil disimpan ke Jurnal!', 'success');
  },

  buyStreakShield: () => {
    const { saveData } = get();
    const currentShields = saveData.streak_shields || 0;
    if (currentShields >= 2) {
      get().notify('Kapasitas penuh! Kamu sudah memiliki maksimal 2 Embun Pelindung.', 'info');
      return false;
    }
    const cost = 15;
    if (!canAfford(saveData.currency_ledger, cost)) {
      get().notify(`Soul tidak cukup! Butuh ${cost} Soul untuk membeli 1 Embun Pelindung.`, 'error');
      return false;
    }
    const entry = createLedgerEntry('gold', -cost, 'buy_streak_shield', `shield_${Date.now()}`);
    const updatedLedger = [...saveData.currency_ledger, entry];
    const balances = calculateBalances(updatedLedger);
    const updatedData: RimbaSaveData = {
      ...saveData,
      profile: {
        ...saveData.profile,
        goldCached: balances.gold,
      },
      currency_ledger: updatedLedger,
      streak_shields: currentShields + 1,
    };
    saveSaveData(updatedData);
    set({ saveData: updatedData });
    get().notify('🛡️ Embun Pelindung berhasil dibeli! Streak harianmu terlindungi bila libur 1 hari.', 'success');
    return true;
  },

  claimStoryChapter: (chapterId) => {
    const { saveData } = get();
    const claimed = new Set(saveData.claimed_story_chapters || []);
    if (claimed.has(chapterId)) {
      get().notify('Berkah bab ini sudah pernah diklaim!', 'info');
      return false;
    }
    const chapter = STORY_CHAPTERS.find((c) => c.id === chapterId);
    if (!chapter) {
      get().notify('Bab cerita tidak ditemukan.', 'error');
      return false;
    }
    const { isUnlocked } = chapter.checkUnlocked(saveData);
    if (!isUnlocked) {
      get().notify('Syarat bab cerita ini belum terpenuhi.', 'error');
      return false;
    }

    const goldEntry = createLedgerEntry('gold', chapter.reward.gold, 'story_chapter_reward', chapterId);
    const xpEntry = createLedgerEntry('xp', chapter.reward.xp, 'story_chapter_reward', chapterId);
    const updatedLedger = [...saveData.currency_ledger, goldEntry, xpEntry];
    const balances = calculateBalances(updatedLedger);
    claimed.add(chapterId);

    const updatedData: RimbaSaveData = {
      ...saveData,
      profile: {
        ...saveData.profile,
        goldCached: balances.gold,
        xp: balances.xp,
      },
      currency_ledger: updatedLedger,
      claimed_story_chapters: Array.from(claimed),
    };
    saveSaveData(updatedData);
    set({ saveData: updatedData });
    get().notify(
      `📜 Bab ${chapter.chapterNumber} terbuka! Berkah suaka: +${chapter.reward.gold} Soul & +${chapter.reward.xp} XP!`,
      'success'
    );
    return true;
  },
}));

