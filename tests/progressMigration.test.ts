import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createInitialSaveData, saveStorageKey } from '../src/lib/game/storage';
import { GAME_CONFIG } from '../src/lib/game/config';
let items:Map<string,string>;
beforeEach(()=>{items=new Map();vi.stubGlobal('localStorage',{getItem:(k:string)=>items.get(k)??null,setItem:(k:string,v:string)=>items.set(k,v)});});
afterEach(()=>vi.unstubAllGlobals());
it('retains legacy bytes and requires a separate choice for every destination owner',async()=>{
  const {getProgressMigration,rememberProgressChoice}=await import('../src/lib/game/progressMigration');
  const raw=JSON.stringify(createInitialSaveData());items.set(GAME_CONFIG.storageKey,raw);
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
  const guest=createInitialSaveData();items.set(GAME_CONFIG.storageKey,JSON.stringify(guest));
  rememberProgressChoice('a',(await getProgressMigration('a'))!);guest.world.name='Changed';items.set(GAME_CONFIG.storageKey,JSON.stringify(guest));
  expect(await getProgressMigration('a')).not.toBeNull();
});
it('keeps damaged progress available for original-data export',async()=>{
  const {getProgressMigration}=await import('../src/lib/game/progressMigration');items.set(GAME_CONFIG.storageKey,'{broken');
  const pending=await getProgressMigration('a');expect(pending?.raw).toBe('{broken');expect(pending?.validation.isValid).toBe(false);
});
