import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ saveData: { subscription: undefined as any, islands: [] }, grantProForTesting: vi.fn() }));
vi.mock('../src/lib/game/useGameStore', () => ({ useGameStore: (select: any) => select(state) }));
import { useEntitlements } from '../src/lib/subscription/useEntitlements';
beforeEach(() => { state.saveData.subscription = undefined; });
it('provides the mixer contract and one island to Free users', () => {
 const result = useEntitlements();
 expect(result.entitlements.multiSoundscapeMixer).toBe(false);
 expect(result.maxIslands).toBe(1);
});
it('keeps paid access until expiry after auto-renewal is canceled', () => {
 state.saveData.subscription = { isPro: true, tier: 'pro_monthly', status: 'canceled', expiresAt: '2099-01-01' };
 expect(useEntitlements().isPro).toBe(true);
});
it('does not unlock Pro for an expired paid subscription', () => {
 state.saveData.subscription = { isPro: true, tier: 'pro_monthly', status: 'active', expiresAt: '2000-01-01' };
 expect(useEntitlements().isPro).toBe(false);
});
it('unlocks mixer and five islands for lifetime', () => {
 state.saveData.subscription = { isPro: true, tier: 'pioneer_lifetime', status: 'lifetime', expiresAt: null };
 const result = useEntitlements();
 expect(result.entitlements.multiSoundscapeMixer).toBe(true);
 expect(result.maxIslands).toBe(5);
});
