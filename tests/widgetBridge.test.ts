import { beforeEach, describe, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ sync: vi.fn(), clear: vi.fn(), native: true }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => m.native, getPlatform: () => 'ios' }, registerPlugin: () => ({ syncWidgetState: m.sync, clearWidgetState: m.clear }) }));
vi.mock('../src/lib/settings/usePreferencesStore', () => ({ usePreferencesStore: { getState: () => ({ language: 'id' }) } }));
import { createInitialSaveData } from '../src/lib/game/storage';
import { clearWidgetCacheOnSignOut, syncWidgetsWithSaveData, buildWidgetPayload } from '../src/lib/mobile/widgetBridge';
beforeEach(async () => {
  vi.stubGlobal('window', {});
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() });
  m.native = true; m.sync.mockReset(); m.clear.mockResolvedValue({ cleared: true });
  await clearWidgetCacheOnSignOut();
});
describe('native widget synchronization', () => {
  it('retries a failed native write and acknowledges only real native success', async () => {
    const save = createInitialSaveData();
    m.sync.mockRejectedValueOnce(new Error('unregistered')).mockResolvedValue({ synced: true });
    expect((await syncWidgetsWithSaveData(save)).nativeSynced).toBe(false);
    expect((await syncWidgetsWithSaveData(save)).nativeSynced).toBe(true);
    expect((await syncWidgetsWithSaveData(save)).nativeSynced).toBe(true);
    expect(m.sync).toHaveBeenCalledTimes(2);
  });
  it('does not report native success for a web preview or negative acknowledgement', async () => {
    m.native = false;
    expect((await syncWidgetsWithSaveData(createInitialSaveData())).nativeSynced).toBe(false);
    m.native = true; m.sync.mockResolvedValue({ synced: false });
    expect((await syncWidgetsWithSaveData(createInitialSaveData())).nativeSynced).toBe(false);
  });
  it('clears the native state on sign out and excludes private labels from the shared payload', async () => {
    const save = createInitialSaveData(); save.profile.name = 'Private Ranger';
    m.sync.mockResolvedValue({ synced: true }); await syncWidgetsWithSaveData(save);
    expect(m.sync.mock.calls[0][0].payload).not.toContain('Private Ranger');
    await clearWidgetCacheOnSignOut(); expect(m.clear).toHaveBeenCalled();
  });
  it('marks a paused session explicitly so native countdown does not keep ticking', () => {
    const payload = buildWidgetPayload(createInitialSaveData(), { status: 'active', paused_at: new Date().toISOString(), expected_end_at: '2099-01-01T00:00:00Z' } as any);
    expect(payload.isFocusPaused).toBe(true);
  });
  it('finishes an in-flight old-owner write before clearing it and never deduplicates it as current', async () => {
    let finish!: (value: { synced: boolean }) => void;
    const order: string[] = [];
    m.sync.mockImplementationOnce(() => { order.push('old write'); return new Promise(resolve => { finish = resolve; }); })
      .mockResolvedValue({ synced: true });
    m.clear.mockImplementation(async () => { order.push('clear'); return { cleared: true }; });
    const save = createInitialSaveData();
    const old = syncWidgetsWithSaveData(save);
    await Promise.resolve();
    const cleared = clearWidgetCacheOnSignOut();
    finish({ synced: true });
    expect((await old).nativeSynced).toBe(false);
    await cleared;
    expect(order).toEqual(['old write', 'clear']);
    await syncWidgetsWithSaveData(save);
    expect(m.sync).toHaveBeenCalledTimes(2);
  });
});
