export function parseWidgetAction(raw: string): { route: 'focus'; minutes: number } | { route: 'soundscape' | 'journal' | 'zen' } | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'rimba:' || url.username || url.password || url.port || (url.pathname && url.pathname !== '/')) return null;
    if (url.host === 'focus') {
      const value = url.searchParams.get('minutes') || '25';
      const minutes = /^\d+$/.test(value) ? Number(value) : NaN;
      return { route: 'focus', minutes: Number.isInteger(minutes) && minutes >= 5 && minutes <= 120 ? minutes : 25 };
    }
    if (url.host === 'soundscape' || url.host === 'journal' || url.host === 'zen') return { route: url.host };
  } catch { /* Ignore links that are not Rimba widget routes. */ }
  return null;
}
