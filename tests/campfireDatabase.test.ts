import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { afterAll, beforeAll, expect, it } from 'vitest';
const a='00000000-0000-4000-8000-000000000001', b='00000000-0000-4000-8000-000000000002', outsider='00000000-0000-4000-8000-000000000003', moderator='00000000-0000-4000-8000-000000000004';
let db:PGlite; let room:any;
const request=()=>crypto.randomUUID();
async function rpc(user:string,sql:string,role='authenticated'):Promise<any>{
 await db.exec(`begin; set local role ${role}; select set_config('request.jwt.claim.sub','${user}',true);`);
 try{const result=await db.query(sql);await db.exec('commit');return Object.values(result.rows[0]??{})[0];}catch(error){await db.exec('rollback');throw error;}
}
beforeAll(async()=>{
 db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls; create schema auth;create table auth.users(id uuid primary key,is_anonymous boolean not null default false);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated,service_role;insert into auth.users(id) values('${a}'),('${b}'),('${outsider}'),('${moderator}');`);
 const file=readdirSync('supabase/migrations').find(f=>f.endsWith('_campfire_authority_and_moderation.sql'));
 if(!file)throw Error('Campfire migration missing');
 await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
},20000);
afterAll(async()=>{await db?.close();});
it('denies anonymous RPC and direct client writes',async()=>{
 await expect(rpc('',`select public.campfire_read_v1('${a}')`,'anon')).rejects.toThrow(/permission denied/);
 await expect(rpc(a,`insert into public.campfire_rooms(host_id,name,display_name,duration_minutes,mode,animal) values('${a}','fake','fake',25,'shared_destiny','fox')`)).rejects.toThrow();
});
it('creates a bounded canonical room and deduplicates create retries',async()=>{
 const id=request(); const sql=`select public.campfire_create_v1('${id}','Quiet room','Ranger A',25,'shared_destiny','fox')`;
 room=await rpc(a,sql);expect(room.code).toMatch(/^[a-f0-9]{32}$/);expect(room.participants[0]).toMatchObject({id:a,isHost:true});expect((await rpc(a,sql)).id).toBe(room.id);
 await expect(rpc(a,`select public.campfire_create_v1('${request()}','fuck room','Ranger',25,'shared_destiny','fox')`)).rejects.toThrow(/content/i);
 await expect(rpc(a,`select public.campfire_create_v1('${request()}','Room','Ranger',0,'shared_destiny','fox')`)).rejects.toThrow();
});
it('denies outsiders, joins with the token and denies nonhost start',async()=>{
 await expect(rpc(outsider,`select public.campfire_read_v1('${room.id}')`)).rejects.toThrow(/member/i);
 room=await rpc(b,`select public.campfire_join_v1('${room.code}','Ranger B','bunny')`);expect(room.participants).toHaveLength(2);
 await expect(rpc(b,`select public.campfire_command_v1('${room.id}','${request()}',${room.revision},'start')`)).rejects.toThrow(/host/i);
});
it('serializes revisioned commands and ignores exact retries',async()=>{
 const id=request(),revision=room.revision;const sql=`select public.campfire_command_v1('${room.id}','${id}',${revision},'start')`;
 room=await rpc(a,sql);expect(room.status).toBe('active');expect((await rpc(a,sql)).revision).toBe(room.revision);
 await expect(rpc(a,`select public.campfire_command_v1('${room.id}','${request()}',${revision},'complete')`)).rejects.toThrow(/revision/i);
 await expect(rpc(a,`select public.campfire_command_v1('${room.id}','${request()}',${room.revision},'complete')`)).rejects.toThrow(/elapsed/i);
});
it('keeps immutable reports private and reserves moderation for a server-assigned role',async()=>{
 const report=await rpc(b,`select public.campfire_report_v1('${room.id}','${a}','Abusive display name')`);
 await expect(rpc(a,'select * from public.campfire_reports')).rejects.toThrow(/permission denied/);
 await expect(rpc(a,'select public.campfire_moderator_queue_v1()')).rejects.toThrow(/moderator/i);
 await db.exec(`insert into public.campfire_moderators(user_id) values('${moderator}')`);
 const queue=await rpc(moderator,'select public.campfire_moderator_queue_v1()');expect(queue[0].id).toBe(report.id);expect(queue[0].evidence.participants).toHaveLength(2);
 await rpc(moderator,`select public.campfire_moderate_v1('${report.id}','suspend','Owner reviewed abuse')`);
 await expect(rpc(a,`select public.campfire_read_v1('${room.id}')`)).rejects.toThrow(/suspend/i);
 await expect(rpc(a,`select public.campfire_join_v1('${room.code}','A','fox')`)).rejects.toThrow(/suspend/i);
});
it('blocks exposure and commands after membership revocation',async()=>{
 // Use a fresh unsuspended host to isolate the blocking contract.
 room=await rpc(b,`select public.campfire_create_v1('${request()}','Second room','Ranger B',25,'gentle_circle','bunny')`);
 room=await rpc(outsider,`select public.campfire_join_v1('${room.code}','Ranger C','fox')`);
 await rpc(b,`select public.campfire_block_v1('${outsider}',true)`);
 await expect(rpc(b,`select public.campfire_read_v1('${room.id}')`)).rejects.toThrow(/member/i);
 await expect(rpc(outsider,`select public.campfire_join_v1('${room.code}','Ranger C','fox')`)).rejects.toThrow(/closed|block/i);
 await expect(rpc(b,`select public.campfire_command_v1('${room.id}','${request()}',${room.revision},'start')`)).rejects.toThrow(/member/i);
});
async function freshRoom(mode='gentle_circle'){
 const host=request(),member=request();await db.exec(`insert into auth.users(id) values('${host}'),('${member}')`);
 let snapshot=await rpc(host,`select public.campfire_create_v1('${request()}','Room','Host',5,'${mode}','fox')`);
 snapshot=await rpc(member,`select public.campfire_join_v1('${snapshot.code}','Member','bird')`);
 return {host,member,snapshot};
}
it('rejects forged membership/roles and grants no helper or moderator escalation',async()=>{
 for(const sql of ['select campfire_private.actor()',`insert into public.campfire_moderators values('${b}')`,`update public.campfire_members set user_id='${outsider}'`,'select * from public.campfire_rooms'])await expect(rpc(b,sql)).rejects.toThrow(/permission denied/);
 expect(await rpc(b,'select public.campfire_moderator_status_v1()')).toBe(false);
});
it('denies nonhost mode changes and request-ID reuse across commands',async()=>{
 const {host,member,snapshot}=await freshRoom();
 await expect(rpc(member,`select public.campfire_command_v1('${snapshot.id}','${request()}',${snapshot.revision},'mode','shared_destiny')`)).rejects.toThrow(/Host/);
 const id=request();await rpc(host,`select public.campfire_command_v1('${snapshot.id}','${id}',${snapshot.revision},'mode','shared_destiny')`);
 await expect(rpc(host,`select public.campfire_command_v1('${snapshot.id}','${id}',${snapshot.revision},'start')`)).rejects.toThrow(/reused/);
});
it('prevents premature completion and completes only the caller after elapsed time',async()=>{
 const {host,member,snapshot}=await freshRoom();
 let r=await rpc(host,`select public.campfire_command_v1('${snapshot.id}','${request()}',${snapshot.revision},'start')`);
 await db.exec(`update public.campfire_rooms set started_at=now()-interval '6 minutes' where id='${r.id}'`);
 r=await rpc(member,`select public.campfire_command_v1('${r.id}','${request()}',${r.revision},'complete')`);
 expect(r.status).toBe('active');expect(r.participants.find((p:any)=>p.id===host).status).toBe('focusing');
 r=await rpc(host,`select public.campfire_command_v1('${r.id}','${request()}',${r.revision},'complete')`);expect(r.status).toBe('completed');
});
it('severs shared destiny from a member abandonment without impersonating others',async()=>{
 const {host,member,snapshot}=await freshRoom('shared_destiny');
 let r=await rpc(host,`select public.campfire_command_v1('${snapshot.id}','${request()}',${snapshot.revision},'start')`);
 r=await rpc(member,`select public.campfire_command_v1('${r.id}','${request()}',${r.revision},'abandon')`);
 expect(r.status).toBe('severed');expect(r.severedBy).toBeNull();expect(r.participants.find((p:any)=>p.id===host).status).toBe('focusing');
});
it('keeps gentle-circle peers active when one participant abandons',async()=>{
 const {host,member,snapshot}=await freshRoom();
 let r=await rpc(host,`select public.campfire_command_v1('${snapshot.id}','${request()}',${snapshot.revision},'start')`);
 r=await rpc(member,`select public.campfire_command_v1('${r.id}','${request()}',${r.revision},'abandon')`);
 expect(r.status).toBe('active');expect(r.participants.find((p:any)=>p.id===member).status).toBe('abandoned');
});
it('leave retries reveal no ongoing participant data and cannot command the room',async()=>{
 const {member,snapshot}=await freshRoom();const id=request();
 const sql=`select public.campfire_command_v1('${snapshot.id}','${id}',${snapshot.revision},'leave')`;
 expect((await rpc(member,sql)).participants).toBeUndefined();expect((await rpc(member,sql)).participants).toBeUndefined();
 await expect(rpc(member,`select public.campfire_read_v1('${snapshot.id}')`)).rejects.toThrow(/Membership/);
});
it('blocks obfuscated profanity and never accepts client-supplied identity or status',async()=>{
 const user=request();await db.exec(`insert into auth.users(id) values('${user}')`);
 await expect(rpc(user,`select public.campfire_create_v1('${request()}','Room','F.u.c.k',5,'gentle_circle','fox')`)).rejects.toThrow(/content/);
 await expect(rpc(user,`select public.campfire_create_v1('${request()}','Room','Ranger',5,'gentle_circle','invented-animal')`)).rejects.toThrow();
});
it('rejects expired invitations and cannot read an expired room',async()=>{
 const {host,snapshot}=await freshRoom();await db.exec(`update public.campfire_rooms set expires_at=now()-interval '1 minute' where id='${snapshot.id}'`);
 await expect(rpc(host,`select public.campfire_read_v1('${snapshot.id}')`)).rejects.toThrow(/Membership/);
 await expect(rpc(outsider,`select public.campfire_join_v1('${snapshot.code}','Outsider','fox')`)).rejects.toThrow(/closed/);
});
it('removes a reported member and records exactly one immutable moderator action',async()=>{
 const {host,member,snapshot}=await freshRoom();
 const report=await rpc(host,`select public.campfire_report_v1('${snapshot.id}','${member}','Harassing participant')`);
 const sql=`select public.campfire_moderate_v1('${report.id}','remove','Reviewed and removed')`;
 await rpc(moderator,sql);await rpc(moderator,sql);
 expect((await db.query<{count:number}>(`select count(*)::int as count from public.campfire_moderation_actions where report_id='${report.id}'`)).rows[0].count).toBe(1);
 await expect(rpc(member,`select public.campfire_read_v1('${snapshot.id}')`)).rejects.toThrow(/Membership/);
 await expect(rpc(member,`select public.campfire_join_v1('${snapshot.code}','Member','fox')`)).rejects.toThrow(/closed/);
});
it('enforces room capacity and active room ownership at the server',async()=>{
 const {host,snapshot}=await freshRoom();
 for(let i=0;i<6;i++){const user=request();await db.exec(`insert into auth.users(id) values('${user}')`);await rpc(user,`select public.campfire_join_v1('${snapshot.code}','Ranger','fox')`);}
 await expect(rpc(outsider,`select public.campfire_join_v1('${snapshot.code}','Outsider','fox')`)).rejects.toThrow(/full/);
 await expect(rpc(host,`select public.campfire_create_v1('${request()}','Another room','Host',25,'gentle_circle','fox')`)).rejects.toThrow(/current room/);
});
it('does not allow alternate names or retries to bypass bidirectional blocking',async()=>{
 const {host,member,snapshot}=await freshRoom();await rpc(host,`select public.campfire_block_v1('${member}',true)`);
 await expect(rpc(member,`select public.campfire_join_v1('${snapshot.code}','Different name','bee')`)).rejects.toThrow(/closed|blocked/);
 const next=await rpc(member,`select public.campfire_create_v1('${request()}','New room','Member',25,'gentle_circle','bird')`);
 await expect(rpc(host,`select public.campfire_join_v1('${next.code}','Different host','koala')`)).rejects.toThrow(/blocked/);
 await rpc(host,`select public.campfire_block_v1('${member}',false)`);
 expect((await rpc(host,`select public.campfire_join_v1('${next.code}','Host','koala')`)).participants).toHaveLength(2);
});
it('rejects late joins and forged room completion commands',async()=>{
 const {host,snapshot}=await freshRoom();
 const current=await rpc(host,`select public.campfire_command_v1('${snapshot.id}','${request()}',${snapshot.revision},'start')`);
 await expect(rpc(outsider,`select public.campfire_join_v1('${snapshot.code}','Late ranger','fox')`)).rejects.toThrow(/closed/);
 await expect(rpc(host,`select public.campfire_command_v1('${snapshot.id}','${request()}',${current.revision},'ROOM_COMPLETED')`)).rejects.toThrow(/Invalid command/);
});
it('removes a blocking host identity from the remaining room title',async()=>{
 const {host,member,snapshot}=await freshRoom();
 await db.exec(`update public.campfire_rooms set name='Room of Host' where id='${snapshot.id}'`);
 await rpc(host,`select public.campfire_block_v1('${member}',true)`);
 const remaining=await rpc(member,`select public.campfire_read_v1('${snapshot.id}')`);
 expect(remaining.name).toBe('Campfire');expect(remaining.participants.map((p:any)=>p.id)).not.toContain(host);
});
it('denies real Supabase anonymous auth identities even with authenticated SQL role',async()=>{
 const user=request();await db.exec(`insert into auth.users(id,is_anonymous) values('${user}',true)`);
 await expect(rpc(user,`select public.campfire_create_v1('${request()}','Room','Guest',25,'gentle_circle','fox')`)).rejects.toThrow(/permanent account/i);
});
it('redacts retained participant evidence and review notes when an account is deleted',async()=>{
 const {host,member,snapshot}=await freshRoom();const report=await rpc(host,`select public.campfire_report_v1('${snapshot.id}','${member}','Member used an abusive name')`);
 await rpc(moderator,`select public.campfire_moderate_v1('${report.id}','dismiss','Member was reviewed')`);
 await db.exec(`delete from auth.users where id='${member}'`);
 const result=(await db.query<any>(`select evidence,reason,target_id from public.campfire_reports where id='${report.id}'`)).rows[0];
 expect(result.evidence).toEqual({});expect(result.reason).toBe('Content removed following account deletion');expect(result.target_id).toBeNull();
 expect((await db.query<any>(`select note from public.campfire_moderation_actions where report_id='${report.id}'`)).rows[0].note).toBe('Content removed following account deletion');
});
it('reserves retention pruning for the service role and deletes expired records',async()=>{
 const {host,member,snapshot}=await freshRoom();const report=await rpc(host,`select public.campfire_report_v1('${snapshot.id}','${member}','Retention test')`);
 await rpc(moderator,`select public.campfire_moderate_v1('${report.id}','dismiss','No action required')`);
 await db.exec(`update public.campfire_reports set created_at=now()-interval '91 days' where id='${report.id}'`);
 await expect(rpc(host,'select public.campfire_maintenance_v1()')).rejects.toThrow(/permission denied/);
 await rpc('', 'select public.campfire_maintenance_v1()','service_role');
 expect((await db.query(`select * from public.campfire_reports where id='${report.id}'`)).rows).toHaveLength(0);
 expect((await db.query(`select * from public.campfire_moderation_actions where report_id='${report.id}'`)).rows).toHaveLength(0);
});
it('redacts room-title evidence when a departed host absent from participants is deleted',async()=>{
 const {host,member,snapshot}=await freshRoom();const target=request();await db.exec(`insert into auth.users(id) values('${target}')`);
 let r=await rpc(target,`select public.campfire_join_v1('${snapshot.code}','Third ranger','fox')`);
 await db.exec(`update public.campfire_rooms set name='Campfire-Alice' where id='${r.id}'`);
 r=await rpc(host,`select public.campfire_command_v1('${r.id}','${request()}',${r.revision},'start')`);
 await rpc(host,`select public.campfire_command_v1('${r.id}','${request()}',${r.revision},'leave')`);
 const report=await rpc(member,`select public.campfire_report_v1('${r.id}','${target}','Third ranger report')`);
 const before=(await db.query<any>(`select evidence from public.campfire_reports where id='${report.id}'`)).rows[0].evidence;
 expect(before.name).toBe('Campfire-Alice');expect(before.participants.map((p:any)=>p.id)).not.toContain(host);
 await db.exec(`delete from auth.users where id='${host}'`);
 const after=(await db.query<any>(`select evidence,room_id from public.campfire_reports where id='${report.id}'`)).rows[0];
 expect(after.evidence).toEqual({});expect(after.room_id).toBeNull();
});
it('preserves host deletion provenance after room-retention pruning',async()=>{
 const {host,member,snapshot}=await freshRoom();const target=request();await db.exec(`insert into auth.users(id) values('${target}')`);
 let r=await rpc(target,`select public.campfire_join_v1('${snapshot.code}','Third ranger','fox')`);
 r=await rpc(host,`select public.campfire_command_v1('${r.id}','${request()}',${r.revision},'start')`);
 await rpc(host,`select public.campfire_command_v1('${r.id}','${request()}',${r.revision},'leave')`);
 const report=await rpc(member,`select public.campfire_report_v1('${r.id}','${target}','Third ranger report')`);
 await db.exec(`delete from public.campfire_rooms where id='${r.id}';delete from auth.users where id='${host}'`);
 expect((await db.query<any>(`select evidence from public.campfire_reports where id='${report.id}'`)).rows[0].evidence).toEqual({});
});
