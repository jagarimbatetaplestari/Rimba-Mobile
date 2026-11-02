import { describe, expect, it } from 'vitest';
import { parseWidgetAction } from '../src/lib/mobile/widgetActions';
describe('widget routes', () => {
  it('allows only the app scheme and known routes', () => {
    expect(parseWidgetAction('https://focus?minutes=25')).toBeNull();
    expect(parseWidgetAction('rimba://unknown')).toBeNull();
    expect(parseWidgetAction('rimba://focus/other')).toBeNull();
    expect(parseWidgetAction('invalid')).toBeNull();
    expect(parseWidgetAction('rimba://journal')).toEqual({ route: 'journal' });
  });
  it('accepts complete valid minutes and falls back safely for malformed durations', () => {
    expect(parseWidgetAction('rimba://focus?minutes=45')).toEqual({ route: 'focus', minutes: 45 });
    for (const value of ['NaN', '25oops', '0', '121', '25.5']) {
      expect(parseWidgetAction(`rimba://focus?minutes=${value}`)).toEqual({ route: 'focus', minutes: 25 });
    }
  });
});
