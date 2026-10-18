'use client';

import { App, AppState } from '@capacitor/app';
import { useGameStore } from '@/lib/game/useGameStore';
import { isNativeMobile, hapticLight, hapticSuccess, hapticWarning } from './nativeBridge';
import {
  fireStrictWarningNotification,
  dismissStrictWarningNotification,
  cancelPendingFocusNotifications,
} from './notificationManager';
import { soundManager } from '@/lib/audio/sounds';

let gracePeriodTimeout: NodeJS.Timeout | null = null;
let isGracePeriodActive = false;
let gracePeriodStartTime = 0;

/**
 * Initializes the background timer guard and app state listeners
 */
export function setupBackgroundGuard(): () => void {
  if (typeof window === 'undefined') return () => {};

  // Check if app was cold-booted/reloaded after abandoning Strict Mode
  try {
    const leftAtStr = localStorage.getItem('rimba_strict_left_at');
    if (leftAtStr) {
      localStorage.removeItem('rimba_strict_left_at');
      const leftAt = parseInt(leftAtStr, 10);
      const store = useGameStore.getState();
      const active = store.activeSession;
      if (active && active.strict_mode && !active.is_paused) {
        const elapsed = Math.round((Date.now() - leftAt) / 1000);
        if (elapsed >= 10) {
          console.warn(`[BackgroundTimerGuard] App restarted after ${elapsed}s away in Strict Mode. Tree withered.`);
          store.abandonFocus();
          hapticWarning();
        }
      }
    }
  } catch {}

  const handleAppBackgrounded = () => {
    const store = useGameStore.getState();
    const active = store.activeSession;

    if (!active) return;

    // If Strict Mode is ON and session is still actively running, start 10s grace period
    const isFinished =
      !active.is_stopwatch &&
      Date.now() >= new Date(active.expected_end_at).getTime() - 1000;

    if (active.strict_mode && !active.is_paused && !isFinished) {
      isGracePeriodActive = true;
      gracePeriodStartTime = Date.now();
      try {
        localStorage.setItem('rimba_strict_left_at', gracePeriodStartTime.toString());
      } catch {}

      fireStrictWarningNotification(10);

      if (gracePeriodTimeout) clearTimeout(gracePeriodTimeout);

      gracePeriodTimeout = setTimeout(() => {
        const currentStore = useGameStore.getState();
        if (currentStore.activeSession && isGracePeriodActive) {
          console.warn('[BackgroundTimerGuard] Strict mode grace period expired. Withered tree.');
          currentStore.abandonFocus();
          hapticWarning();
        }
        isGracePeriodActive = false;
        try {
          localStorage.removeItem('rimba_strict_left_at');
        } catch {}
      }, 10000); // 10 seconds grace period
    }
  };

  const handleAppResumed = () => {
    // If returning from background, clear grace period
    if (isGracePeriodActive) {
      const elapsed = Math.round((Date.now() - gracePeriodStartTime) / 1000);
      if (gracePeriodTimeout) {
        clearTimeout(gracePeriodTimeout);
        gracePeriodTimeout = null;
      }
      isGracePeriodActive = false;
      try {
        localStorage.removeItem('rimba_strict_left_at');
      } catch {}
      dismissStrictWarningNotification();

      if (elapsed >= 10) {
        console.warn(`[BackgroundTimerGuard] Strict mode failed. Returned after ${elapsed}s (grace period was 10s). Withered tree.`);
        const store = useGameStore.getState();
        store.abandonFocus();
        hapticWarning();
        return; // Halt immediately: tree withers, do NOT reward or complete session!
      } else {
        hapticLight();
        console.log(`[BackgroundTimerGuard] Returned safely in ${elapsed}s. Tree saved.`);
      }
    } else {
      try {
        localStorage.removeItem('rimba_strict_left_at');
      } catch {}
    }

    // Reconcile focus timer: check if session finished while in background
    const store = useGameStore.getState();
    const active = store.activeSession;

    if (active) {
      const expectedEnd = new Date(active.expected_end_at).getTime();
      const now = Date.now();

      // Stopwatch sessions do not have a fixed end time and must never auto-complete on background resume
      if (!active.is_stopwatch && now >= expectedEnd) {
        console.log('[BackgroundTimerGuard] Session completed while in background. Harvesting tree.');
        cancelPendingFocusNotifications();
        const success = store.completeFocus();
        if (success) {
          soundManager.playComplete();
          hapticSuccess();
        }
      }
    }
  };

  // 1. Native Capacitor App State listener
  let nativeListenerRemove: (() => void) | null = null;
  if (isNativeMobile()) {
    App.addListener('appStateChange', (state: AppState) => {
      if (!state.isActive) {
        handleAppBackgrounded();
      } else {
        handleAppResumed();
      }
    }).then((handle) => {
      nativeListenerRemove = () => handle.remove();
    }).catch((err) => {
      console.warn('[BackgroundTimerGuard] Failed to add native appStateChange listener:', err);
    });
  }

  // 2. Web Browser Fallback (visibilitychange)
  const handleVisibilityChange = () => {
    if (document.hidden) {
      handleAppBackgrounded();
    } else {
      handleAppResumed();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Return cleanup function
  return () => {
    if (gracePeriodTimeout) clearTimeout(gracePeriodTimeout);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    if (nativeListenerRemove) nativeListenerRemove();
  };
}
