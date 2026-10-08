'use client';

import { LocalNotifications } from '@capacitor/local-notifications';
import { isNativeMobile } from './nativeBridge';
import { usePreferencesStore } from '@/lib/settings/usePreferencesStore';

const FOCUS_COMPLETION_NOTIF_ID = 1001;
const STRICT_WARNING_NOTIF_ID = 1002;
const DAILY_STREAK_NOTIF_ID = 1003;
const TEST_NOTIF_ID = 1004;

/**
 * Checks or requests local notification permissions on iOS/Web
 */
export async function checkOrRequestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  let granted = false;

  if (isNativeMobile()) {
    try {
      const status = await LocalNotifications.checkPermissions();
      if (status.display === 'granted') {
        granted = true;
      } else {
        const req = await LocalNotifications.requestPermissions();
        granted = req.display === 'granted';
      }
    } catch (err) {
      console.warn('[NotificationManager] Failed to request native permissions:', err);
    }
  } else if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      granted = true;
    } else if (Notification.permission !== 'denied') {
      const res = await Notification.requestPermission();
      granted = res === 'granted';
    }
  }

  usePreferencesStore.getState().setHasNotificationPermission(granted);
  return granted;
}

/**
 * Schedules a notification when a focus session is due to complete
 */
export async function scheduleFocusCompletionNotification(params: {
  expectedEndAt: Date;
  speciesName: string;
  durationMinutes: number;
}): Promise<void> {
  if (typeof window === 'undefined') return;

  const prefs = usePreferencesStore.getState();
  if (!prefs.notificationsEnabled || !prefs.notifyOnFocusComplete) return;

  const { expectedEndAt, speciesName, durationMinutes } = params;
  const triggerMs = expectedEndAt.getTime();
  const nowMs = Date.now();

  if (triggerMs <= nowMs) return;

  if (isNativeMobile()) {
    try {
      await cancelPendingFocusNotifications();

      await LocalNotifications.schedule({
        notifications: [
          {
            id: FOCUS_COMPLETION_NOTIF_ID,
            title: '🌲 Sesi Fokus Selesai!',
            body: `Pohon ${speciesName} kamu telah mekar sempurna di Rimba (${durationMinutes} menit). Ketuk untuk mengagumi pulaumu!`,
            schedule: { at: new Date(triggerMs) },
            actionTypeId: 'OPEN_APP',
            extra: {
              type: 'focus_completed',
              speciesName,
              durationMinutes,
            },
          },
        ],
      });
    } catch (err) {
      console.warn('[NotificationManager] Failed to schedule native notification:', err);
    }
  }
}

/**
 * Cancels any scheduled focus completion notifications
 */
export async function cancelPendingFocusNotifications(): Promise<void> {
  if (typeof window === 'undefined') return;

  if (isNativeMobile()) {
    try {
      await LocalNotifications.cancel({
        notifications: [{ id: FOCUS_COMPLETION_NOTIF_ID }],
      });
    } catch {
      // Ignore if none pending
    }
  }
}

/**
 * Fires an urgent notification when user backgrounds the app in Strict Mode
 */
export async function fireStrictWarningNotification(remainingSeconds: number = 10): Promise<void> {
  if (typeof window === 'undefined') return;

  const prefs = usePreferencesStore.getState();
  if (!prefs.notificationsEnabled || !prefs.notifyStreakWarning) return;

  if (isNativeMobile()) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: STRICT_WARNING_NOTIF_ID,
            title: '⚠️ Peringatan Mode Ketat Rimba!',
            body: `Kembali ke Rimba sekarang! Kamu punya waktu ${remainingSeconds} detik sebelum pohonmu layu!`,
            schedule: { at: new Date(Date.now() + 500) }, // Trigger immediately
            actionTypeId: 'OPEN_APP',
            extra: {
              type: 'strict_warning',
            },
          },
        ],
      });
    } catch (err) {
      console.warn('[NotificationManager] Failed to fire strict warning notification:', err);
    }
  }
}

/**
 * Dismisses the strict mode warning notification
 */
export async function dismissStrictWarningNotification(): Promise<void> {
  if (typeof window === 'undefined') return;

  if (isNativeMobile()) {
    try {
      await LocalNotifications.cancel({
        notifications: [{ id: STRICT_WARNING_NOTIF_ID }],
      });
    } catch {
      // Ignore
    }
  }
}

/**
 * Schedules a daily reminder to preserve user's streak
 */
export async function scheduleDailyStreakReminder(
  timeStr: string = '20:00',
  currentStreak: number = 1
): Promise<void> {
  if (typeof window === 'undefined') return;

  const prefs = usePreferencesStore.getState();
  if (!prefs.notificationsEnabled || !prefs.notifyDailyReminder) return;

  const [hoursStr, minutesStr] = timeStr.split(':');
  const targetHour = parseInt(hoursStr || '20', 10);
  const targetMinute = parseInt(minutesStr || '0', 10);

  const targetDate = new Date();
  targetDate.setHours(targetHour, targetMinute, 0, 0);

  // If time already passed today, set to tomorrow
  if (targetDate.getTime() <= Date.now()) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  if (isNativeMobile()) {
    try {
      await cancelDailyStreakReminder();

      await LocalNotifications.schedule({
        notifications: [
          {
            id: DAILY_STREAK_NOTIF_ID,
            title: '🌿 Ritme Suaka Rimba Menunggumu!',
            body: `Streak ${currentStreak} harimu tetap mekar jika kamu menanam setidaknya 1 pohon hari ini. Luangkan sejenak untuk fokus!`,
            schedule: {
              at: targetDate,
              repeats: true,
              every: 'day',
            },
            actionTypeId: 'OPEN_APP',
            extra: {
              type: 'daily_reminder',
            },
          },
        ],
      });
    } catch (err) {
      console.warn('[NotificationManager] Failed to schedule daily reminder:', err);
    }
  }
}

/**
 * Cancels the daily streak reminder
 */
export async function cancelDailyStreakReminder(): Promise<void> {
  if (typeof window === 'undefined') return;

  if (isNativeMobile()) {
    try {
      await LocalNotifications.cancel({
        notifications: [{ id: DAILY_STREAK_NOTIF_ID }],
      });
    } catch {
      // Ignore
    }
  }
}

/**
 * Fires an instant test notification (arrives in 3 seconds) for verification
 */
export async function triggerTestNotification(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const hasPermission = await checkOrRequestNotificationPermission();
  if (!hasPermission) return false;

  if (isNativeMobile()) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: TEST_NOTIF_ID,
            title: '🌲 Uji Notifikasi Rimba Suaka',
            body: 'Notifikasi lokal Apple & Rimba berfungsi sempurna di perangkatmu!',
            schedule: { at: new Date(Date.now() + 3000) },
            actionTypeId: 'OPEN_APP',
          },
        ],
      });
      return true;
    } catch (err) {
      console.warn('[NotificationManager] Failed to trigger test notification:', err);
      return false;
    }
  } else if ('Notification' in window && Notification.permission === 'granted') {
    setTimeout(() => {
      new Notification('🌲 Uji Notifikasi Rimba Suaka', {
        body: 'Notifikasi peramban Rimba berfungsi dengan baik!',
        icon: '/logo-web.webp',
      });
    }, 3000);
    return true;
  }

  return false;
}
