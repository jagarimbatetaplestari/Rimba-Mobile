import { expect, it } from 'vitest';
// Load the real store/sync dependency graph: mocked stores hide circular initialization errors.
it('loads the production auth and sync modules before starting account watchers', async () => {
  const { useAuthStore } = await import('../src/lib/auth/useAuthStore');
  const { getLastSyncedAt } = await import('../src/lib/supabase/cloudSync');
  expect(useAuthStore.getState().user).toBeNull();
  expect(getLastSyncedAt()).toBeNull();
});
