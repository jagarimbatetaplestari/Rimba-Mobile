import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, expect, it } from 'vitest';
const a = '00000000-0000-4000-8000-000000000001';
const b = '00000000-0000-4000-8000-000000000002';
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  // Minimal schema and grants reproduced from the live Rimba catalog, without user data.
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    create table profiles(id uuid primary key, email text, display_name text, avatar_url text, bio text, xp integer, level integer, created_at timestamptz, updated_at timestamptz);
    create table game_saves(user_id uuid primary key, save_version integer, save_data jsonb, updated_at timestamptz);
    create table user_subscriptions(user_id uuid primary key, tier text, is_pro boolean);
    alter table profiles enable row level security;
    alter table game_saves enable row level security;
    alter table user_subscriptions enable row level security;
    create policy "Profiles are viewable by everyone" on profiles for select using(true);
    create policy profile_insert on profiles for insert with check(auth.uid()=id);
    create policy profile_update on profiles for update using(auth.uid()=id) with check(auth.uid()=id);
    create policy save_owner on game_saves for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
    create policy "Users can upsert their own subscription" on user_subscriptions for insert with check(auth.uid()=user_id);
    create policy "Users can update their own subscription" on user_subscriptions for update using(auth.uid()=user_id) with check(auth.uid()=user_id);
    create policy subscription_read on user_subscriptions for select using(auth.uid()=user_id);
    grant all on profiles,game_saves,user_subscriptions to anon,authenticated,service_role;
    insert into profiles(id,email,display_name) values('${a}','private@example.test','Ranger A'),('${b}','other@example.test','Ranger B');
    insert into game_saves values('${a}',1,'{}',now());
  `);
  await db.exec(readFileSync('supabase/migrations/20261101034135_restrict_client_privileges.sql','utf8'));
}, 20000);
afterAll(async () => { await db?.close(); });
async function asRole(role: 'anon' | 'authenticated' | 'service_role', sql: string, userId = a) {
  await db.exec(`begin; set local role ${role}; select set_config('request.jwt.claim.sub','${userId}',true);`);
  try { return await db.query(sql); } finally { await db.exec('rollback'); }
}
it('denies anonymous reads of private profile email', async () => {
  await expect(asRole('anon','select email from profiles')).rejects.toThrow(/permission denied/);
});
it('denies signed-in reads of other users email', async () => {
  await expect(asRole('authenticated',`select email from profiles where id='${b}'`)).rejects.toThrow(/permission denied/);
});
it('keeps public display fields available without email', async () => {
  const result = await asRole('anon','select id,display_name,avatar_url,bio,xp,level from profiles');
  expect(result.rows).toHaveLength(2);
});
it('allows an owner to update their display name', async () => {
  const result = await asRole('authenticated',`update profiles set display_name='Updated' where id='${a}' returning display_name`);
  expect(result.rows).toEqual([{ display_name: 'Updated' }]);
});
it('prevents client creation of paid entitlements', async () => {
  await expect(asRole('authenticated',`insert into user_subscriptions values('${a}','pioneer_lifetime',true)`)).rejects.toThrow(/permission denied/);
});
it('reserves subscription writes for trusted server role', async () => {
  const result = await asRole('service_role',`insert into user_subscriptions values('${a}','pro_monthly',true) returning is_pro`);
  expect(result.rows).toEqual([{ is_pro: true }]);
});
it.each(['profiles','game_saves','user_subscriptions'])('denies client TRUNCATE on %s (RLS does not protect TRUNCATE)', async table => {
  await expect(asRole('authenticated',`truncate ${table}`)).rejects.toThrow(/permission denied/);
});
it('keeps game saves isolated by owner', async () => {
  expect((await asRole('authenticated',`select * from game_saves where user_id='${a}'`)).rows).toHaveLength(1);
  expect((await asRole('authenticated',`select * from game_saves where user_id='${b}'`)).rows).toHaveLength(0);
  await expect(asRole('authenticated',`insert into game_saves values('${b}',1,'{}',now())`)).rejects.toThrow(/row-level security/);
});
