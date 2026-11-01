'use client';

import { Capacitor } from '@capacitor/core';
import { SUBSCRIPTION_PACKAGES, SubscriptionTier, UserSubscription } from '@/types/subscription';
import { supabase } from '@/lib/supabase/client';

export interface StoreKitPurchaseResult {
  success: boolean;
  cancelled?: boolean;
  subscription?: Partial<UserSubscription>;
  error?: string;
}

let isRevenueCatConfigured = false;

async function loadRevenueCatModule(): Promise<any> {
  try {
    const dynamicImporter = new Function('m', 'return import(m)');
    return await dynamicImporter('@revenuecat/purchases-capacitor');
  } catch {
    return null;
  }
}

async function ensureRevenueCatConfigured(): Promise<any> {
  const rcModule = await loadRevenueCatModule();
  const Purchases = rcModule?.Purchases;
  if (!Purchases) return null;

  if (!isRevenueCatConfigured) {
    const apiKey =
      process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY ||
      process.env.NEXT_PUBLIC_REVENUECAT_API_KEY ||
      '';
    if (!apiKey) {
      return null;
    }
    await Purchases.configure({ apiKey });
    isRevenueCatConfigured = true;
  }
  return Purchases;
}

async function syncSubscriptionToSupabase(sub: Partial<UserSubscription>) {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return;
    await supabase.from('user_subscriptions').upsert({
      user_id: session.user.id,
      tier: sub.tier || 'free',
      status: sub.status || 'active',
      is_pro: Boolean(sub.isPro),
      expires_at: sub.expiresAt || null,
      store: sub.store || 'app_store',
      real_trees_pledged: sub.realTreesPledged ?? 0,
      pioneer_badge: Boolean(sub.pioneerBadge),
      tree_certificate_id: sub.treeCertificateId || null,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // ignore offline or table error
  }
}

function buildSubscriptionPayload(
  tier: SubscriptionTier,
  expiresAtIso: string | null,
  store: 'app_store' | 'play_store' | 'stripe' | 'promo'
): Partial<UserSubscription> {
  const isLifetime = tier === 'pioneer_lifetime';
  const isAnnual = tier === 'pro_annual';
  return {
    tier,
    status: isLifetime ? 'lifetime' : 'active',
    isPro: true,
    expiresAt: isLifetime
      ? null
      : expiresAtIso ||
        new Date(Date.now() + (isAnnual ? 365 : 30) * 86400 * 1000).toISOString(),
    originalPurchaseDate: new Date().toISOString(),
    store,
    realTreesPledged: isLifetime ? 2 : isAnnual ? 1 : 0,
    pioneerBadge: isLifetime,
    treeCertificateId:
      isLifetime || isAnnual
        ? `RMB-CONS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
        : undefined,
    treeLocation:
      isLifetime || isAnnual
        ? 'Hutan Konservasi Mangrove Trimulyo, Jawa Tengah'
        : undefined,
    treeCoordinates: isLifetime || isAnnual ? [-6.9538, 110.4285] : undefined,
  };
}

export async function purchaseSubscriptionTier(
  tier: SubscriptionTier,
  isEn = false
): Promise<StoreKitPurchaseResult> {
  const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();
  const productConfig =
    tier === 'pioneer_lifetime'
      ? SUBSCRIPTION_PACKAGES.lifetime
      : tier === 'pro_annual'
        ? SUBSCRIPTION_PACKAGES.annual
        : SUBSCRIPTION_PACKAGES.monthly;

  if (isNative) {
    try {
      const Purchases = await ensureRevenueCatConfigured();
      if (!Purchases) {
        return {
          success: false,
          error: isEn
            ? 'App Store billing is temporarily unavailable on this build. Please try again later.'
            : 'Layanan pembayaran App Store sedang tidak tersedia pada versi ini. Silakan coba beberapa saat lagi.',
        };
      }

      const offerings = await Purchases.getOfferings();
      const availablePackages: any[] = offerings?.current?.availablePackages || [];
      const matchingPkg = availablePackages.find(
        (p) =>
          p?.product?.identifier === productConfig.id ||
          p?.identifier === productConfig.id ||
          p?.product?.identifier?.includes(tier)
      );

      let customerInfo: any;
      if (matchingPkg) {
        const res = await Purchases.purchasePackage({ aPackage: matchingPkg });
        customerInfo = res?.customerInfo;
      } else if (typeof Purchases.purchaseStoreProduct === 'function') {
        const { products } = await Purchases.getProducts({
          productIdentifiers: [productConfig.id],
        });
        if (!products || products.length === 0) {
          return {
            success: false,
            error: isEn
              ? 'Subscription product is being synchronized with App Store Connect. Please try again shortly.'
              : 'Produk langganan sedang disinkronkan dengan App Store Connect. Silakan coba sesaat lagi.',
          };
        }
        const res = await Purchases.purchaseStoreProduct({ product: products[0] });
        customerInfo = res?.customerInfo;
      }

      const activeEntitlements = customerInfo?.entitlements?.active || {};
      const hasProEntitlement =
        Boolean(activeEntitlements['pro']) ||
        Boolean(activeEntitlements['rimba_pro']) ||
        Object.keys(activeEntitlements).length > 0;

      if (!hasProEntitlement) {
        return {
          success: false,
          error: isEn
            ? 'Purchase was not completed by the App Store.'
            : 'Transaksi tidak diselesaikan oleh App Store.',
        };
      }

      const firstEntitlement: any = Object.values(activeEntitlements)[0];
      const expiresAt = firstEntitlement?.expirationDate || null;
      const storeType = Capacitor.getPlatform() === 'ios' ? 'app_store' : 'play_store';
      const subPayload = buildSubscriptionPayload(tier, expiresAt, storeType);
      await syncSubscriptionToSupabase(subPayload);

      return {
        success: true,
        subscription: subPayload,
      };
    } catch (err: any) {
      const msg = String(err?.message || err || '').toLowerCase();
      if (err?.userCancelled || msg.includes('cancel')) {
        return { success: false, cancelled: true };
      }
      return {
        success: false,
        error:
          err?.message ||
          (isEn
            ? 'Could not complete App Store purchase.'
            : 'Gagal memproses pembelian di App Store.'),
      };
    }
  }

  // Non-native Web / Local Development Sandbox ONLY (never runs on native iOS App Store builds)
  if (process.env.NODE_ENV !== 'production') {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const subPayload = buildSubscriptionPayload(tier, null, 'promo');
    return {
      success: true,
      subscription: subPayload,
    };
  }

  return {
    success: false,
    error: isEn
      ? 'In-App Purchases are only available inside the Rimba iOS / Android app.'
      : 'Pembelian dalam aplikasi hanya tersedia melalui aplikasi Rimba di iOS / Android.',
  };
}

export async function restoreStoreKitPurchases(
  isEn = false
): Promise<StoreKitPurchaseResult> {
  const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();

  if (isNative) {
    try {
      const Purchases = await ensureRevenueCatConfigured();
      if (Purchases) {
        const res = await Purchases.restorePurchases();
        const customerInfo = res?.customerInfo || res;
        const activeEntitlements = customerInfo?.entitlements?.active || {};
        const activeKeys = Object.keys(activeEntitlements);

        if (activeKeys.length > 0) {
          const firstEntitlement: any = activeEntitlements[activeKeys[0]];
          const prodId = String(firstEntitlement?.productIdentifier || '');
          const tier: SubscriptionTier = prodId.includes('lifetime')
            ? 'pioneer_lifetime'
            : prodId.includes('monthly')
              ? 'pro_monthly'
              : 'pro_annual';
          const storeType = Capacitor.getPlatform() === 'ios' ? 'app_store' : 'play_store';
          const subPayload = buildSubscriptionPayload(
            tier,
            firstEntitlement?.expirationDate || null,
            storeType
          );
          await syncSubscriptionToSupabase(subPayload);
          return {
            success: true,
            subscription: subPayload,
          };
        }
      }
    } catch (err: any) {
      console.warn('RevenueCat restore error:', err);
    }
  }

  // Fallback check against authenticated user's cloud subscription table
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: cloudSub } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (cloudSub && cloudSub.is_pro) {
        const isExpired =
          cloudSub.expires_at && new Date(cloudSub.expires_at).getTime() <= Date.now();
        if (!isExpired) {
          return {
            success: true,
            subscription: {
              tier: (cloudSub.tier as SubscriptionTier) || 'pro_annual',
              status: cloudSub.status || 'active',
              isPro: true,
              expiresAt: cloudSub.expires_at || null,
              store: cloudSub.store || 'app_store',
              realTreesPledged: cloudSub.real_trees_pledged ?? 1,
              pioneerBadge: Boolean(cloudSub.pioneer_badge),
              treeCertificateId: cloudSub.tree_certificate_id || undefined,
            },
          };
        }
      }
    }
  } catch {
    // ignore
  }

  return {
    success: false,
    error: isEn
      ? 'No active Rimba Pro subscription or previous purchase was found for this account.'
      : 'Tidak ditemukan langganan Rimba Pro aktif atau riwayat pembelian pada akun ini.',
  };
}
