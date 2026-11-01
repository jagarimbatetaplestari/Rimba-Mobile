import { expect,it } from 'vitest';
import { mapRevenueCatEntitlement } from '../supabase/functions/_shared/revenueCatEntitlement';
const now=Date.parse('2026-11-01T10:00:00Z'),past='2026-10-01T00:00:00Z',future='2026-12-01T00:00:00.000Z';
function snapshot(product='rimba_pro_monthly',patch:Record<string,unknown>={},entitlementPatch:Record<string,unknown>={}){
 const record={store:'app_store',is_sandbox:false,expires_date:future,purchase_date:past,original_purchase_date:past,period_type:'normal',refunded_at:null,...patch};
 return {subscriber:{entitlements:{rimba_pro:{product_identifier:product,expires_date:future,grace_period_expires_date:null,...entitlementPatch}},subscriptions:{[product]:record},non_subscriptions:{[product]:[record]}}};
}
it('rejects malformed upstream responses instead of downgrading a paying user',()=>{
 for(const value of [null,{}, {subscriber:{}},{subscriber:{entitlements:[],subscriptions:{},non_subscriptions:{}}}])expect(()=>mapRevenueCatEntitlement(value,'production',now)).toThrow();
});
it('maps a valid current monthly purchase',()=>{
 expect(mapRevenueCatEntitlement(snapshot(),'production',now)).toMatchObject({isPro:true,tier:'pro_monthly',status:'active',expiresAt:future,environment:'production',productId:'rimba_pro_monthly'});
});
it('maps annual trial without inventing real-tree benefits',()=>{
 expect(mapRevenueCatEntitlement(snapshot('rimba_pro_annual',{period_type:'trial'}),'production',now)).toMatchObject({isPro:true,tier:'pro_annual',status:'trialing'});
});
it('keeps cancelled access until its confirmed expiration',()=>{
 expect(mapRevenueCatEntitlement(snapshot('rimba_pro_monthly',{unsubscribe_detected_at:past}),'production',now)).toMatchObject({isPro:true,status:'canceled'});
});
it('expires access exactly at expiration',()=>{
 expect(mapRevenueCatEntitlement(snapshot('rimba_pro_monthly',{expires_date:past},{expires_date:past}),'production',now).isPro).toBe(false);
});
it('preserves confirmed billing grace until its grace expiration',()=>{
 expect(mapRevenueCatEntitlement(snapshot('rimba_pro_monthly',{expires_date:past,grace_period_expires_date:future},{expires_date:past,grace_period_expires_date:future}),'production',now)).toMatchObject({isPro:true,status:'grace_period',expiresAt:future});
});
it('revokes a refunded subscription even if stale entitlement expiration remains',()=>{
 expect(mapRevenueCatEntitlement(snapshot('rimba_pro_monthly',{refunded_at:past}),'production',now).isPro).toBe(false);
});
it('requires a non-expiring entitlement and a matching store purchase for lifetime',()=>{
 expect(mapRevenueCatEntitlement(snapshot('rimba_pioneer_lifetime',{}, {expires_date:null}),'production',now)).toMatchObject({isPro:true,status:'lifetime',expiresAt:null});
 expect(mapRevenueCatEntitlement(snapshot('rimba_pioneer_lifetime'),'production',now).isPro).toBe(false);
});
it('does not turn sandbox receipts into production rights',()=>{
 const info=snapshot('rimba_pro_monthly',{is_sandbox:true});
 expect(mapRevenueCatEntitlement(info,'production',now).isPro).toBe(false);
 expect(mapRevenueCatEntitlement(info,'sandbox',now)).toMatchObject({isPro:true,environment:'sandbox'});
});
it('does not grant unknown products or promotional stores',()=>{
 expect(mapRevenueCatEntitlement(snapshot('other_product'),'production',now).isPro).toBe(false);
 expect(mapRevenueCatEntitlement(snapshot('rimba_pro_monthly',{store:'promotional'}),'production',now).isPro).toBe(false);
});
it('requires both authoritative entitlement and purchase records',()=>{
 const info=snapshot();info.subscriber.entitlements={} as any;
 expect(mapRevenueCatEntitlement(info,'production',now).isPro).toBe(false);
 const missing=snapshot();missing.subscriber.subscriptions={};
 expect(()=>mapRevenueCatEntitlement(missing,'production',now)).toThrow();
});
it('rejects invalid dates and missing environment provenance',()=>{
 expect(()=>mapRevenueCatEntitlement(snapshot('rimba_pro_monthly',{}, {expires_date:'invalid'}),'production',now)).toThrow();
 expect(()=>mapRevenueCatEntitlement(snapshot('rimba_pro_monthly',{is_sandbox:undefined}),'production',now)).toThrow();
});
