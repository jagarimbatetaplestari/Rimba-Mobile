import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ lang: 'en', notification: { message: 'Saved', type: 'success' } }));
vi.mock('../src/lib/i18n/translations', () => ({ useTranslation: () => ({ lang: state.lang, t: { common: { close: state.lang === 'en' ? 'Close' : 'Tutup' } } }) }));
vi.mock('../src/lib/game/useGameStore', () => ({ useGameStore: (selector: any) => selector({ notification: state.notification, dismissNotification: () => {} }) }));
vi.mock('../src/lib/mobile/nativeBridge', () => ({ hapticLight: () => {} }));
vi.mock('../src/lib/audio/sounds', () => ({ soundManager: { playPop: () => {} } }));
vi.mock('next/dynamic', () => ({ default: (_loader: any, options: any) => options.loading }));
vi.mock('../src/components/canvas/SceneFallback', () => ({ SceneFallback: () => null }));
import { LoadingSanctuary } from '../src/components/feedback/LoadingSanctuary';
import { CanvasWrapper } from '../src/components/canvas/CanvasWrapper';
import { NotificationToast } from '../src/components/feedback/NotificationToast';
beforeEach(() => { state.lang = 'en'; });
it('renders the English loading title, reflection and interaction cue', () => {
  const html = renderToStaticMarkup(React.createElement(LoadingSanctuary));
  expect(html).toContain('Preparing your Rimba sanctuary');
  expect(html).toContain('Breathe slowly');
  expect(html).toContain('Tap the screen to breathe');
  expect(html).not.toContain('Tarik napas');
});
it('renders Indonesian loading copy and preserves caller messages', () => {
  state.lang = 'id';
  const html = renderToStaticMarkup(React.createElement(LoadingSanctuary));
  expect(html).toContain('Menyiapkan Suaka Rimba');
  expect(html).toContain('Tarik napas');
  expect(html).toContain('Ketuk layar untuk bernapas');
  expect(renderToStaticMarkup(React.createElement(LoadingSanctuary, { message: 'Custom progress', subMessage: 'Custom detail' }))).toContain('Custom detail');
});
it.each([['en', 'Preparing your island'], ['id', 'Menyiapkan pulau']])('localizes the scene loading fallback in %s', (lang, text) => {
  state.lang = lang;
  expect(renderToStaticMarkup(React.createElement(CanvasWrapper))).toContain(text);
});
it.each([['en', 'Dismiss notification'], ['id', 'Tutup notifikasi']])('localizes notification dismissal in %s', (lang, label) => {
  state.lang = lang;
  const html = renderToStaticMarkup(React.createElement(NotificationToast));
  expect(html).toContain(`aria-label="${label}"`);
  expect(html).toContain('role="status"');
});
