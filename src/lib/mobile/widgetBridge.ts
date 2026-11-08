'use client';

import { Capacitor, registerPlugin, PluginListenerHandle } from '@capacitor/core';
import { RimbaSaveData, FocusSession } from '@/types/game';
import { calculateAnalytics, getStreakMilestone } from '@/lib/game/analytics';
import { getLevelFromXp, getLevelMetadata } from '@/lib/game/levelRules';
import { getUnlockedTilesSet, getLandExpansionZoneInfo } from '@/lib/game/worldRules';
import { usePreferencesStore } from '@/lib/settings/usePreferencesStore';

export interface RimbaWidgetPayload {
  updatedAt: string;
  language: 'id' | 'en';
  rangerName: string;
  level: number;
  levelTitle: string;
  levelBadge: string;
  xp: number;
  soul: number;
  streakDays: number;
  streakTitle: string;
  streakIcon: string;
  todayMinutes: number;
  dailyGoalMinutes: number;
  todayTrees: number;
  totalTrees: number;
  unlockedTiles: number;
  zoneName: string;
  activeBiome: string;
  quickPresetMinutes: number;
  isFocusActive: boolean;
  isFocusPaused: boolean;
  activeSessionTag: string | null;
  activeSessionSpecies: string | null;
  activeSessionEndsAt: string | null;
  activeSessionDurationMinutes: number;
  pausedRemainingSeconds?: number;
  isStopwatch?: boolean;
}

interface RimbaWidgetBridgePluginInterface {
  syncWidgetState(options: { payload: string }): Promise<{ synced: boolean }>;
  getWidgetStatus(): Promise<WidgetStatus>;
  consumePendingAction(): Promise<{ url?: string }>;
  clearWidgetState(): Promise<{ cleared: boolean }>;
  addListener(event: 'widgetActionQueued', callback: () => void): Promise<PluginListenerHandle>;
}

export interface WidgetStatus {
  available: boolean;
  controlsSupported: boolean;
  installedWidgets?: number;
}

const RimbaWidgetBridgeNative = registerPlugin<RimbaWidgetBridgePluginInterface>('RimbaWidgetBridge');

export const WIDGET_STORAGE_KEY = 'rimba_widget_telemetry_v1';
export const WIDGET_PRESET_MINUTES_KEY = 'rimba_widget_quick_minutes';

let lastSyncedSignature = '';
let widgetOwnerRevision = 0;
let nativeQueue: Promise<unknown> = Promise.resolve();
const isNativeIOS = () => typeof window !== 'undefined' && Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

export async function getNativeWidgetStatus(): Promise<WidgetStatus> {
  if (isNativeIOS()) {
    try { return await RimbaWidgetBridgeNative.getWidgetStatus(); } catch { /* Older build has no registered bridge. */ }
  }
  return { available: false, controlsSupported: false };
}

export async function consumeNativeWidgetAction(): Promise<string | undefined> {
  if (!isNativeIOS()) return;
  try { return (await RimbaWidgetBridgeNative.consumePendingAction()).url; } catch { return; }
}

export async function listenForNativeWidgetActions(callback: () => void): Promise<PluginListenerHandle | undefined> {
  if (!isNativeIOS()) return;
  try { return await RimbaWidgetBridgeNative.addListener('widgetActionQueued', callback); } catch { return; }
}

export function getWidgetQuickPresetMinutes(): number {
  if (typeof window === 'undefined') return 25;
  try {
    const raw = localStorage.getItem(WIDGET_PRESET_MINUTES_KEY);
    const parsed = raw ? parseInt(raw, 10) : 25;
    if ([15, 25, 45, 60].includes(parsed)) return parsed;
  } catch {
    // ignore
  }
  return 25;
}

export function setWidgetQuickPresetMinutes(minutes: number): void {
  if (typeof window === 'undefined') return;
  const safe = [15, 25, 45, 60].includes(minutes) ? minutes : 25;
  try {
    localStorage.setItem(WIDGET_PRESET_MINUTES_KEY, String(safe));
  } catch {
    // ignore
  }
}

