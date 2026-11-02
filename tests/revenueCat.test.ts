import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const m=vi.hoisted(()=>({ id:'a' as string|null, revision:0, invoke:vi.fn(), getInfo:vi.fn(), configure:vi.fn(), login:vi.fn(), offerings:vi.fn(), products:vi.fn(), purchase:vi.fn(), restore:vi.fn(), upsert:vi.fn() }));
vi.mock('@capacitor/core',()=>({Capacitor:{isNativePlatform:()=>true,getPlatform:()=> 'ios'}}));
vi.mock('@revenuecat/purchases-capacitor',()=>({ENTITLEMENT_VERIFICATION_MODE:{INFORMATIONAL:"INFORMATIONAL"},Purchases:{getCustomerInfo:m.getInfo,configure:m.configure,logIn:m.login,getOfferings:m.offerings,getProducts:m.products,purchasePackage:m.purchase,purchaseStoreProduct:m.purchase,restorePurchases:m.restore}}));
vi.mock('../src/lib/supabase/client',()=>({supabase:{functions:{invoke:m.invoke},auth:{getSession:async()=>({data:{session:m.id?{user:{id:m.id}}:null}})},from:()=>({upsert:m.upsert})}}));
vi.mock('../src/lib/auth/useAuthStore',()=>({getAuthSessionRevision:()=>m.revision,useAuthStore:{getState:()=>({user:m.id?{id:m.id,isGuest:false}:null})}}));
let service:typeof import('../src/lib/subscription/revenueCatService');
const info=(entitlement:any,key='rimba_pro')=>({requestDate:new Date().toISOString(),entitlements:{active:{[key]:{isActive:true,productIdentifier:'rimba_pro_annual',expirationDate:'2099-01-01',originalPurchaseDate:'2026-01-01',willRenew:true,...entitlement}}}});
beforeEach(async()=>{vi.resetModules();vi.clearAllMocks();vi.stubGlobal('window',{});vi.stubEnv('NEXT_PUBLIC_REVENUECAT_IOS_KEY','appl_test_public_key');m.id='a';m.revision=0;m.invoke.mockResolvedValue({data:{subscription:{environment:'production',isPro:true,tier:'pro_annual',status:'active',expiresAt:'2099-01-01',productId:'rimba_pro_annual',store:'app_store'}},error:null});m.configure.mockResolvedValue(undefined);m.login.mockResolvedValue({});m.offerings.mockResolvedValue({current:{availablePackages:[{identifier:'annual',product:{identifier:'rimba_pro_annual'}}]}});m.products.mockResolvedValue({products:[{identifier:'rimba_pro_annual'}]});m.purchase.mockResolvedValue({customerInfo:info({})});m.restore.mockResolvedValue({customerInfo:info({})});m.getInfo.mockResolvedValue({customerInfo:info({})});m.upsert.mockResolvedValue({error:null});service=await import('../src/lib/subscription/revenueCatService');});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('does not grant Pro for an unrelated entitlement',async()=>{m.purchase.mockResolvedValue({customerInfo:info({},'unrelated')});expect((await service.purchaseSubscriptionTier('pro_annual')).success).toBe(false);});
it('does not fabricate subscription expiry when the store omits it',async()=>{m.purchase.mockResolvedValue({customerInfo:info({expirationDate:null})});expect((await service.purchaseSubscriptionTier('pro_annual')).success).toBe(false);});
it('does not accept an expired entitlement',async()=>{m.purchase.mockResolvedValue({customerInfo:info({expirationDate:'2020-01-01'})});expect((await service.purchaseSubscriptionTier('pro_annual')).success).toBe(false);});
it('returns no real tree or conservation certificate claims for lifetime',async()=>{m.invoke.mockResolvedValue({data:{subscription:{environment:'production',isPro:true,tier:'pioneer_lifetime',status:'lifetime',expiresAt:null,productId:'rimba_pioneer_lifetime',store:'app_store'}},error:null});m.purchase.mockResolvedValue({customerInfo:info({productIdentifier:'rimba_pioneer_lifetime',expirationDate:null})});m.products.mockResolvedValue({products:[{identifier:'rimba_pioneer_lifetime'}]});const result=await service.purchaseSubscriptionTier('pioneer_lifetime');expect(result.success).toBe(true);expect(result.subscription?.realTreesPledged).toBe(0);expect(result.subscription?.treeCertificateId).toBeUndefined();expect(result.subscription?.treeLocation).toBeUndefined();});
it('never writes a client-asserted entitlement to the server',async()=>{expect((await service.purchaseSubscriptionTier('pro_annual')).success).toBe(true);expect(m.upsert).not.toHaveBeenCalled();});
it('binds SDK configuration to the authenticated user',async()=>{await service.purchaseSubscriptionTier('pro_annual');expect(m.configure).toHaveBeenCalledWith({apiKey:'appl_test_public_key',appUserID:'a',entitlementVerificationMode:'INFORMATIONAL'});});
it('rejects late purchase results after the account changes',async()=>{let resolve!:(value:any)=>void;m.purchase.mockReturnValue(new Promise(r=>{resolve=r;}));const purchase=service.purchaseSubscriptionTier('pro_annual');await vi.waitFor(()=>expect(m.purchase).toHaveBeenCalled());m.id='b';resolve({customerInfo:info({})});expect((await purchase).success).toBe(false);});
it('does not restore an unrelated entitlement',async()=>{m.restore.mockResolvedValue({customerInfo:info({},'unrelated')});expect((await service.restoreStoreKitPurchases()).success).toBe(false);});
it('requires a signed-in account before starting a store purchase',async()=>{m.id=null;expect((await service.purchaseSubscriptionTier('pro_annual')).success).toBe(false);expect(m.purchase).not.toHaveBeenCalled();});
it('rejects the free tier without charging for monthly',async()=>{expect((await service.purchaseSubscriptionTier('free')).success).toBe(false);expect(m.purchase).not.toHaveBeenCalled();});
it('preserves paid access through canceled auto-renewal until expiry',async()=>{m.invoke.mockResolvedValue({data:{subscription:{environment:'production',isPro:true,tier:'pro_annual',status:'canceled',expiresAt:'2099-01-01',productId:'rimba_pro_annual',store:'app_store'}},error:null});m.purchase.mockResolvedValue({customerInfo:info({willRenew:false})});const result=await service.purchaseSubscriptionTier('pro_annual');expect(result.subscription?.status).toBe('canceled');});
it('returns cancellation without granting access',async()=>{m.purchase.mockRejectedValue({userCancelled:true});expect(await service.purchaseSubscriptionTier('pro_annual')).toEqual({success:false,cancelled:true});});

