'use client';

import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useGameStore } from '@/lib/game/useGameStore';

export interface ActiveModalHandler {
  isOpen: boolean;
  close: () => void;
}

export interface UseAndroidBackButtonProps {
  activeModals: ActiveModalHandler[];
  isZenMode: boolean;
  exitZenMode: () => void;
}

/**
 * Handles Android hardware back button and navigation gestures via Capacitor App plugin.
 * Prioritizes closing open inspection sheets, workshop panels, and modals before exiting the app.
 */
export function useAndroidBackButton({
  activeModals,
  isZenMode,
  exitZenMode,
}: UseAndroidBackButtonProps): void {
  const lastBackPressRef = useRef<number>(0);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return;
    }

    const backListenerPromise = App.addListener('backButton', () => {
      const gameStore = useGameStore.getState();

      // 1. Close 3D object inspection drawer if active
      if (gameStore.selectedObject) {
        gameStore.setSelectedObject(null);
        return;
      }

      // 2. Close nature workshop placement or relocation if active
      if (gameStore.selectedCatalogItem || gameStore.relocatingObjectId) {
        useGameStore.setState({
          selectedCatalogItem: null,
          relocatingObjectId: null,
          hoveredGridTile: null,
        });
        return;
      }

      // 3. Exit Zen Mode overlay if engaged
      if (isZenMode) {
        exitZenMode();
        return;
      }

      // 4. Close any currently active modal layer
      for (const modal of activeModals) {
        if (modal.isOpen) {
          modal.close();
          return;
        }
      }

      // 5. On root screen: require double tap within 2 seconds to minimize/exit
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        App.exitApp();
      } else {
        lastBackPressRef.current = now;
        gameStore.notify('Tekan sekali lagi untuk keluar dari Rimba', 'info');
      }
    });

    return () => {
      backListenerPromise.then((handle) => handle.remove()).catch(() => {});
    };
  }, [activeModals, isZenMode, exitZenMode]);
}
