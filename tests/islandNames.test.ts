import { describe, expect, it } from 'vitest';
import { createInitialSaveData } from '../src/lib/game/storage';
import { getIslandDisplayName, getWorldDisplayName } from '../src/lib/game/islandNames';

describe('island display names', () => {
  it.each([
    ['Suaka Utama', 'Main Sanctuary', 'Suaka Utama'],
    ['Main Sanctuary', 'Main Sanctuary', 'Suaka Utama'],
    ['Suaka Rimba', 'Rimba Sanctuary', 'Suaka Rimba'],
    ['Rimba Sanctuary', 'Rimba Sanctuary', 'Suaka Rimba'],
    ['My Rimba', 'My Rimba', 'Rimba Saya'],
    ['Suaka 2', 'Sanctuary 2', 'Suaka 2'],
    ['Sanctuary 3', 'Sanctuary 3', 'Suaka 3'],
    ['Suaka Afa', "Afa’s Sanctuary", 'Suaka Afa'],
  ])('localizes legacy generated name %s when switching both ways', (name, en, id) => {
    const island = { name };
    expect(getIslandDisplayName(island, 'en', 'Afa')).toBe(en);
    expect(getIslandDisplayName(island, 'id', 'Afa')).toBe(id);
    expect(island.name).toBe(name);
  });

  it.each(['Suaka Kantor', 'My Quiet Place', 'Suaka Another Ranger', 'Sanctuary Garden'])('preserves custom name %s in both languages', name => {
    expect(getIslandDisplayName({ name }, 'en', 'Afa')).toBe(name);
    expect(getIslandDisplayName({ name }, 'id', 'Afa')).toBe(name);
  });

  it('preserves an explicitly chosen name even when it matches a generated name', () => {
    expect(getIslandDisplayName({ name: 'Suaka 2', name_source: 'custom' }, 'en')).toBe('Suaka 2');
    expect(getIslandDisplayName({ name: 'Main Sanctuary', name_source: 'custom' }, 'id')).toBe('Main Sanctuary');
  });

  it('localizes the profile/share world name without modifying saved progress', () => {
    const save = createInitialSaveData();
    save.profile.name = 'Afa';
    save.world.name = 'Suaka Afa';
    const original = JSON.stringify(save);
    expect(getWorldDisplayName(save, 'en')).toBe('Afa’s Sanctuary');
    expect(getWorldDisplayName(save, 'id')).toBe('Suaka Afa');
    expect(JSON.stringify(save)).toBe(original);
  });

  it('preserves custom world names after an island was explicitly renamed', () => {
    const save = createInitialSaveData();
    save.world.name = 'Suaka 2';
    save.islands![0] = { ...save.islands![0], name: 'Suaka 2', name_source: 'custom' };
    expect(getWorldDisplayName(save, 'en')).toBe('Suaka 2');
  });
});
