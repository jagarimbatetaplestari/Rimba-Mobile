import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { createInitialSaveData } from '../src/lib/game/storage';

const state = vi.hoisted(() => ({ language: 'en', saveData: null as any }));
vi.mock('../src/lib/settings/usePreferencesStore', () => ({ usePreferencesStore: (select: any) => select({ language: state.language }) }));
vi.mock('../src/lib/game/useGameStore', () => ({ useGameStore: (select: any) => select({ saveData: state.saveData }) }));
vi.mock('../src/lib/subscription/useEntitlements', () => ({ useEntitlements: () => ({ isPro: true, maxIslands: 5, canCreateNewIsland: true }) }));
vi.mock('../src/lib/mobile/nativeBridge', () => ({ hapticLight: () => {}, hapticMedium: () => {}, hapticSuccess: () => {}, hapticWarning: () => {} }));
vi.mock('../src/lib/audio/sounds', () => ({ soundManager: {} }));
import { IslandSwitcherModal } from '../src/components/modals/IslandSwitcherModal';

beforeEach(() => {
  state.language = 'en';
  state.saveData = createInitialSaveData();
});
const render = () => renderToStaticMarkup(React.createElement(IslandSwitcherModal, { isOpen: true, onClose: () => {} }));

it('switches island names and biome labels to the current language without rewriting the save', () => {
  const original = JSON.stringify(state.saveData);
  const english = render();
  expect(english).toContain('Main Sanctuary');
  expect(english).toContain('Emerald Meadow');
  expect(english).not.toContain('Suaka Utama');
  state.language = 'id';
  const indonesian = render();
  expect(indonesian).toContain('Suaka Utama');
  expect(indonesian).toContain('Padang Rumput Zamrud');
  expect(JSON.stringify(state.saveData)).toBe(original);
});

it('shows the user name exactly in both languages even if it resembles a generated name', () => {
  state.saveData.islands[0].name = 'Suaka 2';
  state.saveData.islands[0].name_source = 'custom';
  expect(render()).toContain('Suaka 2');
  state.language = 'id';
  expect(render()).toContain('Suaka 2');
});
