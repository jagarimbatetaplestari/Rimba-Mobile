'use client';

import { useGameStore } from '@/lib/game/useGameStore';
import { Entitlements, PaywallGateSource, SubscriptionTier } from '@/types/subscription';

const FREE_MAX_ISLANDS = 1;
const PRO_MAX_ISLANDS = 5;

/**
 * Hook terpusat untuk memeriksa status hak akses (Entitlements) Rimba Pro
 */
export function useEntitlements(): Entitlements & {
  tier: SubscriptionTier;
  realTreesPledged: number;
  pioneerBadge: boolean;
  treeCertificateId?: string;
  triggerPaywall: (source: PaywallGateSource) => void;
  grantProForTesting: (tier?: SubscriptionTier) => void;
} {
  const subscription = useGameStore((state) => state.saveData.subscription);
  const islandsCount = useGameStore((state) => (state.saveData.islands || []).length || 1);
  const grantProForTesting = useGameStore((state) => state.grantProForTesting);

  const isExpired = Boolean(
    subscription?.expiresAt &&
      subscription.status !== 'lifetime' &&
      new Date(subscription.expiresAt).getTime() <= Date.now()
  );

  const isPro = Boolean(
    subscription?.isPro &&
      !isExpired &&
      (subscription.status === 'active' ||
        subscription.status === 'lifetime' ||
        subscription.status === 'grace_period' ||
        subscription.status === 'trialing' ||
        (subscription.status === 'canceled' && Boolean(subscription.expiresAt)))
  );
  const tier: SubscriptionTier = isPro ? subscription?.tier || 'free' : 'free';
  const maxIslands = isPro ? PRO_MAX_ISLANDS : FREE_MAX_ISLANDS;

  const triggerPaywall = (source: PaywallGateSource) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('rimba:open_paywall', {
          detail: { source },
        })
      );
    }
  };

  return {
    isPro,
    entitlements: {
      maxIslands,
      streakShieldMonthlyAllowance: isPro ? 1 : 0,
      multiSoundscapeMixer: isPro,
      exportHiResDiorama: isPro,
      exportAnalyticsCSV: isPro,
      exclusiveTreeCosmetics: isPro,
    },
    tier,
    maxIslands,
    canCreateNewIsland: islandsCount < maxIslands,
    canUseBiome: (biomeId: string) => {
      if (biomeId === 'meadow') return true;
      return isPro;
    },
    canMixAudio: isPro,
    canUseProSocialTemplates: isPro,
    hasUnlimitedJournalHistory: isPro,
    canExportCsv: isPro,
    realTreesPledged: subscription?.realTreesPledged || 0,
    pioneerBadge: subscription?.pioneerBadge || false,
    treeCertificateId: subscription?.treeCertificateId,
    triggerPaywall,
    grantProForTesting,
  };
}
