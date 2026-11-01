'use client';

import { Capacitor } from '@capacitor/core';
import type { CustomerInfo, PurchasesStoreProduct } from '@revenuecat/purchases-capacitor';
import { SUBSCRIPTION_PACKAGES, SubscriptionTier, UserSubscription } from '@/types/subscription';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/auth/useAuthStore';

export interface StoreKitPurchaseResult {
  success: boolean;
  cancelled?: boolean;
  subscription?: Partial<UserSubscription>;
  error?: string;
}

let configuredUserId: string | null = null;
let configurationQueue: Promise<void> = Promise.resolve();
const productsByTier = {
  pro_monthly: SUBSCRIPTION_PACKAGES.monthly.id,
  pro_annual: SUBSCRIPTION_PACKAGES.annual.id,
  pioneer_lifetime: SUBSCRIPTION_PACKAGES.lifetime.id,
} as const;
type PaidTier = keyof typeof productsByTier;

async function isCurrentUser(userId: string): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = useAuthStore.getState().user;
  return session?.user.id === userId && user?.id === userId && !user.isGuest;
}

async function storeContext() {
  if (!Capacitor.isNativePlatform()) throw new Error('Purchases are available in the Rimba mobile app.');
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user.id;
  if (!userId || !(await isCurrentUser(userId))) throw new Error('Sign in to Rimba before purchasing or restoring.');
  const ios = Capacitor.getPlatform() === 'ios';
  const apiKey = ios ? process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY : process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY;
  if (!apiKey || !apiKey.startsWith(ios ? 'appl_' : 'goog_')) throw new Error('Store billing is not configured on this build.');
  // Literal import is bundled by Next; new Function(import) left the SDK outside the app.
  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  const configure = configurationQueue.then(async () => {
    if (!(await isCurrentUser(userId))) throw new Error('Account changed. Please try again.');
    if (!configuredUserId) await Purchases.configure({ apiKey, appUserID: userId });
    else if (configuredUserId !== userId) await Purchases.logIn({ appUserID: userId });
    configuredUserId = userId;
  });
  configurationQueue = configure.catch(() => {});
  await configure;
  if (!(await isCurrentUser(userId))) throw new Error('Account changed. Please try again.');
  return { Purchases, userId };
}

function subscriptionFromCustomerInfo(info: CustomerInfo, expectedTier?: PaidTier): Partial<UserSubscription> | null {
  const entitlement = info?.entitlements?.active?.rimba_pro;
  if (!entitlement?.isActive || String(entitlement.verification) === 'FAILED') return null;
  const tier = (Object.keys(productsByTier) as PaidTier[]).find(key => productsByTier[key] === entitlement.productIdentifier);
  if (!tier || (expectedTier && tier !== expectedTier)) return null;
  const lifetime = tier === 'pioneer_lifetime';
  const expiresAt = entitlement.expirationDate;
  if (!lifetime && (!expiresAt || !Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now())) return null;
  return {
    tier,
    status: lifetime ? 'lifetime' : entitlement.periodType === 'TRIAL' ? 'trialing' : entitlement.willRenew ? 'active' : 'canceled',
    isPro: true,
    expiresAt: lifetime ? null : expiresAt,
    originalPurchaseDate: entitlement.originalPurchaseDate,
    productId: entitlement.productIdentifier,
    store: Capacitor.getPlatform() === 'ios' ? 'app_store' : 'play_store',
    realTreesPledged: 0,
    pioneerBadge: lifetime,
    treeCertificateId: undefined,
    treeLocation: undefined,
    treeCoordinates: undefined,
  };
}

function failed(error: unknown, isEn: boolean): StoreKitPurchaseResult {
  const details = error as { userCancelled?: boolean; code?: string; message?: string };
  if (details?.userCancelled || details?.code === '1' || /cancel/i.test(details?.message || '')) return { success: false, cancelled: true };
  return { success: false, error: details?.message || (isEn ? 'Store request failed. Please try again.' : 'Permintaan toko gagal. Silakan coba lagi.') };
}

export async function getStoreProducts(): Promise<PurchasesStoreProduct[]> {
  const { Purchases } = await storeContext();
  const { products } = await Purchases.getProducts({ productIdentifiers: Object.values(productsByTier) });
  return products.filter(product => Object.values(productsByTier).some(id => id === product.identifier));
}

export async function purchaseSubscriptionTier(tier: SubscriptionTier, isEn = false): Promise<StoreKitPurchaseResult> {
  if (tier === 'free') return { success: false, error: isEn ? 'Choose a paid plan.' : 'Pilih paket berbayar.' };
  try {
    const { Purchases, userId } = await storeContext();
    const productId = productsByTier[tier];
    const offerings = await Purchases.getOfferings();
    const aPackage = offerings.current?.availablePackages.find(pkg => pkg.product.identifier === productId);
    let customerInfo: CustomerInfo;
    if (aPackage) {
      if (!(await isCurrentUser(userId))) throw new Error('Account changed. Please try again.');
      ({ customerInfo } = await Purchases.purchasePackage({ aPackage }));
    } else {
      const { products } = await Purchases.getProducts({ productIdentifiers: [productId] });
      const product = products.find(item => item.identifier === productId);
      if (!product) throw new Error(isEn ? 'This product is not available in your store.' : 'Produk belum tersedia di toko Anda.');
      if (!(await isCurrentUser(userId))) throw new Error('Account changed. Please try again.');
      ({ customerInfo } = await Purchases.purchaseStoreProduct({ product }));
    }
    if (!(await isCurrentUser(userId))) throw new Error('Account changed. Restore purchases after signing in again.');
    const subscription = subscriptionFromCustomerInfo(customerInfo, tier);
    if (!subscription) throw new Error(isEn ? 'No valid Rimba Pro entitlement was returned.' : 'Toko belum mengembalikan hak akses Rimba Pro yang valid.');
    // Server mirrors are updated only by a verified RevenueCat backend integration.
    return { success: true, subscription };
  } catch (error) { return failed(error, isEn); }
}

export async function restoreStoreKitPurchases(isEn = false): Promise<StoreKitPurchaseResult> {
  try {
    const { Purchases, userId } = await storeContext();
    const { customerInfo } = await Purchases.restorePurchases();
    if (!(await isCurrentUser(userId))) throw new Error('Account changed. Please try again.');
    const subscription = subscriptionFromCustomerInfo(customerInfo);
    if (!subscription) throw new Error(isEn ? 'No active Rimba Pro purchase was found.' : 'Tidak ditemukan pembelian Rimba Pro aktif.');
    return { success: true, subscription };
  } catch (error) { return failed(error, isEn); }
}
