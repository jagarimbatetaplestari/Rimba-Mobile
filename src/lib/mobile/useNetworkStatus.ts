'use client';

import { useState, useEffect } from 'react';
import { scheduleDebouncedCloudSync } from '@/lib/supabase/cloudSync';

export interface NetworkStatus {
  isOnline: boolean;
  justReconnected: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  });

  const [justReconnected, setJustReconnected] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let reconnectedTimer: NodeJS.Timeout | null = null;

    const handleOnline = () => {
      setIsOnline(true);
      setJustReconnected(true);

      // Trigger instant cloud sync to flush offline progress to Supabase
      try {
        scheduleDebouncedCloudSync();
      } catch (err) {
        console.warn('[Rimba Network] Failed to trigger online cloud sync:', err);
      }

      if (reconnectedTimer) clearTimeout(reconnectedTimer);
      reconnectedTimer = setTimeout(() => {
        setJustReconnected(false);
      }, 3500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setJustReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (reconnectedTimer) clearTimeout(reconnectedTimer);
    };
  }, []);

  return { isOnline, justReconnected };
}