it('requires server confirmation after the native purchase',async()=>{const result=await service.purchaseSubscriptionTier('pro_annual');expect(result.success).toBe(true);expect(m.invoke).toHaveBeenCalledWith('reconcile-subscription',{body:{environment:'production'}});});
it('does not grant Pro when backend verification is unavailable',async()=>{m.invoke.mockResolvedValue({data:null,error:new Error('Offline')});expect((await service.purchaseSubscriptionTier('pro_annual')).success).toBe(false);});
it('does not grant native Pro when the current server entitlement is Free',async()=>{m.invoke.mockResolvedValue({data:{subscription:{environment:'production',isPro:false,tier:'free',status:'none',expiresAt:null}},error:null});expect((await service.purchaseSubscriptionTier('pro_annual')).success).toBe(false);});
it('rejects an A to B to A session change while purchase is in flight',async()=>{let resolve!:(value:any)=>void;m.purchase.mockReturnValue(new Promise(r=>{resolve=r;}));const purchase=service.purchaseSubscriptionTier('pro_annual');await vi.waitFor(()=>expect(m.purchase).toHaveBeenCalled());m.revision+=2;resolve({customerInfo:info({})});expect((await purchase).success).toBe(false);});
it('rejects a result if identity changes during backend verification',async()=>{let resolve!:(value:any)=>void;m.invoke.mockReturnValue(new Promise(r=>{resolve=r;}));const purchase=service.purchaseSubscriptionTier('pro_annual');await vi.waitFor(()=>expect(m.invoke).toHaveBeenCalled());m.id='b';resolve({data:{subscription:{isPro:true,tier:'pro_annual'}},error:null});expect((await purchase).success).toBe(false);});

