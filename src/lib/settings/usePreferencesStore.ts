'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type HapticIntensity = 'light' | 'medium' | 'heavy';
export type GraphicsQuality = 'eco' | 'balanced' | 'ultra';

export interface PreferencesState {
  // Graphics & Performance
  graphicsQuality: GraphicsQuality;
  setGraphicsQuality: (quality: GraphicsQuality) => void;

  // Audio Preferences
  soundFxEnabled: boolean;
  soundFxVolume: number; // 0 - 100
  ambientMusicEnabled: boolean;
  ambientMusicVolume: number; // 0 - 100
  selectedSoundscapeId: string;
  muteWhenBackgrounded: boolean;

  // Haptic Preferences
  hapticsEnabled: boolean;
  hapticIntensity: HapticIntensity;
  hapticOnTick: boolean;
  hapticOnComplete: boolean;
  hapticOnWarning: boolean;

  // Notification Preferences
  notificationsEnabled: boolean;
  notifyOnFocusComplete: boolean;
  notifyDailyReminder: boolean;
  dailyReminderTime: string; // 'HH:mm', e.g. '20:00'
  notifyStreakWarning: boolean;
  hasNotificationPermission: boolean;

  // Actions
  setSoundFxEnabled: (enabled: boolean) => void;
  setSoundFxVolume: (vol: number) => void;
  setAmbientMusicEnabled: (enabled: boolean) => void;
  setAmbientMusicVolume: (vol: number) => void;
  setSelectedSoundscapeId: (id: string) => void;
  setMuteWhenBackgrounded: (mute: boolean) => void;

  setHapticsEnabled: (enabled: boolean) => void;
  setHapticIntensity: (intensity: HapticIntensity) => void;
  setHapticOnTick: (enabled: boolean) => void;
  setHapticOnComplete: (enabled: boolean) => void;
  setHapticOnWarning: (enabled: boolean) => void;

  setNotificationsEnabled: (enabled: boolean) => void;
  setNotifyOnFocusComplete: (enabled: boolean) => void;
  setNotifyDailyReminder: (enabled: boolean) => void;
  setDailyReminderTime: (time: string) => void;
  setNotifyStreakWarning: (enabled: boolean) => void;
  setHasNotificationPermission: (has: boolean) => void;

  resetToDefaults: () => void;
}

const DEFAULT_PREFERENCES = {
  graphicsQuality: 'ultra' as GraphicsQuality,
  soundFxEnabled: true,
  soundFxVolume: 80,
  ambientMusicEnabled: true,
  ambientMusicVolume: 50,
  selectedSoundscapeId: 'amb_1',
  muteWhenBackgrounded: true,

  hapticsEnabled: true,
  hapticIntensity: 'light' as HapticIntensity,
  hapticOnTick: false,
  hapticOnComplete: true,
  hapticOnWarning: true,

  notificationsEnabled: true,
  notifyOnFocusComplete: true,
  notifyDailyReminder: true,
  dailyReminderTime: '20:00',
  notifyStreakWarning: true,
  hasNotificationPermission: false,
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      ...DEFAULT_PREFERENCES,

      setGraphicsQuality: (graphicsQuality) => set({ graphicsQuality }),
      setSoundFxEnabled: (soundFxEnabled) => set({ soundFxEnabled }),
      setSoundFxVolume: (soundFxVolume) => set({ soundFxVolume }),
      setAmbientMusicEnabled: (ambientMusicEnabled) => set({ ambientMusicEnabled }),
      setAmbientMusicVolume: (ambientMusicVolume) => set({ ambientMusicVolume }),
      setSelectedSoundscapeId: (selectedSoundscapeId) => set({ selectedSoundscapeId }),
      setMuteWhenBackgrounded: (muteWhenBackgrounded) => set({ muteWhenBackgrounded }),

      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
      setHapticIntensity: (hapticIntensity) => set({ hapticIntensity }),
      setHapticOnTick: (hapticOnTick) => set({ hapticOnTick }),
      setHapticOnComplete: (hapticOnComplete) => set({ hapticOnComplete }),
      setHapticOnWarning: (hapticOnWarning) => set({ hapticOnWarning }),

      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setNotifyOnFocusComplete: (notifyOnFocusComplete) => set({ notifyOnFocusComplete }),
      setNotifyDailyReminder: (notifyDailyReminder) => set({ notifyDailyReminder }),
      setDailyReminderTime: (dailyReminderTime) => set({ dailyReminderTime }),
      setNotifyStreakWarning: (notifyStreakWarning) => set({ notifyStreakWarning }),
      setHasNotificationPermission: (hasNotificationPermission) => set({ hasNotificationPermission }),

      resetToDefaults: () => set({ ...DEFAULT_PREFERENCES }),
    }),
    {
      name: 'rimba_mobile_preferences',
    }
  )
);
