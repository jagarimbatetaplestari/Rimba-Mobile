'use client';

import { Capacitor } from '@capacitor/core';
import type { CustomerInfo, PurchasesStoreProduct } from '@revenuecat/purchases-capacitor';
import { SUBSCRIPTION_PACKAGES, SubscriptionTier, UserSubscription } from '@/types/subscription';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore, getAuthSessionRevision } from '@/lib/auth/useAuthStore';

export interface StoreKitPurchaseResult {
  success: boolean;
  cancelled?: boolean;
  superseded?: boolean;
  pendingConfirmation?: boolean;
  ownerId?: string;
  sessionRevision?: number;
  subscription?: Partial<UserSubscription>;
  error?: string;
}

let purchaseRevision=0;
let configuredUserId: string | null = null;
let configurationQueue: Promise<void> = Promise.resolve();
const productsByTier = {
  pro_monthly: SUBSCRIPTION_PACKAGES.monthly.id,
  pro_annual: SUBSCRIPTION_PACKAGES.annual.id,
  pioneer_lifetime: SUBSCRIPTION_PACKAGES.lifetime.id,
} as const;
type PaidTier = keyof typeof productsByTier;

async function isCurrentUser(userId: string, revision: number): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = useAuthStore.getState().user;
  return revision === getAuthSessionRevision() && session?.user.id === userId && user?.id === userId && !user.isGuest;
}

