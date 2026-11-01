import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll,beforeEach,afterAll,expect,it } from 'vitest';
const a='00000000-0000-4000-8000-000000000001', b='00000000-0000-4000-8000-000000000002';
const m1='10000000-0000-4000-8000-000000000001',m2='10000000-0000-4000-8000-000000000002';
let db:PGlite;
beforeAll(async()=>{
 db=new PGlite();await db.exec(`create role anon;create role authenticated;create schema auth;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public to anon,authenticated;
 create table public.game_saves(id uuid default gen_random_uuid() primary key,user_id uuid not null unique,save_version integer not null default1,save_data jsonb not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
 alter table public.game_saves enable row level security;
 create policy save_owner on public.game_saves for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
 grant select,insert,update,delete on public.game_saves to authenticated;` .replace('default1','default 1'));
 await db.exec(readFileSync('supabase/migrations/20261101094129_guard_game_save_revisions.sql','utf8'));
},20000);
beforeEach(async()=>{await db.exec('truncate public.game_saves');});
afterAll(async()=>{await db?.close();});
async function asOwner(sql:string,args:any[]=[],owner=a,role='authenticated'){
 await db.exec(`begin;set local role ${role};select set_config('request.jwt.claim.sub','${owner}',true);`);
 try{const result=await db.query<Record<string,any>>(sql,args);await db.exec('commit');return result;}catch(error){await db.exec('rollback');throw error;}
}
const write=async(payload:any,base:number|null=null,mutation=m1,owner=a)=>{
 const result=await asOwner('select public.commit_game_save_v2($1::uuid,$2::bigint,$3::uuid,$4::jsonb) as result',[owner,base,mutation,JSON.stringify(payload)],owner);
 return result.rows[0].result;
};
const payload={version:1,world_objects:[{id:'tree-a'}]};
it('creates only the caller row and strips purchase/owner metadata',async()=>{
 expect(await write({...payload,storage_owner:b,subscription:{isPro:true}})).toEqual({committed:true,revision:1});
 const row=(await db.query<Record<string,any>>('select user_id,save_data from public.game_saves')).rows[0];
 expect(row.user_id).toBe(a);expect(row.save_data).toEqual(payload);
});
it('refuses a blind overwrite of an existing save',async()=>{
 await write(payload);expect(await write({...payload,world_objects:[]},null,m2)).toEqual({committed:false,revision:1});
 expect((await db.query<Record<string,any>>('select save_data from public.game_saves')).rows[0].save_data).toEqual(payload);
});
it('commits a matching revision without unioning deleted objects back',async()=>{
 await write(payload);expect(await write({...payload,world_objects:[]},1,m2)).toEqual({committed:true,revision:2});
 expect((await db.query<Record<string,any>>('select save_data from public.game_saves')).rows[0].save_data).toEqual({...payload,world_objects:[]});
});
it('rejects a stale device after another commit',async()=>{
 await write(payload);await write({...payload,world_objects:[]},1,m2);
 expect(await write(payload,1,m1)).toEqual({committed:false,revision:2});
});
it('makes a retry of the same mutation idempotent',async()=>{
 await write(payload);expect(await write(payload,null,m1)).toEqual({committed:true,revision:1});
 expect((await db.query<Record<string,any>>('select revision from public.game_saves')).rows[0].revision).toBe(1);
});
it('rejects reusing a mutation id with different content',async()=>{
 await write(payload);await expect(write({...payload,world_objects:[]},1,m1)).rejects.toThrow();
});
it('cannot target a foreign row even with forged ownership',async()=>{
 await write(payload);expect(await write({...payload,storage_owner:a},1,m2,b)).toEqual({committed:false,revision:null});
 expect((await asOwner('select * from public.game_saves',[],b)).rows).toEqual([]);
 expect((await db.query<Record<string,any>>('select save_data from public.game_saves')).rows[0].save_data).toEqual(payload);
});
it('denies anonymous execution and missing verified caller identity',async()=>{
 await expect(asOwner('select public.commit_game_save_v2($1::uuid,null,$2::uuid,$3::jsonb)',[a,m1,JSON.stringify(payload)],a,'anon')).rejects.toThrow();
 await expect(asOwner('select public.commit_game_save_v2($1::uuid,null,$2::uuid,$3::jsonb)',[a,m1,JSON.stringify(payload)],'')).rejects.toThrow();
});
it('denies direct client writes that bypass revision checks',async()=>{
 await expect(asOwner('insert into public.game_saves(user_id,save_data) values($1::uuid,$2::jsonb)',[a,JSON.stringify(payload)])).rejects.toThrow(/permission denied/);
});
it('rejects unsupported payload versions without writing',async()=>{
 await expect(write({...payload,version:999})).rejects.toThrow();
 expect((await db.query<Record<string,any>>('select * from public.game_saves')).rows).toEqual([]);
});
it('keeps existing legacy rows and allows revision0 to be updated explicitly',async()=>{
 await db.query<Record<string,any>>('insert into public.game_saves(user_id,save_data) values($1::uuid,$2::jsonb)',[a,JSON.stringify(payload)]);
 expect(await write({...payload,world_objects:[]},0,m1)).toEqual({committed:true,revision:1});
});
it('rejects a token/account switch before writing progress to the wrong caller',async()=>{
 await expect(asOwner('select public.commit_game_save_v2($1::uuid,null,$2::uuid,$3::jsonb)',[a,m1,JSON.stringify(payload)],b)).rejects.toThrow(/Account identity changed/);
 expect((await db.query<Record<string,any>>('select * from public.game_saves')).rows).toEqual([]);
});
