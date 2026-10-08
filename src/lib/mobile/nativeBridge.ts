'use client';

import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { usePreferencesStore } from '@/lib/settings/usePreferencesStore';

/**
 * Checks if the application is running inside a native mobile container (Capacitor iOS/Android)
 */
export function isNativeMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return Capacitor.isNativePlatform();
}

/**
 * Get current running platform name
 */
export function getAppPlatform(): 'ios' | 'android' | 'web' {
  if (typeof window === 'undefined') return 'web';
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') return 'ios';
  if (platform === 'android') return 'android';
  return 'web';
}

/**
 * Web Vibration API fallback for mobile browser testing
 */
function webVibrateFallback(pattern: number | number[]) {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore
    }
  }
}

/**
 * Light haptic feedback (button clicks, mode toggles, menu taps)
 */
export async function hapticLight(): Promise<void> {
  const prefs = usePreferencesStore.getState();
  if (!prefs.hapticsEnabled) return;

  if (isNativeMobile()) {
    try {
      const style =
        prefs.hapticIntensity === 'heavy'
          ? ImpactStyle.Heavy
          : prefs.hapticIntensity === 'medium'
          ? ImpactStyle.Medium
          : ImpactStyle.Light;
      await Haptics.impact({ style });
    } catch {
      // Ignore
    }
  } else {
    webVibrateFallback(15);
  }
}

/**
 * Medium haptic feedback (tree planting, land expansion, quest claims)
 */
export async function hapticMedium(): Promise<void> {
  const prefs = usePreferencesStore.getState();
  if (!prefs.hapticsEnabled) return;

  if (isNativeMobile()) {
    try {
      const style =
        prefs.hapticIntensity === 'light'
          ? ImpactStyle.Light
          : prefs.hapticIntensity === 'heavy'
          ? ImpactStyle.Heavy
          : ImpactStyle.Medium;
      await Haptics.impact({ style });
    } catch {
      // Ignore
    }
  } else {
    webVibrateFallback(30);
  }
}

/**
 * Heavy/Success haptic vibration (focus session completed, milestone reached)
 */
export async function hapticSuccess(): Promise<void> {
  const prefs = usePreferencesStore.getState();
  if (!prefs.hapticsEnabled) return;

  if (isNativeMobile()) {
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch {
      // Ignore
    }
  } else {
    webVibrateFallback([25, 40, 45]);
  }
}

/**
 * Warning haptic vibration (give up confirmation, strict mode exit warning)
 */
export async function hapticWarning(): Promise<void> {
  const prefs = usePreferencesStore.getState();
  if (!prefs.hapticsEnabled || !prefs.hapticOnWarning) return;

  if (isNativeMobile()) {
    try {
      await Haptics.notification({ type: NotificationType.Warning });
    } catch {
      // Ignore
    }
  } else {
    webVibrateFallback([40, 60, 40]);
  }
}

/**
 * Direct tester for Haptics preference configuration
 */
export async function testHaptic(intensity: 'light' | 'medium' | 'heavy'): Promise<void> {
  if (isNativeMobile()) {
    try {
      const style =
        intensity === 'heavy'
          ? ImpactStyle.Heavy
          : intensity === 'medium'
          ? ImpactStyle.Medium
          : ImpactStyle.Light;
      await Haptics.impact({ style });
    } catch {
      // Ignore
    }
  } else {
    const duration = intensity === 'heavy' ? 45 : intensity === 'medium' ? 30 : 15;
    webVibrateFallback(duration);
  }
}

/**
 * Adjust mobile status bar according to current time of day / theme
 */
export async function syncMobileStatusBar(isDarkTheme: boolean): Promise<void> {
  if (!isNativeMobile()) return;
  try {
    await StatusBar.setStyle({
      style: isDarkTheme ? Style.Dark : Style.Light,
    });
  } catch {
    // Ignore unsupported browser environments
  }
}

let wakeLockSentinel: any = null;

/**
 * Requests the device screen to stay awake during active focus sessions.
 */
export async function requestScreenWakeLock(): Promise<void> {
  if (typeof window === 'undefined' || !('wakeLock' in navigator)) return;
  try {
    if (!wakeLockSentinel) {
      wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      wakeLockSentinel.addEventListener('release', () => {
        wakeLockSentinel = null;
      });
    }
  } catch {
    // Battery saver or background tabs may reject; safely ignore
  }
}

/**
 * Releases the screen wake lock when a focus session ends or is abandoned.
 */
export async function releaseScreenWakeLock(): Promise<void> {
  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release();
    } catch {
      // Ignore
    }
    wakeLockSentinel = null;
  }
}
