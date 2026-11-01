import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, expect, it } from 'vitest';
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
let db:PGlite;
beforeAll(async()=>{
 db=new PGlite();
 await db.exec(`
  create role anon; create role authenticated;
  create schema auth; create schema storage;
  grant usage on schema public,auth,storage to anon,authenticated;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
  create table storage.buckets(id text primary key,allowed_mime_types text[],file_size_limit bigint);
  create table storage.objects(bucket_id text,name text,owner_id text,owner uuid,primary key(bucket_id,name));
  alter table storage.objects enable row level security;
  grant all on storage.objects to anon,authenticated;
  create policy "Authenticated users can upload avatars" on storage.objects for insert with check(bucket_id='avatars');
  create policy "Users can upload their own avatar" on storage.objects for insert with check(bucket_id='avatars' and auth.uid()::text=(storage.foldername(name))[1]);
  create policy "Avatar images are publicly accessible" on storage.objects for select using(bucket_id='avatars');
  create policy "Users can update their avatars" on storage.objects for update using(bucket_id='avatars' and auth.uid()::text=(storage.foldername(name))[1]);
  create policy "Users can update their own avatar" on storage.objects for update using(bucket_id='avatars' and auth.uid()::text=(storage.foldername(name))[1]);
  create policy "Users can delete their own avatar" on storage.objects for delete using(bucket_id='avatars' and auth.uid()::text=(storage.foldername(name))[1]);
  insert into storage.buckets values('avatars',null,null);
  insert into storage.objects values('avatars','${a}/mine.jpg','${a}',null),('avatars','${b}/theirs.jpg','${b}',null),('avatars','legacy-owned.jpg','${a}',null);
 `);
 await db.exec(readFileSync('supabase/migrations/20261101034202_restrict_avatar_uploads_and_list_media.sql','utf8'));
},20000);
afterAll(async()=>{await db?.close();});
async function client(role:'anon'|'authenticated',sql:string){await db.exec(`begin;set local role ${role};select set_config('request.jwt.claim.sub','${role==='anon'?'':a}',true);`);try{return await db.query(sql);}finally{await db.exec('rollback');}}
it('rejects uploads into another account folder',async()=>{await expect(client('authenticated',`insert into storage.objects values('avatars','${b}/injected.jpg','${a}',null)`)).rejects.toThrow(/row-level security/);});
it('rejects anonymous avatar uploads',async()=>{await expect(client('anon',`insert into storage.objects values('avatars','${a}/anonymous.jpg',null,null)`)).rejects.toThrow(/permission denied|row-level security/);});
it('allows an authenticated owner to upload their own avatar',async()=>{const r=await client('authenticated',`insert into storage.objects values('avatars','${a}/new.jpg','${a}',null) returning name`);expect(r.rows).toHaveLength(1);});
it('rejects moving an owned avatar into another namespace',async()=>{await expect(client('authenticated',`update storage.objects set name='${b}/moved.jpg' where name='${a}/mine.jpg'`)).rejects.toThrow(/row-level security/);});
it('keeps intentionally public avatar reads working',async()=>{expect((await client('anon','select name from storage.objects')).rows).toHaveLength(3);});
it('returns only the verified caller media, including legacy owner metadata',async()=>{const r=await client('authenticated','select name from public.list_account_media()');expect(r.rows).toEqual([{name:a+'/mine.jpg'},{name:'legacy-owned.jpg'}]);});
it('does not expose the media RPC anonymously',async()=>{await expect(client('anon','select * from public.list_account_media()')).rejects.toThrow(/permission denied/);});
it('restricts future uploads to supported image types and a 5 MiB limit',async()=>{const r=await db.query('select allowed_mime_types,file_size_limit from storage.buckets');expect(r.rows).toEqual([{allowed_mime_types:['image/jpeg','image/png','image/webp'],file_size_limit:5242880}]);});
