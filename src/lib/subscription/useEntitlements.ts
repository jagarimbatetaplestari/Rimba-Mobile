import { useMemo } from 'react';
import { useGameStore } from '@/lib/game/useGameStore';
import { RimbaEntitlements, UserSubscription } from '@/types/subscription';

export const DEFAULT_FREE_SUBSCRIPTION: UserSubscription = {
  tier: 'free',
  status: 'none',
  isPro: false,
  expiresAt: null,
  originalPurchaseDate: new Date().toISOString(),
  store: 'promo',
  realTreesPledged: 0,
  pioneerBadge: false,
};

export function getEntitlementsForSubscription(sub?: UserSubscription): RimbaEntitlements {
  const isPro = sub?.isPro ?? false;

  return {
    maxIslands: isPro ? 5 : 1,
    streakShieldMonthlyAllowance: isPro ? 1 : 0,
    multiSoundscapeMixer: isPro,
    exportHiResDiorama: isPro,
    exportAnalyticsCSV: isPro,
    exclusiveTreeCosmetics: isPro,
  };
}

export function useEntitlements() {
  const subscription = useGameStore((state) => state.saveData.subscription) || DEFAULT_FREE_SUBSCRIPTION;
  const islands = useGameStore((state) => state.saveData.islands) || [];

  const entitlements = useMemo(() => {
    return getEntitlementsForSubscription(subscription);
  }, [subscription]);

  const isPro = subscription.isPro;
  const currentIslandCount = islands.length || 1;
  const canCreateNewIsland = currentIslandCount < entitlements.maxIslands;

  const triggerPaywall = (source: string = 'general') => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('rimba:open_paywall', {
          detail: { source },
        })
      );
    }
  };

  return {
    subscription,
    isPro,
    entitlements,
    currentIslandCount,
    maxIslands: entitlements.maxIslands,
    canCreateNewIsland,
    triggerPaywall,
  };
}
