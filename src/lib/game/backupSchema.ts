/** Bounds apply to both uploaded JSON and snapshot objects before normalization. */
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;
const record = (v: any): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: any) => typeof v === 'string';
const id = (v: any) => text(v) && v.trim().length > 0;
const finite = (v: any) => typeof v === 'number' && Number.isFinite(v);
const date = (v: any) => text(v) && Number.isFinite(Date.parse(v));
const maybe = (v: any, valid: (value: any) => boolean) => v === undefined || valid(v);
const nullableDate = (v: any) => v === null || date(v);
const coord = (v: any) => Number.isInteger(v) && v >= 0 && v < 10;
const strings = (v: any) => Array.isArray(v) && v.every(text);
const uniqueRecords = (v: any, valid: (value: any) => boolean) => {
  if (!Array.isArray(v)) return false;
  const ids = new Set<string>();
  return v.every(entry => {
    if (!record(entry) || !id(entry.id) || ids.has(entry.id) || !valid(entry)) return false;
    ids.add(entry.id); return true;
  });
};
const tiles = (v: any) => strings(v) && new Set(v).size === v.length && v.every((tile: string) =>
  /^[0-9],[0-9]$/.test(tile));
const world = (v: any): boolean => record(v) && id(v.id) && text(v.name) &&
  maybe(v.last_focus_completed_at, nullableDate) && maybe(v.last_reclamation_at, nullableDate) &&
  maybe(v.unlocked_tiles, tiles) && maybe(v.sealed_tiles, tiles) &&
  maybe(v.last_expanded_tile, (tile) => tile === null || tiles([tile])) &&
  maybe(v.bulldozer, (b) => b === null || (record(b) && typeof b.active === 'boolean' &&
    id(b.target_tree_id) && date(b.spawned_at) && finite(b.rotation) &&
    Array.isArray(b.position) && b.position.length === 3 && b.position.every(finite) &&
    Array.isArray(b.cone_positions) && b.cone_positions.length === 2 &&
    b.cone_positions.every((p: any) => Array.isArray(p) && p.length === 3 && p.every(finite))));
const objects = (v: any): boolean => uniqueRecords(v, o =>
  ['tree', 'rock', 'path'].includes(o.object_type) && coord(o.grid_x) && coord(o.grid_y) &&
  finite(o.rotation) && ['active', 'reclaimed', 'marked_for_clearing', 'withered'].includes(o.status) &&
  date(o.created_at) && nullableDate(o.reclaimed_at) &&
  maybe(o.scale, n => finite(n) && n > 0) && maybe(o.model_variant, text) &&
  maybe(o.species, text) && maybe(o.task_note, text) && maybe(o.focus_tag, text) &&
  maybe(o.focus_duration, n => finite(n) && n >= 0));
const sessions = (v: any): boolean => uniqueRecords(v, s =>
  date(s.started_at) && date(s.expected_end_at) && nullableDate(s.completed_at) &&
  ['active', 'completed', 'abandoned'].includes(s.status) && typeof s.rewarded === 'boolean' &&
  maybe(s.duration_minutes, n => finite(n) && n >= 0) &&
  ['tag', 'species', 'task_note', 'todo_id', 'campfire_room_code'].every(k => maybe(s[k], text)) &&
  ['strict_mode', 'is_stopwatch', 'is_shared_destiny', 'is_paused'].every(k => maybe(s[k], b => typeof b === 'boolean')) &&
  maybe(s.companions, strings) && maybe(s.paused_at, nullableDate) &&
  maybe(s.total_paused_ms, n => finite(n) && n >= 0) &&
  maybe(s.target_tile, t => record(t) && coord(t.grid_x) && coord(t.grid_y)));

function assertBoundedJson(value: unknown): void {
  let nodes = 0;
  const ancestors = new Set<object>();
  const visit = (v: any, depth: number) => {
    if (++nodes > 250000 || depth > 32) throw new Error('Struktur cadangan terlalu besar atau terlalu dalam.');
    if (v === null || v === undefined || typeof v === 'boolean' || text(v) || finite(v)) return;
    if (typeof v !== 'object' || ancestors.has(v)) throw new Error('Cadangan harus berupa data JSON yang valid.');
    if (!Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null) {
      throw new Error('Cadangan harus berupa data JSON yang valid.');
    }
    ancestors.add(v);
    for (const [key, child] of Object.entries(v)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Kunci cadangan tidak valid.');
      visit(child, depth + 1);
    }
    ancestors.delete(v);
  };
  visit(value, 0);
  if (new TextEncoder().encode(JSON.stringify(value)).byteLength > MAX_BACKUP_BYTES) {
    throw new Error('Ukuran cadangan maksimal 20 MiB.');
  }
}

export function assertBackupStructure(value: unknown): void {
  assertBoundedJson(value);
  const s = value as Record<string, any>;
  if (!record(s) || s.version !== 1 || !record(s.profile) || !world(s.world) ||
    !objects(s.world_objects) || !sessions(s.focus_sessions) || !Array.isArray(s.currency_ledger)) {
    throw new Error('Struktur profile, pulau, objek, atau sesi fokus tidak valid.');
  }
  if (!uniqueRecords(s.currency_ledger, e => ['gold', 'xp'].includes(e.currency) && finite(e.amount) &&
    text(e.reason) && text(e.reference_id) && date(e.created_at))) throw new Error('Ledger tidak valid atau memiliki ID duplikat.');
  if (!maybe(s.islands, islands => uniqueRecords(islands, i => text(i.name) &&
    ['meadow', 'autumn', 'snow', 'lotus'].includes(i.biome) && date(i.created_at) && world(i.world) && objects(i.world_objects))) ||
    (s.islands?.length && s.active_island_id && !s.islands.some((i: any) => i.id === s.active_island_id))) {
    throw new Error('Struktur kepulauan atau pulau aktif tidak valid.');
  }
  const lists = ['claimed_quests', 'claimed_achievements', 'used_shield_dates', 'claimed_story_chapters',
    'claimed_wisdom_fragments', 'pioneer_completed_ids'];
  if (!lists.every(k => maybe(s[k], strings)) ||
    !maybe(s.todos, todos => uniqueRecords(todos, t => text(t.text) && typeof t.completed === 'boolean' &&
      date(t.created_at) && maybe(t.completed_at, nullableDate) && maybe(t.tag, text))) ||
    !maybe(s.custom_tags, tags => uniqueRecords(tags, t => text(t.label) && text(t.color) && maybe(t.icon, text))) ||
    !maybe(s.animal_interactions, a => record(a) && Object.values(a).every(text)) ||
    !maybe(s.reclamation_events, events => uniqueRecords(events, e => date(e.triggered_at) &&
      finite(e.inactivity_hours) && e.inactivity_hours >= 0 && strings(e.objects_affected))) ||
    !maybe(s.streak_shields, n => Number.isSafeInteger(n) && n >= 0) ||
    !maybe(s.active_biome, b => ['meadow', 'autumn', 'snow', 'lotus'].includes(b)) ||
    !maybe(s.active_island_id, id) || !maybe(s.auto_season_enabled, b => typeof b === 'boolean') ||
    !maybe(s.pioneer_reward_claimed, b => typeof b === 'boolean') ||
    !maybe(s.distraction_source, text) || !maybe(s.last_monthly_shield_month, text)) {
    throw new Error('Data tugas, koleksi, atau progres cadangan tidak valid.');
  }
}
