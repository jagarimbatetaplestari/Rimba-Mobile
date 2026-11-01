export type BillingEnvironment='production'|'sandbox';
export interface VerifiedEntitlement {
 environment:BillingEnvironment;isPro:boolean;
 tier:'free'|'pro_monthly'|'pro_annual'|'pioneer_lifetime';
 status:'none'|'active'|'trialing'|'canceled'|'expired'|'lifetime'|'grace_period';
 expiresAt:string|null;productId:string|null;store:'app_store'|'play_store'|null;
}
type Dictionary=Record<string,unknown>;
function dictionary(value:unknown):Dictionary {
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid RevenueCat response');
 return value as Dictionary;
}
function date(value:unknown):number {
 if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))throw new Error('Invalid RevenueCat date');
 return Date.parse(value);
}
const products={rimba_pro_monthly:'pro_monthly',rimba_pro_annual:'pro_annual',rimba_pioneer_lifetime:'pioneer_lifetime'} as const;
/** Only call with a fresh server-to-server GET subscriber response, never client JSON or webhook entitlement fields. */
export function mapRevenueCatEntitlement(input:unknown,environment:BillingEnvironment,now=Date.now()):VerifiedEntitlement {
 const subscriber=dictionary(dictionary(input).subscriber);
 const entitlements=dictionary(subscriber.entitlements),subscriptions=dictionary(subscriber.subscriptions),purchases=dictionary(subscriber.non_subscriptions);
 const free:VerifiedEntitlement={environment,isPro:false,tier:'free',status:'none',expiresAt:null,productId:null,store:null};
 if(!entitlements.rimba_pro)return free;
 const entitlement=dictionary(entitlements.rimba_pro),product=entitlement.product_identifier;
 if(typeof product!=='string'||!Object.hasOwn(products,product))return free;
 const tier=products[product as keyof typeof products],lifetime=tier==='pioneer_lifetime';
 let record:Dictionary;
 if(lifetime){
  if(entitlement.expires_date!==null)return free;
  const history=purchases[product];
  if(!Array.isArray(history)||history.length===0)throw new Error('Missing store purchase');
  const matching=history.map(dictionary).filter(p=>p.is_sandbox===(environment==='sandbox'));
  if(!matching.length){if(history.some(p=>typeof dictionary(p).is_sandbox!=='boolean'))throw new Error('Missing billing environment');return free;}
  record=matching.sort((a,b)=>date(b.purchase_date)-date(a.purchase_date))[0];
 }else record=dictionary(subscriptions[product]);
 if(typeof record.is_sandbox!=='boolean')throw new Error('Missing billing environment');
 if(record.is_sandbox!==(environment==='sandbox'))return free;
 if(record.store!=='app_store'&&record.store!=='play_store')return free;
 if(record.refunded_at!=null)return free;
 if(date(record.purchase_date)>now+300000)throw new Error('Future store purchase');
 if(lifetime)return {environment,isPro:true,tier,status:'lifetime',expiresAt:null,productId:product,store:record.store};
 const expiry=Math.min(date(entitlement.expires_date),date(record.expires_date));
 const grace=entitlement.grace_period_expires_date!=null&&record.grace_period_expires_date!=null
  ?Math.min(date(entitlement.grace_period_expires_date),date(record.grace_period_expires_date)):0;
 const inGrace=expiry<=now&&grace>now;
 if(expiry<=now&&!inGrace)return {...free,status:'expired'};
 return {environment,isPro:true,tier,status:inGrace?'grace_period':record.period_type==='trial'?'trialing':record.unsubscribe_detected_at!=null?'canceled':'active',
  expiresAt:new Date(inGrace?grace:expiry).toISOString(),productId:product,store:record.store};
}
