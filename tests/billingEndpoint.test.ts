import { beforeEach,expect,it,vi } from 'vitest';
import { createBillingHandler } from '../supabase/functions/reconcile-subscription/handler';
const owner='00000000-0000-4000-8000-000000000001';
const config={supabaseUrl:'https://fixture.supabase.test',anonKey:'public-fixture',serviceRoleKey:'server-fixture',revenueCatKey:'sk_fixture',webhookAuthorization:'Bearer '+ 'x'.repeat(48),appId:'app25d76d4a53'};
let fetcher:ReturnType<typeof vi.fn>,handler:ReturnType<typeof createBillingHandler>;
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
const empty={subscriber:{entitlements:{},subscriptions:{},non_subscriptions:{}}};
beforeEach(()=>{
 fetcher=vi.fn(async(url:string,_init?:RequestInit)=>url.endsWith('/auth/v1/user')?json({id:owner}):url.includes('begin_billing_sync_v1')?json({lease:'11111111-1111-4111-8111-111111111111'}):url.includes('finish_billing_sync_v1')?json({applied:true}):json(empty));
 handler=createBillingHandler(config,fetcher);
});
const reconcile=(body:unknown={})=>new Request('https://fixture/functions/v1/reconcile-subscription',{method:'POST',headers:{Authorization:'Bearer user-session'},body:JSON.stringify(body)});
const webhook=(patch:Record<string,unknown>={},authorization=config.webhookAuthorization)=>new Request('https://fixture/functions/v1/revenuecat-webhook',{method:'POST',headers:{Authorization:authorization},body:JSON.stringify({event:{id:'event-1',app_id:config.appId,type:'RENEWAL',environment:'PRODUCTION',app_user_id:owner,...patch}})});
it('requires a verified user session before reconciling',async()=>{
 const result=await handler(new Request('https://fixture/functions/v1/reconcile-subscription',{method:'POST',body:'{}'}));expect(result.status).toBe(401);expect(fetcher).not.toHaveBeenCalled();
});
it('ignores a forged body owner and access flags',async()=>{
 const result=await handler(reconcile({user_id:'foreign',isPro:true}));expect(result.status).toBe(200);
 const rc=fetcher.mock.calls.find(([url])=>String(url).startsWith('https://api.revenuecat.com/'));
 expect(rc?.[0]).toBe('https://api.revenuecat.com/v1/subscribers/'+owner);
 const finish=fetcher.mock.calls.find(([url])=>String(url).includes('finish_billing_sync_v1'));
 expect(JSON.parse(String(finish?.[1]?.body))).toMatchObject({p_owner:owner,p_state:{isPro:false,environment:'production'}});
});
it('does not treat an Auth server error as a verified session',async()=>{
 fetcher.mockResolvedValueOnce(json({error:'failed'},503));expect((await handler(reconcile())).status).toBe(401);expect(fetcher).toHaveBeenCalledTimes(1);
});
it('rejects a webhook without its exact secret header before any outbound request',async()=>{
 expect((await handler(webhook({},'Bearer wrong'))).status).toBe(401);expect(fetcher).not.toHaveBeenCalled();
});
it('rejects a webhook belonging to another RevenueCat app',async()=>{
 expect((await handler(webhook({app_id:'another-app'}))).status).toBe(400);expect(fetcher).not.toHaveBeenCalled();
});
it('fetches current subscriber state for a delayed cancellation instead of trusting the event',async()=>{
 expect((await handler(webhook({type:'CANCELLATION',entitlement_ids:['forged'],expiration_at_ms:9999999999999}))).status).toBe(200);
 expect(fetcher.mock.calls.some(([url])=>String(url).includes('/v1/subscribers/'+owner))).toBe(true);
});
it('does not repeat a processed webhook',async()=>{
 fetcher.mockImplementation(async(url:string,_init?:RequestInit)=>url.includes('begin_billing_sync_v1')?json({duplicate:true}):json(empty));
 expect((await handler(webhook())).status).toBe(200);expect(fetcher).toHaveBeenCalledTimes(1);
});
it('keeps previous rights and asks for retry if RevenueCat is unavailable',async()=>{
 fetcher.mockImplementation(async(url:string,_init?:RequestInit)=>url.endsWith('/auth/v1/user')?json({id:owner}):url.includes('begin_billing_sync_v1')?json({lease:'lease'}):json({error:'unavailable'},503));
 expect((await handler(reconcile())).status).toBe(503);
 expect(fetcher.mock.calls.some(([url])=>String(url).includes('finish_billing_sync_v1'))).toBe(false);
});
it('keeps sandbox webhook updates separate from production',async()=>{
 expect((await handler(webhook({environment:'SANDBOX'}))).status).toBe(200);
 const finish=fetcher.mock.calls.find(([url])=>String(url).includes('finish_billing_sync_v1'));
 expect(JSON.parse(String(finish?.[1]?.body)).p_state.environment).toBe('sandbox');
});
it('rejects non-POST requests',async()=>{expect((await handler(new Request('https://fixture/functions/v1/reconcile-subscription'))).status).toBe(405);});