it('refreshes a current entitlement without purchasing or restoring',async()=>{expect((await service.refreshStoreKitSubscription()).subscription?.tier).toBe('pro_annual');expect(m.purchase).not.toHaveBeenCalled();expect(m.restore).not.toHaveBeenCalled();});
it('revokes local access when the server reports Free during refresh',async()=>{m.invoke.mockResolvedValue({data:{subscription:{environment:'production',isPro:false,tier:'free',status:'expired',expiresAt:null,productId:null,store:null}},error:null});expect((await service.refreshStoreKitSubscription()).subscription).toMatchObject({isPro:false,tier:'free'});});
it('allows only a recent native verified cache while network verification is unavailable',async()=>{m.getInfo.mockResolvedValue({customerInfo:info({verification:'VERIFIED'})});m.invoke.mockResolvedValue({data:null,error:{name:'FunctionsFetchError'}});expect((await service.refreshStoreKitSubscription()).subscription?.isPro).toBe(true);});
it('rejects unverified native cache during a network outage',async()=>{m.getInfo.mockResolvedValue({customerInfo:info({verification:'NOT_REQUESTED'})});m.invoke.mockResolvedValue({data:null,error:{name:'FunctionsFetchError'}});expect((await service.refreshStoreKitSubscription()).success).toBe(false);});
it('rejects verified native cache older than one day during a network outage',async()=>{m.getInfo.mockResolvedValue({customerInfo:{...info({verification:'VERIFIED'}),requestDate:'2000-01-01'}});m.invoke.mockResolvedValue({data:null,error:{name:'FunctionsFetchError'}});expect((await service.refreshStoreKitSubscription()).success).toBe(false);});
it('does not let an older automatic refresh revoke a newly completed purchase',async()=>{
 let release!:(value:any)=>void;m.invoke.mockImplementationOnce(()=>new Promise(r=>{release=r;}));
 const refresh=service.refreshStoreKitSubscription();await vi.waitFor(()=>expect(m.invoke).toHaveBeenCalled());
 expect((await service.purchaseSubscriptionTier('pro_annual')).success).toBe(true);
 release({data:{subscription:{environment:'production',isPro:false,tier:'free',status:'none',expiresAt:null}},error:null});
 expect(await refresh).toMatchObject({success:false,superseded:true});
});
it('requires backend confirmation and current-owner proof for Restore as well',async()=>{
 const result=await service.restoreStoreKitPurchases();expect(result.success).toBe(true);expect(m.invoke).toHaveBeenCalledWith('reconcile-subscription',{body:{environment:'production'}});expect(service.isStoreResultCurrent(result)).toBe(true);
});
it('does not let restore bypass a failed backend verification',async()=>{m.invoke.mockResolvedValue({data:null,error:new Error('Offline')});expect((await service.restoreStoreKitPurchases()).success).toBe(false);});
it('restores a server-confirmed billing grace period even when the native renewal date has passed',async()=>{
 m.restore.mockResolvedValue({customerInfo:info({expirationDate:'2020-01-01'})});m.invoke.mockResolvedValue({data:{subscription:{environment:'production',isPro:true,tier:'pro_annual',status:'grace_period',expiresAt:'2099-01-01',productId:'rimba_pro_annual',store:'app_store'}},error:null});
 expect((await service.restoreStoreKitPurchases()).subscription).toMatchObject({isPro:true,status:'grace_period'});
});
it('retries temporary backend verification failure after the store accepts a purchase',async()=>{m.invoke.mockResolvedValueOnce({data:null,error:{name:'FunctionsHttpError',context:{status:503}}});const result=await service.purchaseSubscriptionTier('pro_annual');expect(result.success).toBe(true);expect(m.purchase).toHaveBeenCalledOnce();expect(m.invoke).toHaveBeenCalledTimes(2);});
it('marks accepted store purchases as pending when backend verification remains unavailable',async()=>{m.invoke.mockResolvedValue({data:null,error:{name:'FunctionsHttpError',context:{status:503}}});const result=await service.purchaseSubscriptionTier('pro_annual');expect(result.success).toBe(false);expect(result.pendingConfirmation).toBe(true);expect(result.subscription).toBeUndefined();expect(m.purchase).toHaveBeenCalledOnce();});
it.each(['purchase','restore'] as const)('discards a Free refresh started during %s after verified Pro completes',async(operation)=>{
  let finishStore!:(value:any)=>void;let finishRefresh!:(value:any)=>void;
  const action=operation==='purchase'?m.purchase:m.restore;
  action.mockReturnValue(new Promise(r=>{finishStore=r;}));
  const paid=operation==='purchase'?service.purchaseSubscriptionTier('pro_annual'):service.restoreStoreKitPurchases();
  await vi.waitFor(()=>expect(action).toHaveBeenCalled());
  m.getInfo.mockReturnValue(new Promise(r=>{finishRefresh=r;}));
  const refresh=service.refreshStoreKitSubscription();
  await vi.waitFor(()=>expect(m.getInfo).toHaveBeenCalled());
  finishStore({customerInfo:info({})});expect((await paid).success).toBe(true);
  m.invoke.mockResolvedValue({data:{subscription:{environment:'production',isPro:false,tier:'free',status:'none',expiresAt:null}},error:null});
  finishRefresh({customerInfo:{requestDate:new Date().toISOString(),entitlements:{active:{}}}});
  expect((await refresh).superseded).toBe(true);
});