async function storeContext() {
  const revision = getAuthSessionRevision();
  if (!Capacitor.isNativePlatform()) throw new Error('Purchases are available in the Rimba mobile app.');
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user.id;
  if (!userId || !(await isCurrentUser(userId, revision))) throw new Error('Sign in to Rimba before purchasing or restoring.');
  const ios = Capacitor.getPlatform() === 'ios';
  const apiKey = ios ? process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY : process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY;
  if (!apiKey || !apiKey.startsWith(ios ? 'appl_' : 'goog_')) throw new Error('Store billing is not configured on this build.');
  // Literal import is bundled by Next; new Function(import) left the SDK outside the app.
  const { Purchases, ENTITLEMENT_VERIFICATION_MODE } = await import('@revenuecat/purchases-capacitor');
  const configure = configurationQueue.then(async () => {
    if (!(await isCurrentUser(userId, revision))) throw new Error('Account changed. Please try again.');
    if (!configuredUserId) await Purchases.configure({ apiKey, appUserID: userId, entitlementVerificationMode: ENTITLEMENT_VERIFICATION_MODE.INFORMATIONAL });
    else if (configuredUserId !== userId) await Purchases.logIn({ appUserID: userId });
    configuredUserId = userId;
  });
  configurationQueue = configure.catch(() => {});
  await configure;
  if (!(await isCurrentUser(userId, revision))) throw new Error('Account changed. Please try again.');
  return { Purchases, userId, revision };
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


class VerificationTransportError extends Error {}
async function reconcileWithRetry(environment:string,userId:string,revision:number) {
  for(let attempt=0;;attempt++) {
    if(!(await isCurrentUser(userId,revision)))throw new Error('Account changed. Restore purchases after signing in again.');
    const result=await supabase.functions.invoke('reconcile-subscription',{body:{environment}});
    const temporary=result.error&&(result.error.name==='FunctionsFetchError'||result.error.context?.status===503);
    if(!temporary||attempt===2)return result;
    await new Promise(resolve=>setTimeout(resolve,750*(attempt+1)));
  }
}
export const freeStoreSubscription = (): Partial<UserSubscription> => ({tier:'free',status:'none',isPro:false,expiresAt:null,productId:undefined,store:'promo',realTreesPledged:0,pioneerBadge:false,treeCertificateId:undefined,treeLocation:undefined,treeCoordinates:undefined});
async function confirmSubscription(info:CustomerInfo,candidate:Partial<UserSubscription>,userId:string,revision:number,isEn:boolean,requirePaid=true):Promise<Partial<UserSubscription>> {
  const environment=info.entitlements.active.rimba_pro?.isSandbox?'sandbox':'production';
  const {data,error}=await reconcileWithRetry(environment,userId,revision);
  if(!(await isCurrentUser(userId,revision)))throw new Error('Account changed. Restore purchases after signing in again.');
  if(error){
    if(error.name==='FunctionsFetchError'||error.context?.status===503)throw new VerificationTransportError('Purchase verification unavailable');
    throw new Error('Purchase verification could not complete. Try Restore Purchases when online.');
  }
  const state=data?.subscription;
  if(!requirePaid&&state?.environment===environment&&state.isPro===false&&state.tier==='free'&&['none','expired'].includes(state.status)&&state.expiresAt===null)return {...freeStoreSubscription(),status:state.status};
  const validTier=state&&Object.prototype.hasOwnProperty.call(productsByTier,state.tier);
  const lifetime=state?.tier==='pioneer_lifetime';
  if(error||!validTier||state.isPro!==true||state.environment!==environment||
     state.productId!==productsByTier[state.tier as PaidTier]||
     !['app_store','play_store'].includes(state.store)||
     (lifetime?(state.status!=='lifetime'||state.expiresAt!==null):
       (!['active','trialing','canceled','grace_period'].includes(state.status)||typeof state.expiresAt!=='string'||!Number.isFinite(Date.parse(state.expiresAt))||Date.parse(state.expiresAt)<=Date.now()))) {
    throw new Error(isEn?'Store request received, but verification is not complete. Do not purchase again; try Restore Purchases when online.':'Permintaan toko diterima, tetapi verifikasi belum selesai. Jangan membeli lagi; coba Pulihkan Pembelian saat online.');
  }
  return {...candidate,tier:state.tier,status:state.status,expiresAt:state.expiresAt,productId:state.productId,store:state.store,isPro:true,
    pioneerBadge:lifetime,realTreesPledged:0,treeCertificateId:undefined,treeLocation:undefined,treeCoordinates:undefined};
}

async function confirmStoreResult(info:CustomerInfo,userId:string,revision:number,isEn:boolean,expectedTier?:PaidTier):Promise<Partial<UserSubscription>> {
 const candidate=subscriptionFromCustomerInfo(info,expectedTier);
 const native=info.entitlements.active.rimba_pro;
 const nativeTier=native&&(Object.keys(productsByTier) as PaidTier[]).find(t=>productsByTier[t]===native.productIdentifier);
 if(!candidate&&(!native?.isActive||!nativeTier||(expectedTier&&nativeTier!==expectedTier)||String(native.verification)==='FAILED'||!native.expirationDate||!Number.isFinite(Date.parse(native.expirationDate))))throw new Error(isEn?'No valid Rimba Pro purchase was returned.':'Tidak ditemukan pembelian Rimba Pro yang valid.');
 const verified=await confirmSubscription(info,candidate??freeStoreSubscription(),userId,revision,isEn);
 if(!candidate&&verified.status!=='grace_period')throw new Error(isEn?'No active store entitlement was found.':'Tidak ditemukan hak akses toko yang aktif.');
 return verified;
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
  purchaseRevision++;
  let storeAccepted=false;
  try {
    const { Purchases, userId, revision } = await storeContext();
    const productId = productsByTier[tier];
    const offerings = await Purchases.getOfferings();
    const aPackage = offerings.current?.availablePackages.find(pkg => pkg.product.identifier === productId);
    let customerInfo: CustomerInfo;
    if (aPackage) {
      if (!(await isCurrentUser(userId, revision))) throw new Error('Account changed. Please try again.');
      ({ customerInfo } = await Purchases.purchasePackage({ aPackage }));
    } else {
      const { products } = await Purchases.getProducts({ productIdentifiers: [productId] });
      const product = products.find(item => item.identifier === productId);
      if (!product) throw new Error(isEn ? 'This product is not available in your store.' : 'Produk belum tersedia di toko Anda.');
      if (!(await isCurrentUser(userId, revision))) throw new Error('Account changed. Please try again.');
      ({ customerInfo } = await Purchases.purchaseStoreProduct({ product }));
    }
    storeAccepted=true;
    if (!(await isCurrentUser(userId, revision))) throw new Error('Account changed. Restore purchases after signing in again.');
    return { success: true, ownerId:userId, sessionRevision:revision, subscription:await confirmStoreResult(customerInfo,userId,revision,isEn,tier) };
  } catch (error) { return {...failed(error, isEn),...(storeAccepted?{pendingConfirmation:true}:{})}; }
}

export async function restoreStoreKitPurchases(isEn = false): Promise<StoreKitPurchaseResult> {
  purchaseRevision++;
  let storeReturned=false;
  try {
    const { Purchases, userId, revision } = await storeContext();
    const { customerInfo } = await Purchases.restorePurchases();
    storeReturned=Boolean(customerInfo.entitlements.active.rimba_pro?.isActive);
    if (!(await isCurrentUser(userId, revision))) throw new Error('Account changed. Please try again.');
    return { success: true, ownerId:userId, sessionRevision:revision, subscription:await confirmStoreResult(customerInfo,userId,revision,isEn) };
  } catch (error) { return {...failed(error, isEn),...(storeReturned?{pendingConfirmation:true}:{})}; }
}

/** Refresh is read-only with respect to the store: never starts a purchase or restore sheet. */
export async function refreshStoreKitSubscription():Promise<StoreKitPurchaseResult>{
  const purchaseGeneration=purchaseRevision;
  try{
    const {Purchases,userId,revision}=await storeContext();
    const {customerInfo}=await Purchases.getCustomerInfo();
    if(!(await isCurrentUser(userId,revision)))throw new Error('Account changed');
    const candidate=subscriptionFromCustomerInfo(customerInfo);
    try{
      const subscription=await confirmSubscription(customerInfo,candidate??freeStoreSubscription(),userId,revision,false,false);
      if(purchaseGeneration!==purchaseRevision)return {success:false,superseded:true};
      return {success:true,ownerId:userId,sessionRevision:revision,subscription};
    }catch(error){
      const verification=String(customerInfo.entitlements.active.rimba_pro?.verification);
      const age=Date.now()-Date.parse(customerInfo.requestDate);
      if(error instanceof VerificationTransportError&&candidate&&['VERIFIED','VERIFIED_ON_DEVICE'].includes(verification)&&Number.isFinite(age)&&age>=-300000&&age<=86400000&&await isCurrentUser(userId,revision))return purchaseGeneration!==purchaseRevision?{success:false,superseded:true}:{success:true,ownerId:userId,sessionRevision:revision,subscription:candidate};
      throw error;
    }
  }catch(error){return purchaseGeneration!==purchaseRevision?{success:false,superseded:true}:failed(error,false);}
}

export function isStoreResultCurrent(result:StoreKitPurchaseResult):boolean {
 const user=useAuthStore.getState().user;
 return !!user&&!user.isGuest&&result.ownerId===user.id&&result.sessionRevision===getAuthSessionRevision();
}
