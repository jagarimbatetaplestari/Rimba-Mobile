import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createInitialSaveData, saveStorageKey } from '../src/lib/game/storage';
import { GAME_CONFIG } from '../src/lib/game/config';
let items:Map<string,string>;
beforeEach(()=>{items=new Map();vi.stubGlobal('localStorage',{getItem:(k:string)=>items.get(k)??null,setItem:(k:string,v:string)=>items.set(k,v)});});
afterEach(()=>vi.unstubAllGlobals());
it('retains legacy bytes and requires a separate choice for every destination owner',async()=>{
  const {getProgressMigration,rememberProgressChoice}=await import('../src/lib/game/progressMigration');
  const legacy=createInitialSaveData();legacy.world.name='Legacy sanctuary';
  const raw=JSON.stringify(legacy);items.set(GAME_CONFIG.storageKey,raw);
  const pending=await getProgressMigration('a');expect(pending?.kind).toBe('legacy');
  expect(pending?.validation.data?.subscription).toBeUndefined();
  rememberProgressChoice('a',pending!);expect(await getProgressMigration('a')).toBeNull();
  expect((await getProgressMigration('b'))?.raw).toBe(raw);expect(items.get(GAME_CONFIG.storageKey)).toBe(raw);
});
it('offers meaningful guest progress without moving it automatically',async()=>{
  const {getProgressMigration}=await import('../src/lib/game/progressMigration');
  const guest=createInitialSaveData();guest.todos=[{id:'todo',text:'Guest task',completed:false,created_at:'2026-01-01'}];
  const raw=JSON.stringify(guest);items.set(saveStorageKey('guest'),raw);
  expect((await getProgressMigration('a'))?.kind).toBe('guest');
  expect(await getProgressMigration('guest')).toBeNull();expect(items.get(saveStorageKey('guest'))).toBe(raw);
});
it('offers changed source progress again instead of reusing stale consent',async()=>{
  const {getProgressMigration,rememberProgressChoice}=await import('../src/lib/game/progressMigration');
  const guest=createInitialSaveData();guest.world.name='Legacy sanctuary';items.set(GAME_CONFIG.storageKey,JSON.stringify(guest));
  rememberProgressChoice('a',(await getProgressMigration('a'))!);guest.world.name='Changed';items.set(GAME_CONFIG.storageKey,JSON.stringify(guest));
  expect(await getProgressMigration('a')).not.toBeNull();
});
it('keeps damaged progress available for original-data export',async()=>{
  const {getProgressMigration}=await import('../src/lib/game/progressMigration');items.set(GAME_CONFIG.storageKey,'{broken');
  const pending=await getProgressMigration('a');expect(pending?.raw).toBe('{broken');expect(pending?.validation.isValid).toBe(false);
});
it('skips empty guest saves without dismissing their future progress',async()=>{
  const {getProgressMigration}=await import('../src/lib/game/progressMigration');
  const guest=createInitialSaveData();items.set(saveStorageKey('guest'),JSON.stringify(guest));
  expect(await getProgressMigration('a')).toBeNull();
  expect(await getProgressMigration('a')).toBeNull();
  guest.todos=[{id:'later',text:'New guest task',completed:false,created_at:'2026-01-01'}];
  const raw=JSON.stringify(guest);items.set(saveStorageKey('guest'),raw);
  expect((await getProgressMigration('a'))?.raw).toBe(raw);
});
it('requires fresh consent for changed guest bytes despite old completion markers',async()=>{
  const {getProgressMigration,rememberProgressChoice}=await import('../src/lib/game/progressMigration');
  const guest=createInitialSaveData();guest.todos=[{id:'task',text:'Guest task',completed:false,created_at:'2026-01-01'}];
  items.set(saveStorageKey('guest'),JSON.stringify(guest));
  rememberProgressChoice('a',(await getProgressMigration('a'))!);
  expect(await getProgressMigration('a')).toBeNull();
  items.set('rimba_progress_choice_done:a:guest','1');
  guest.todos[0].completed=true;const raw=JSON.stringify(guest);items.set(saveStorageKey('guest'),raw);
  expect((await getProgressMigration('a'))?.raw).toBe(raw);
  expect((await getProgressMigration('b'))?.raw).toBe(raw);
});
it('keeps damaged source recoverable even when the owner already has progress',async()=>{
  const {getProgressMigration}=await import('../src/lib/game/progressMigration');
  const own=createInitialSaveData();own.todos=[{id:'own',text:'Owner task',completed:false,created_at:'2026-01-01'}];
  items.set(saveStorageKey('a'),JSON.stringify(own));
  items.set(GAME_CONFIG.storageKey,'{broken');items.set('rimba_progress_choice_done:a:legacy','1');
  const pending=await getProgressMigration('a');
  expect(pending?.raw).toBe('{broken');expect(pending?.validation.isValid).toBe(false);
});
it('retains empty legacy bytes without prompting and offers later customization',async()=>{
  const {getProgressMigration}=await import('../src/lib/game/progressMigration');
  const legacy=createInitialSaveData();const raw=JSON.stringify(legacy);items.set(GAME_CONFIG.storageKey,raw);
  expect(await getProgressMigration('a')).toBeNull();expect(await getProgressMigration('a')).toBeNull();
  expect(await getProgressMigration('b')).toBeNull();expect(items.get(GAME_CONFIG.storageKey)).toBe(raw);
  legacy.world.name='My sanctuary';items.set(GAME_CONFIG.storageKey,JSON.stringify(legacy));
  expect((await getProgressMigration('a'))?.kind).toBe('legacy');
});
it('does not mistake modified starter balances for an empty save',async()=>{
  const {getProgressMigration}=await import('../src/lib/game/progressMigration');
  const guest=createInitialSaveData();guest.currency_ledger[0].amount=90;
  items.set(saveStorageKey('guest'),JSON.stringify(guest));
  expect((await getProgressMigration('a'))?.kind).toBe('guest');
});
