import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), signOut: vi.fn(), reset: vi.fn() }));
vi.mock('../src/lib/supabase/client', () => ({ supabase: { rpc: mocks.rpc, auth: { signOut: mocks.signOut } } }));
vi.mock('../src/lib/supabase/cloudSync', () => ({ invalidateCloudSyncSession: vi.fn(), smartSyncOnLogin: vi.fn() }));
vi.mock('../src/lib/game/storage', () => ({ createInitialSaveData: () => ({ active_biome: 'meadow' }) }));
vi.mock('../src/lib/game/useGameStore', () => ({ useGameStore: { setState: mocks.reset } }));
import { useAuthStore } from '../src/lib/auth/useAuthStore';
const user = { id: 'account-a', email: '', name: 'Ranger', isGuest: false, createdAt: '2026-11-01' };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.signOut.mockResolvedValue({ error: null });
  useAuthStore.setState({ user });
});
describe('account deletion data safety', () => {
  it('preserves session and game state when server returns an error', async () => {
    mocks.rpc.mockResolvedValue({ error: new Error('Deletion refused') });
    await expect(useAuthStore.getState().deleteAccountAndData()).rejects.toThrow('Deletion refused');
    expect(useAuthStore.getState().user).toEqual(user);
    expect(mocks.reset).not.toHaveBeenCalled();
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
  it('preserves data when the network request rejects', async () => {
    mocks.rpc.mockRejectedValue(new Error('Offline'));
    await expect(useAuthStore.getState().deleteAccountAndData()).rejects.toThrow('Offline');
    expect(useAuthStore.getState().user).toEqual(user);
    expect(mocks.reset).not.toHaveBeenCalled();
  });
  it('does not wipe data without an account identity', async () => {
    useAuthStore.setState({ user: null });
    await expect(useAuthStore.getState().deleteAccountAndData()).rejects.toThrow();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.reset).not.toHaveBeenCalled();
  });
  it('clears local state only after confirmed server success, including hidden email', async () => {
    mocks.rpc.mockResolvedValue({ error: null });
    await useAuthStore.getState().deleteAccountAndData();
    expect(mocks.rpc).toHaveBeenCalledWith('delete_user_account');
    expect(useAuthStore.getState().user).toBeNull();
    expect(mocks.reset).toHaveBeenCalledOnce();
  });
  it('allows a guest to clear local progress without deleting a cloud account', async () => {
    useAuthStore.setState({ user: { ...user, isGuest: true } });
    await useAuthStore.getState().deleteAccountAndData();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.reset).toHaveBeenCalledOnce();
  });
});
