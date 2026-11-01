import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialSaveData, loadSaveData, saveSaveData } from '../src/lib/game/storage';
import { GAME_CONFIG } from '../src/lib/game/config';
let items: Map<string,string>;
const write = saveSaveData as (save: ReturnType<typeof createInitialSaveData>, owner: string) => void;
const read = loadSaveData as (owner: string) => ReturnType<typeof createInitialSaveData>;
beforeEach(() => { items = new Map(); vi.stubGlobal('window', {}); vi.stubGlobal('localStorage', {
  getItem: (key: string) => items.get(key) ?? null,
  setItem: (key: string, value: string) => items.set(key,value),
}); });
afterEach(() => vi.unstubAllGlobals());
describe('owner-bound durable saves', () => {
  it('keeps account A and B progress independent across switching back', () => {
    const a = createInitialSaveData(); a.world.name = 'A private island'; write(a,'a');
    const b = createInitialSaveData(); b.world.name = 'B private island'; write(b,'b');
    expect(read('a').world.name).toBe('A private island');
    expect(read('b').world.name).toBe('B private island');
  });
  it('keeps guest progress independent from an authenticated account', () => {
    const guest = createInitialSaveData(); guest.world.name = 'Guest'; write(guest,'guest');
    const a = createInitialSaveData(); a.world.name = 'Account'; write(a,'a');
    expect(read('guest').world.name).toBe('Guest');
    expect(read('a').world.name).toBe('Account');
  });
  it('rejects a late write carrying a different owner rather than writing it to B', () => {
    write(createInitialSaveData(),'a');
    const a = read('a'); const before = Array.from(items.entries());
    expect(() => write(a,'b')).toThrow();
    expect(Array.from(items.entries())).toEqual(before);
  });
  it('retains ambiguous legacy bytes without silently importing them into another account', () => {
    const legacy = createInitialSaveData(); legacy.world.name = 'Unclaimed legacy';
    const raw = JSON.stringify(legacy); items.set(GAME_CONFIG.storageKey,raw);
    expect(read('b').world.name).not.toBe('Unclaimed legacy');
    expect(items.get(GAME_CONFIG.storageKey)).toBe(raw);
  });
});
