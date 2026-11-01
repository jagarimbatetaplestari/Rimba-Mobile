import { describe, expect, it } from 'vitest';
import { validateRimbaBackup } from '../src/lib/game/backupManager';
import { createInitialSaveData } from '../src/lib/game/storage';

const invalid = (change: (save: any) => void) => {
  const save = createInitialSaveData(); change(save);
  expect(validateRimbaBackup(save).isValid).toBe(false);
};
describe('nested backup boundaries', () => {
  it('rejects wrong core container types', () => {
    for (const field of ['profile','world','focus_sessions','currency_ledger']) {
      invalid(s => { s[field] = 'broken'; });
    }
  });
  it('rejects malformed and duplicate world objects', () => {
    for (const value of [null, { ...createInitialSaveData().world_objects[0], grid_x: 10 },
      { ...createInitialSaveData().world_objects[0], rotation: NaN }]) {
      invalid(s => { s.world_objects.push(value); });
    }
    invalid(s => { s.world_objects.push({ ...s.world_objects[0] }); });
  });
  it('rejects malformed focus sessions before analytics sees them', () => {
    const session = { id: 's', status: 'completed', started_at: '2026-01-01T00:00:00Z',
      expected_end_at: '2026-01-01T00:25:00Z', completed_at: '2026-01-01T00:25:00Z',
      rewarded: true, duration_minutes: 25 };
    for (const value of [{ ...session, duration_minutes: '25' }, { ...session, started_at: 'bad-date' },
      { ...session, status: 'broken' }]) invalid(s => { s.focus_sessions = [value]; });
    invalid(s => { s.focus_sessions = [session, { ...session }]; });
  });
  it('rejects malformed island data and active-island references', () => {
    invalid(s => { s.islands[0].world_objects = [null]; });
    invalid(s => { s.islands.push({ ...s.islands[0] }); });
    invalid(s => { s.active_island_id = 'missing-island'; });
  });
  it('rejects invalid tiles, todos and custom tags', () => {
    invalid(s => { s.world.unlocked_tiles = ['999,999']; });
    invalid(s => { s.todos = [{ id: 't', text: {}, completed: false, created_at: '2026-01-01' }]; });
    invalid(s => { s.custom_tags = [{ id: 'tag', label: null, color: '#fff' }]; });
  });
  it('rejects oversized input before parsing', () => {
    expect(validateRimbaBackup(' '.repeat(20 * 1024 * 1024 + 1)).error).toContain('20 MiB');
  });
  it('rejects deep and circular object input without crashing', () => {
    invalid(s => { s.world.extra = s; });
    invalid(s => { let node = s.world; for (let i = 0; i < 40; i++) node = node.extra = {}; });
  });
  it('accepts a normal full save and retains its island', () => {
    const save = createInitialSaveData();
    const result = validateRimbaBackup(JSON.stringify(save));
    expect(result.isValid).toBe(true);
    expect(result.data?.islands?.[0].world_objects).toEqual(save.islands?.[0].world_objects);
  });
});
it('retains a populated version1 reclamation history and focus session', () => {
  const save = createInitialSaveData();
  save.reclamation_events = [{ id: 'reclaim', triggered_at: '2026-01-01T00:00:00Z',
    inactivity_hours: 50, objects_affected: ['obj_tree_starter'] }];
  save.focus_sessions = [{ id: 'focus', started_at: '2026-01-01T00:00:00Z',
    expected_end_at: '2026-01-01T00:25:00Z', completed_at: '2026-01-01T00:25:00Z',
    status: 'completed', rewarded: true, duration_minutes: 25 }];
  save.todos = [{ id: 't', text: 'Task', completed: true, created_at: '2026-01-01' }];
  const result = validateRimbaBackup(save);
  expect(result.isValid).toBe(true);
  expect(result.data?.reclamation_events).toEqual(save.reclamation_events);
  expect(result.summary?.totalFocusMinutes).toBe(25);
});