export function buildWidgetPayload(
  saveData: RimbaSaveData,
  activeSession?: FocusSession | null,
  overrideLang?: 'id' | 'en'
): RimbaWidgetPayload {
  const lang = overrideLang || usePreferencesStore.getState().language || 'id';
  const sessions = saveData.focus_sessions || [];
  const analytics = calculateAnalytics(sessions, new Date(), saveData.used_shield_dates || []);
  const streakMeta = getStreakMilestone(analytics.currentStreak, lang);
  const xp = saveData.profile?.xp || 0;
  const level = getLevelFromXp(xp);
  const levelMeta = getLevelMetadata(level, lang);
  const worldObjects = saveData.world_objects || [];
  const unlockedSet = getUnlockedTilesSet(saveData.world, worldObjects);
  const zoneInfo = getLandExpansionZoneInfo(unlockedSet.size, lang);
  const totalTrees = worldObjects.filter(
    (o) => o.object_type === 'tree' && o.status === 'active'
  ).length;

  const isFocusActive = Boolean(activeSession && activeSession.status === 'active');

  return {
    updatedAt: new Date().toISOString(),
    language: lang,
    rangerName: saveData.profile?.name || (lang === 'en' ? 'Rimba Ranger' : 'Penjaga Rimba'),
    level,
    levelTitle: levelMeta.title,
    levelBadge: levelMeta.badge,
    xp,
    soul: saveData.profile?.goldCached || 0,
    streakDays: analytics.currentStreak,
    streakTitle: streakMeta.title,
    streakIcon: streakMeta.icon,
    todayMinutes: analytics.todayMinutes,
    dailyGoalMinutes: 60,
    todayTrees: analytics.todayTrees,
    totalTrees,
    unlockedTiles: unlockedSet.size,
    zoneName: zoneInfo.shortZoneName,
    activeBiome: saveData.active_biome || 'meadow',
    quickPresetMinutes: getWidgetQuickPresetMinutes(),
    isFocusActive,
    isFocusPaused: isFocusActive && Boolean(activeSession?.paused_at),
    activeSessionTag: isFocusActive ? activeSession?.tag || null : null,
    activeSessionSpecies: isFocusActive ? activeSession?.species || null : null,
    // Stopwatch sessions have a safety deadline, not a countdown for the widget to display.
    activeSessionEndsAt: isFocusActive && !activeSession?.is_stopwatch ? activeSession?.expected_end_at || null : null,
    activeSessionDurationMinutes: isFocusActive ? activeSession?.duration_minutes || 25 : 0,
    pausedRemainingSeconds:
      isFocusActive && activeSession?.paused_at && activeSession.paused_remaining_ms
        ? Math.ceil(activeSession.paused_remaining_ms / 1000)
        : undefined,
    isStopwatch: isFocusActive ? Boolean(activeSession?.is_stopwatch) : false,
  };
}

/**
 * Synchronizes Sanctuary telemetry with iOS Home Screen, Lock Screen, and Control Center Widgets
 * via App Groups UserDefaults (group.com.syntheticae.rimba) and WidgetCenter.reloadAllTimelines().
 * Deduplicates identical payloads to prevent redundant bridge traffic.
 */
export async function syncWidgetsWithSaveData(
  saveData: RimbaSaveData,
  activeSession?: FocusSession | null,
  force = false
): Promise<RimbaWidgetPayload & { nativeSynced: boolean }> {
  const payload = buildWidgetPayload(saveData, activeSession);
  const signatureObj = { ...payload, updatedAt: '' };
  const signature = JSON.stringify(signatureObj);

  if (!force && signature === lastSyncedSignature) {
    return { ...payload, nativeSynced: true };
  }
  if (!isNativeIOS()) return { ...payload, nativeSynced: false };
  // Widgets need aggregates and timer state, never the user's name or private focus label.
  const { rangerName: _name, activeSessionTag: _tag, ...shared } = payload;
  const serialized = JSON.stringify(shared);
  const revision = widgetOwnerRevision;
  const operation = nativeQueue.then(async () => {
    if (revision !== widgetOwnerRevision) return false;
    try {
      const result = await RimbaWidgetBridgeNative.syncWidgetState({ payload: serialized });
      if (!result.synced || revision !== widgetOwnerRevision) return false;
      lastSyncedSignature = signature;
      return true;
    } catch { return false; }
  });
  nativeQueue = operation;
  return { ...payload, nativeSynced: await operation };
}

export async function clearWidgetCacheOnSignOut(): Promise<void> {
  lastSyncedSignature = '';
  widgetOwnerRevision += 1;
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(WIDGET_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  if (isNativeIOS()) {
    const operation = nativeQueue.then(() => RimbaWidgetBridgeNative.clearWidgetState()).catch(() => undefined);
    nativeQueue = operation;
    await operation;
  }
}
