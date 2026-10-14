export type SubscriptionTier = 'free' | 'pro_monthly' | 'pro_annual' | 'pioneer_lifetime';
export type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'expired' | 'none';
export type SubscriptionStore = 'apple_app_store' | 'google_play' | 'web_stripe' | 'promo';

export interface UserSubscription {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  isPro: boolean;
  expiresAt: string | null; // ISO timestamp string or null if lifetime/free
  originalPurchaseDate: string;
  store: SubscriptionStore;
  productId?: string;
  realTreesPledged: number; // Jumlah pohon nyata yang terdaftar atas nama user
  pioneerBadge: boolean;
  treeCertificateId?: string;
  treeLocation?: string;
  treeCoordinates?: [number, number]; // [lat, lng]
}

export interface RimbaEntitlements {
  maxIslands: number;              // Free: 1, Pro: 5
  streakShieldMonthlyAllowance: number; // Free: 0, Pro: 1 otomatis per bulan
  multiSoundscapeMixer: boolean;    // Free: false (1 track), Pro: true (dual-track)
  exportHiResDiorama: boolean;      // Free: watermark, Pro: clean 4K
  exportAnalyticsCSV: boolean;      // Free: false, Pro: true
  exclusiveTreeCosmetics: boolean;  // Free: false, Pro: true
}

export const SUBSCRIPTION_PACKAGES = {
  monthly: {
    id: 'rimba_pro_monthly',
    tier: 'pro_monthly' as SubscriptionTier,
    priceIdr: 29000,
    priceFormattedIdr: 'Rp 29.000',
    priceUsd: 1.99,
    priceFormattedUsd: '$1.99',
    period: 'monthly',
    realTreesIncluded: 0,
  },
  annual: {
    id: 'rimba_pro_annual',
    tier: 'pro_annual' as SubscriptionTier,
    priceIdr: 179000,
    priceFormattedIdr: 'Rp 179.000',
    priceUsd: 14.99,
    priceFormattedUsd: '$14.99',
    period: 'annual',
    realTreesIncluded: 1,
    isPopular: true,
  },
  lifetime: {
    id: 'rimba_pioneer_lifetime',
    tier: 'pioneer_lifetime' as SubscriptionTier,
    priceIdr: 349000,
    priceFormattedIdr: 'Rp 349.000',
    priceUsd: 29.99,
    priceFormattedUsd: '$29.99',
    period: 'lifetime',
    realTreesIncluded: 2,
    badge: 'Perintis Suaka (Pioneer)',
  },
} as const;
