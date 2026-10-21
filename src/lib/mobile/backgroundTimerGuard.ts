'use client';

import { App, AppState } from '@capacitor/app';
import { useGameStore } from '@/lib/game/useGameStore';
import { isNativeMobile, hapticLight, hapticSuccess, hapticWarning } from './nativeBridge';
import {
  fireStrictWarningNotification,
  dismissStrictWarningNotification,
  fireFocusPausedNotification,
  dismissFocusPausedNotification,
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

  // 1. Check cold-boot recovery after app was killed or restarted
  try {
    const strictLeftAtStr = localStorage.getItem('rimba_strict_left_at');
    const store = useGameStore.getState();
    const active = store.activeSession;

    if (strictLeftAtStr) {
      localStorage.removeItem('rimba_strict_left_at');
      const leftAt = parseInt(strictLeftAtStr, 10);
      if (active && active.strict_mode && !active.is_paused) {
        const elapsed = Math.round((Date.now() - leftAt) / 1000);
        if (elapsed >= 10) {
          console.warn(`[BackgroundTimerGuard] App restarted after ${elapsed}s away in Strict Mode. Tree withered.`);
          store.abandonFocus();
          hapticWarning();
        }
      }
    }

    // Normal mode cold-boot: if app was force-closed while active, ensure it is paused
    const normalLeftAtStr = localStorage.getItem('rimba_normal_left_at');
    if (normalLeftAtStr) {
      localStorage.removeItem('rimba_normal_left_at');
      const currentActive = useGameStore.getState().activeSession;
      if (currentActive && currentActive.status === 'active' && !currentActive.strict_mode && !currentActive.is_paused) {
        console.log('[BackgroundTimerGuard] App restored after close in Normal Mode. Freezing timer in paused state.');
        store.pauseFocus();
      }
    }
  } catch {}

  const handleAppBackgrounded = () => {
    const store = useGameStore.getState();
    const active = store.activeSession;

    if (!active || active.status !== 'active') return;

    // Check if session is already completed or within 1s of completion
    const isFinished =
      !active.is_stopwatch &&
      Date.now() >= new Date(active.expected_end_at).getTime() - 1000;

    if (isFinished) return;

    if (active.strict_mode) {
      // STRICT MODE: 10-second grace period with urgent warning notification
      if (!active.is_paused) {
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
            console.warn('[BackgroundTimerGuard] Strict mode grace period expired. Tree withered.');
            currentStore.abandonFocus();
            hapticWarning();
          }
          isGracePeriodActive = false;
          try {
            localStorage.removeItem('rimba_strict_left_at');
          } catch {}
        }, 10000); // 10 seconds grace period
      }
    } else {
      // NORMAL MODE: Auto-pause session so timer freezes and doesn't run down in background
      if (!active.is_paused) {
        try {
          localStorage.setItem('rimba_normal_left_at', Date.now().toString());
        } catch {}
        store.pauseFocus();
        fireFocusPausedNotification();
      }
    }
  };

  const handleAppResumed = () => {
    // Dismiss any active pause notification
    dismissFocusPausedNotification();

    // If returning from background in Strict Mode:
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
        return;
      } else {
        hapticLight();
        console.log(`[BackgroundTimerGuard] Returned safely in ${elapsed}s. Tree saved.`);
      }
    } else {
      try {
        localStorage.removeItem('rimba_strict_left_at');
      } catch {}
    }

    try {
      localStorage.removeItem('rimba_normal_left_at');
    } catch {}

    // Note: Background auto-harvest has been intentionally removed.
    // Trees must never be automatically harvested in background without user presence!
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
