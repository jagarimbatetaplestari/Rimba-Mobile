import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll,beforeEach,afterAll,expect,it } from 'vitest';
const owner='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';let db:PGlite;
beforeAll(async()=>{
 db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema public,auth to anon,authenticated,service_role;grant select on auth.users to service_role;`);
 const baseline=readFileSync('supabase/baselines/20261101000000_legacy_schema_snapshot.sql','utf8');
 await db.exec(baseline.match(/CREATE TABLE IF NOT EXISTS public.user_subscriptions \([\s\S]*?\);/)![0]);
 await db.exec('grant all on user_subscriptions to service_role');
 await db.exec(readFileSync('supabase/migrations/20261101102757_trusted_billing_state.sql','utf8'));
},20000);
beforeEach(async()=>{await db.exec(`truncate auth.users cascade;insert into auth.users values('${owner}'),('${other}');`);});
afterAll(async()=>{await db?.close();});
async function query(sql:string,args:unknown[]=[],role='service_role',who=owner){await db.exec(`begin;set local role ${role};select set_config('request.jwt.claim.sub','${who}',true);`);try{const result=await db.query<Record<string,any>>(sql,args);await db.exec('commit');return result.rows;}catch(e){await db.exec('rollback');throw e;}}
async function begin(event:string|null=null,environment='production'){return (await query('select begin_billing_sync_v1($1::uuid,$2,$3) as result',[owner,environment,event]))[0].result;}
const paid=(environment='production')=>({environment,isPro:true,tier:'pro_monthly',status:'active',expiresAt:'2099-01-01T00:00:00Z',productId:'rimba_pro_monthly',store:'app_store'});
async function finish(lease:string,event:string|null=null,environment='production',state:unknown=paid(environment)){return (await query('select finish_billing_sync_v1($1::uuid,$2,$3,$4::uuid,$5::jsonb) as result',[owner,environment,event,lease,JSON.stringify(state)]))[0].result;}
it('only the server can reserve or finalize billing',async()=>{
 await expect(query('select begin_billing_sync_v1($1::uuid,$2,null)',[owner,'production'],'authenticated')).rejects.toThrow(/permission denied/);
 await expect(query('select begin_billing_sync_v1($1::uuid,$2,null)',[owner,'production'],'anon')).rejects.toThrow(/permission denied/);
});
it('reserves a per-account lease and blocks overlapping refreshes',async()=>{expect((await begin()).lease).toBeTruthy();expect(await begin()).toMatchObject({busy:true});});
it('mirrors a verified production entitlement',async()=>{const lease=(await begin()).lease;expect(await finish(lease)).toEqual({applied:true});expect((await db.query<Record<string,any>>('select * from user_subscriptions')).rows[0]).toMatchObject({user_id:owner,is_pro:true,tier:'pro_monthly',real_trees_pledged:0,tree_certificate_id:null});});
it('deduplicates only after an event successfully commits',async()=>{const lease=(await begin('e1')).lease;await finish(lease,'e1');expect(await begin('e1')).toEqual({duplicate:true});});
it('cannot finish using a stale or foreign lease',async()=>{await begin();expect(await finish(other)).toEqual({applied:false});expect((await db.query('select * from user_subscriptions')).rows).toHaveLength(0);});
it('does not grant production rights for sandbox purchases',async()=>{await finish((await begin('e1','sandbox')).lease,'e1','sandbox');expect((await db.query('select * from user_subscriptions')).rows).toHaveLength(0);});
it('keeps owner billing reads isolated and hides lease data',async()=>{
 await finish((await begin()).lease);expect(await query('select owner_id,environment,state,checked_at from billing_sync_state',[],'authenticated',other)).toEqual([]);
 expect(await query('select state from billing_sync_state',[],'authenticated')).toHaveLength(1);
 await expect(query('select lease from billing_sync_state',[],'authenticated')).rejects.toThrow(/permission denied/);
});
it('denies a mismatched environment in the verified state',async()=>{const lease=(await begin()).lease;await expect(finish(lease,null,'production',paid('sandbox'))).rejects.toThrow();});
it('releases only the matching failed lease and permits retries',async()=>{
 const lease=(await begin('retry')).lease;await query('select cancel_billing_sync_v1($1::uuid,$2,$3,$4::uuid)',[owner,'production','retry',lease]);expect((await begin('retry')).lease).toBeTruthy();
});
it('rejects expired leases and lets a new worker take over',async()=>{
 const lease=(await begin()).lease;await db.exec("update billing_sync_state set lease_expires_at=now()-interval '1 minute'");expect(await finish(lease)).toEqual({applied:false});expect((await begin()).lease).not.toBe(lease);
});
it('does not create billing records for deleted accounts',async()=>{await db.exec(`delete from auth.users where id='${owner}'`);expect(await begin()).toEqual({missing:true});});
it('cascades billing cache and event receipts on account deletion',async()=>{await finish((await begin('e1')).lease,'e1');await db.exec(`delete from auth.users where id='${owner}'`);expect((await db.query('select * from billing_sync_state')).rows).toHaveLength(0);expect((await db.query('select * from billing_webhook_receipts')).rows).toHaveLength(0);});
it('rejects incomplete paid state even in the isolated sandbox cache',async()=>{const lease=(await begin(null,'sandbox')).lease;const state=paid('sandbox') as any;delete state.productId;await expect(finish(lease,null,'sandbox',state)).rejects.toThrow();});
it('cannot cancel a newer worker lease',async()=>{const first=(await begin()).lease;await db.exec("update billing_sync_state set lease_expires_at=now()-interval '1 minute'");const newer=(await begin()).lease;await query('select cancel_billing_sync_v1($1::uuid,$2,null,$3::uuid)',[owner,'production',first]);expect(await begin()).toMatchObject({busy:true});expect(await finish(newer)).toEqual({applied:true});});
it('reconciles a current refund from paid access to Free',async()=>{await finish((await begin('purchase')).lease,'purchase');const state={environment:'production',isPro:false,tier:'free',status:'none',expiresAt:null,store:null,productId:null};await finish((await begin('refund')).lease,'refund','production',state);expect((await db.query<Record<string,any>>('select tier,is_pro from user_subscriptions')).rows[0]).toEqual({tier:'free',is_pro:false});});
