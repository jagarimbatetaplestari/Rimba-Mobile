import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ language: 'en' }));
vi.mock('../src/lib/settings/usePreferencesStore', () => ({ usePreferencesStore: { getState: () => ({ language: state.language }) } }));
vi.mock('../src/lib/mobile/widgetBridge', () => ({ syncWidgetsWithSaveData: vi.fn() }));
vi.mock('../src/lib/mobile/nativeBridge', () => ({ requestScreenWakeLock: vi.fn(), releaseScreenWakeLock: vi.fn() }));
vi.mock('../src/lib/supabase/cloudSync', () => ({ scheduleDebouncedCloudSync: vi.fn(), syncProfileUpdate: vi.fn() }));
vi.mock('../src/lib/game/storage', async original => ({ ...await original<any>(), saveSaveData: vi.fn() }));
import { useGameStore } from '../src/lib/game/useGameStore';
import { createInitialSaveData } from '../src/lib/game/storage';
import { getIslandDisplayName, getWorldDisplayName } from '../src/lib/game/islandNames';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('window', { dispatchEvent: vi.fn() });
  state.language = 'en';
  const saveData = createInitialSaveData();
  saveData.subscription!.isPro = true;
  useGameStore.setState({ saveData, activeBiome: 'meadow', notification: null });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it.each([['en', 'Sanctuary 2'], ['id', 'Suaka 2']])('creates the unnamed island in %s and keeps its generated name localizable', (language, name) => {
  state.language = language;
  expect(useGameStore.getState().createNewIsland('', 'snow')).toBe(true);
  const save = useGameStore.getState().saveData;
  const island = save.islands!.find(item => item.id === save.active_island_id)!;
  expect(island.name).toBe(name);
  expect(getIslandDisplayName(island, 'en')).toBe('Sanctuary 2');
  expect(getWorldDisplayName(save, 'id')).toBe('Suaka 2');
});

it('preserves an explicitly typed name on creation even when it matches a generated name', () => {
  expect(useGameStore.getState().createNewIsland('Suaka 2', 'meadow')).toBe(true);
  const save = useGameStore.getState().saveData;
  expect(getWorldDisplayName(save, 'en')).toBe('Suaka 2');
});

it('preserves an explicit rename in the island list and active world across languages', () => {
  useGameStore.getState().renameIsland('island_default', 'Suaka Utama');
  const save = useGameStore.getState().saveData;
  expect(getIslandDisplayName(save.islands![0], 'en')).toBe('Suaka Utama');
  expect(getWorldDisplayName(save, 'en')).toBe('Suaka Utama');
});

it('uses the selected language in island arrival feedback', () => {
  expect(useGameStore.getState().createNewIsland('', 'snow')).toBe(true);
  expect(useGameStore.getState().switchIsland('island_default')).toBe(true);
  expect(useGameStore.getState().notification?.message).toContain('Arrived at Main Sanctuary');
});
