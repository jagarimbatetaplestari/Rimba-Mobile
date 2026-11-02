'use client';

import { Capacitor, registerPlugin } from '@capacitor/core';
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
  activeSessionTag: string | null;
  activeSessionSpecies: string | null;
  activeSessionEndsAt: string | null;
  activeSessionDurationMinutes: number;
}

interface RimbaWidgetBridgePluginInterface {
  syncWidgetState(options: { payload: string }): Promise<{ synced: boolean }>;
  reloadWidgets(): Promise<{ reloaded: boolean }>;
}

const RimbaWidgetBridgeNative = registerPlugin<RimbaWidgetBridgePluginInterface>('RimbaWidgetBridge');

export const WIDGET_STORAGE_KEY = 'rimba_widget_telemetry_v1';
export const WIDGET_PRESET_MINUTES_KEY = 'rimba_widget_quick_minutes';

let lastSyncedSignature = '';

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
    activeSessionTag: isFocusActive ? activeSession?.tag || null : null,
    activeSessionSpecies: isFocusActive ? activeSession?.species || null : null,
    activeSessionEndsAt: isFocusActive ? activeSession?.expected_end_at || null : null,
    activeSessionDurationMinutes: isFocusActive ? activeSession?.duration_minutes || 25 : 0,
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
): Promise<RimbaWidgetPayload> {
  const payload = buildWidgetPayload(saveData, activeSession);
  const signatureObj = { ...payload, updatedAt: '' };
  const signature = JSON.stringify(signatureObj);

  if (!force && signature === lastSyncedSignature) {
    return payload;
  }
  lastSyncedSignature = signature;

  const serialized = JSON.stringify(payload);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(WIDGET_STORAGE_KEY, serialized);
    } catch {
      // ignore
    }
  }

  if (typeof window !== 'undefined' && Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
    try {
      await RimbaWidgetBridgeNative.syncWidgetState({ payload: serialized });
    } catch {
      // Native plugin gracefully falls back if not yet active
    }
  }

  return payload;
}

export async function clearWidgetCacheOnSignOut(): Promise<void> {
  lastSyncedSignature = '';
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(WIDGET_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  if (typeof window !== 'undefined' && Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
    try {
      await RimbaWidgetBridgeNative.syncWidgetState({ payload: '{}' });
    } catch {
      // ignore
    }
  }
}
