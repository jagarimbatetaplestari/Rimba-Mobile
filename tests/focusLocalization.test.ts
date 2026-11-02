import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ language: 'en', tag: 'Belajar', note: '', paused: false, strict: false, stopwatch: true }));
// Render the running countdown branch; effects do not execute during server rendering.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return { ...actual, useState: (initial: any) => actual.useState(initial === 0 ? 60 : initial) };
});
vi.mock('../src/lib/settings/usePreferencesStore', () => ({ usePreferencesStore: (select: any) => select({ language: state.language, setLanguage: () => {} }) }));
vi.mock('../src/lib/game/useGameStore', () => ({ useGameStore: (select: any) => select({
  isZenMode: true, timeOfDay: 'day', focusSetup: { minutes: 25, tag: 'Belajar', species: 'oak', strictMode: false },
  activeSession: { id: 'test-session', tag: state.tag, task_note: state.note, species: 'oak', status: 'active', is_stopwatch: state.stopwatch, is_paused: state.paused, strict_mode: state.strict, started_at: new Date().toISOString(), expected_end_at: new Date(Date.now() + 1500000).toISOString() },
  saveData: { profile: { xp: 0 }, custom_tags: [], world: {}, world_objects: [], todos: [] },
}) }));
vi.mock('../src/lib/mobile/nativeBridge', () => ({ hapticLight: () => {}, hapticMedium: () => {}, hapticWarning: () => {}, hapticSuccess: () => {} }));
vi.mock('../src/lib/mobile/notificationManager', () => ({ checkOrRequestNotificationPermission: () => {}, scheduleFocusCompletionNotification: () => {}, cancelPendingFocusNotifications: () => {} }));
vi.mock('../src/lib/audio/sounds', () => ({ soundManager: {} }));
vi.mock('../src/lib/audio/soundscapes', () => ({ soundscapeManager: { getCurrentTrack: () => 'off', getVolume: () => 0.5 }, SOUNDSCAPES_LIST: [] }));
vi.mock('../src/lib/game/worldRules', () => ({ getUnlockedTilesSet: () => new Set(['0,0']), getLandExpansionZoneInfo: () => ({ nextTileCost: 30 }), findEmptyTileNearCenter: () => null, gridToWorld: () => [0,0,0] }));
import { ZenFocusOverlay } from '../src/components/focus/ZenFocusOverlay';
import { MobileFocusCard } from '../src/components/focus/MobileFocusCard';
beforeEach(() => { Object.assign(state, { language: 'en', tag: 'Belajar', note: '', paused: false, strict: false, stopwatch: true }); });
it('uses English built-in category and tree names in Zen mode', () => {
  const html = renderToStaticMarkup(React.createElement(ZenFocusOverlay));
  expect(html).toContain('title="Classic Oak"');
  expect(html).toContain('>Study</span>');
  expect(html).not.toContain('>Belajar</span>');
});
it('preserves personal task notes and custom categories in Zen mode', () => {
  state.tag = 'My writing';
  expect(renderToStaticMarkup(React.createElement(ZenFocusOverlay))).toContain('My writing');
  state.note = 'My personal task';
  expect(renderToStaticMarkup(React.createElement(ZenFocusOverlay))).toContain('My personal task');
});
it.each([[false, false, 'Jeda Sesi'], [true, false, 'Lanjutkan Fokus'], [false, true, 'Jeda dinonaktifkan di Mode Fokus Penuh']])('localizes pause accessibility labels in both focus views (paused=%s, strict=%s)', (paused, strict, label) => {
  Object.assign(state, { language: 'id', paused, strict, stopwatch: false });
  for (const Component of [ZenFocusOverlay, MobileFocusCard]) {
    const html = renderToStaticMarkup(React.createElement(Component));
    expect(html.match(/aria-label="[^"]*"/g)).toContain(`aria-label="${label}"`);
  }
});
import { TREE_SPECIES_CONFIG } from '../src/lib/game/config';
import { translateSpeciesDescription } from '../src/lib/i18n/translations';
it('localizes every selectable tree description without altering Indonesian copy', () => {
  for (const species of TREE_SPECIES_CONFIG) {
    expect(translateSpeciesDescription(species.id, species.description, 'en')).not.toBe(species.description);
    expect(translateSpeciesDescription(species.id, species.description, 'id')).toBe(species.description);
  }
});
