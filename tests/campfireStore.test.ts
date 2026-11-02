import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const f = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn(), getSession: vi.fn(),
  startFocus: vi.fn(), abandonFocus: vi.fn(), save: vi.fn(), game: {} as any, channel: vi.fn() }));
vi.mock('../src/lib/supabase/client', () => ({ supabase: { rpc: f.rpc,
  auth: { getUser: f.getUser, getSession: f.getSession }, channel: f.channel } }));
vi.mock('../src/lib/game/useGameStore', () => ({ useGameStore: {
  getState: () => f.game, setState: (next: any) => Object.assign(f.game, next),
} }));
vi.mock('../src/lib/game/storage', () => ({ saveSaveData: f.save }));
vi.mock('../src/lib/supabase/cloudSync', () => ({ scheduleDebouncedCloudSync: vi.fn() }));
vi.mock('../src/lib/audio/sounds', () => ({ soundManager: { playPop: vi.fn(), playComplete: vi.fn() } }));
vi.mock('../src/lib/mobile/nativeBridge', () => ({ hapticSuccess: vi.fn(), hapticWarning: vi.fn() }));
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const roomId = '33333333-3333-4333-8333-333333333333';
function room(overrides: Record<string, unknown> = {}) {
  return { id: roomId, code: 'abcdef0123456789abcdef0123456789', revision: 1,
    name: 'Forest circle', durationMinutes: 25, mode: 'shared_destiny', status: 'lobby',
    startedAt: null, severedBy: null, myParticipantId: owner,
    participants: [{ id: owner, name: 'Ranger', animal: 'fox', species: 'oak', isHost: true,
      status: 'ready', joinedAt: new Date().toISOString() }], ...overrides };
}
let store: typeof import('../src/lib/game/campfireStore').useCampfireStore;
const createRoom = () => store.getState().createRoom('Ranger', 25, 'fox', 'oak');
beforeEach(async () => {
  vi.resetModules(); vi.clearAllMocks(); vi.useFakeTimers();
  const stored = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value), removeItem: (key: string) => stored.delete(key) });
  vi.setSystemTime(new Date('2026-11-01T12:00:00Z'));
  f.getUser.mockResolvedValue({ data: { user: { id: owner, is_anonymous: false } }, error: null });
  f.getSession.mockResolvedValue({ data: { session: { user: { id: owner } } }, error: null });
  f.rpc.mockResolvedValue({ data: room(), error: null });
  f.channel.mockImplementation(() => { throw new Error('Broadcast forbidden'); });
  f.game = { activeSession: null, saveData: { storage_owner: owner, focus_sessions: [] }, startFocus: f.startFocus, abandonFocus: f.abandonFocus, notify: vi.fn() };
  f.startFocus.mockImplementation(() => {
    const session = { id: 'session-1', status: 'active', started_at: new Date().toISOString(), expected_end_at: '' };
    f.game.activeSession = session; f.game.saveData.focus_sessions.push(session);
  });
  store = (await import('../src/lib/game/campfireStore')).useCampfireStore;
});
afterEach(() => { store.getState().clearLocalRoom?.(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('server-authoritative Campfire', () => {
  it('does not fabricate a room when create fails', async () => {
    f.rpc.mockResolvedValue({ data: null, error: { message: 'room_limit_reached' } });
    expect(await createRoom()).toBe(false);
    expect(store.getState().currentRoom).toBeNull();
    expect(store.getState().error).toBeTruthy();
  });
  it('requires a verified non-anonymous user before creating or joining', async () => {
    f.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await createRoom()).toBe(false);
    expect(await store.getState().joinRoom(room().code, 'Ranger', 'fox', 'oak')).toBe(false);
    f.getUser.mockResolvedValue({ data: { user: { id: owner, is_anonymous: true } }, error: null });
    expect(await createRoom()).toBe(false);
    expect(f.rpc).not.toHaveBeenCalled();
    expect(store.getState().currentRoom).toBeNull();
  });
  it('uses only canonical RPC membership and a UUID request for creation', async () => {
    expect(await createRoom()).toBe(true);
    expect(f.rpc).toHaveBeenCalledWith('campfire_create_v1', expect.objectContaining({
      p_request_id: expect.stringMatching(/^[0-9a-f-]{36}$/i), p_display_name: 'Ranger',
      p_duration_minutes: 25, p_animal: 'fox', p_mode: 'shared_destiny',
    }));
    expect(store.getState().currentRoom?.id).toBe(roomId);
    expect(store.getState().myParticipantId).toBe(owner);
    expect(f.channel).not.toHaveBeenCalled();
  });
  it('rejects a snapshot that is not for the verified member', async () => {
    f.rpc.mockResolvedValue({ data: room({ myParticipantId: other }), error: null });
    expect(await createRoom()).toBe(false);
    expect(store.getState().currentRoom).toBeNull();
    expect(f.startFocus).not.toHaveBeenCalled();
  });
  it('does not update local mode or start gameplay when the server rejects a command', async () => {
    await createRoom();
    f.rpc.mockResolvedValue({ data: null, error: { message: 'host_required' } });
    expect(await store.getState().setRoomMode('gentle_circle')).toBe(false);
    expect(await store.getState().startRoomFocus()).toBe(false);
    expect(store.getState().currentRoom?.mode).toBe('shared_destiny');
    expect(store.getState().currentRoom?.status).toBe('lobby');
    expect(f.startFocus).not.toHaveBeenCalled();
  });
  it('starts once from the canonical active snapshot, using server timing and no persisted participant names', async () => {
    await createRoom();
    const active = room({ revision: 2, status: 'active', startedAt: '2026-11-01T11:59:00Z',
      participants: [...room().participants.map(p => ({ ...p, status: 'focusing' })),
        { ...room().participants[0], id: other, name: 'Private participant name', isHost: false, status: 'focusing' }] });
    f.rpc.mockResolvedValue({ data: active, error: null });
    expect(await store.getState().startRoomFocus()).toBe(true);
    await vi.advanceTimersByTimeAsync(8000);
    expect(f.startFocus).toHaveBeenCalledTimes(1);
    expect(f.game.activeSession.started_at).toBe('2026-11-01T11:59:00Z');
    expect(f.game.activeSession.expected_end_at).toBe('2026-11-01T12:24:00.000Z');
    expect(f.game.activeSession.campfire_room_code).toBe(active.code);
    expect(f.game.activeSession.campfire_room_id).toBe(roomId);
    expect(JSON.stringify(f.save.mock.calls)).not.toContain('Private participant name');
    expect(f.rpc).toHaveBeenCalledWith('campfire_command_v1', expect.objectContaining({
      p_room_id: roomId, p_expected_revision: 1, p_command: 'start',
    }));
  });
  it('polls canonical snapshots and discards older revisions', async () => {
    await createRoom();
    f.rpc.mockResolvedValueOnce({ data: room({ revision: 3, name: 'Latest' }), error: null });
    await vi.advanceTimersByTimeAsync(4000);
    expect(f.rpc).toHaveBeenCalledWith('campfire_read_v1', { p_room_id: roomId });
    f.rpc.mockResolvedValueOnce({ data: room({ revision: 2, name: 'Old' }), error: null });
    await vi.advanceTimersByTimeAsync(4000);
    expect(store.getState().currentRoom?.name).toBe('Latest');
  });
  it('discards late create responses after local ownership is cleared', async () => {
    let resolve!: (value: any) => void;
    f.rpc.mockImplementation(() => new Promise(r => { resolve = r; }));
    const pending = createRoom();
    await vi.advanceTimersByTimeAsync(0);
    store.getState().clearLocalRoom();
    resolve({ data: room(), error: null });
    expect(await pending).toBe(false);
    expect(store.getState().currentRoom).toBeNull();
  });
  it('discards a response when the signed-in account changed during the request', async () => {
    f.getSession.mockResolvedValue({ data: { session: { user: { id: other } } }, error: null });
    expect(await createRoom()).toBe(false);
    expect(store.getState().currentRoom).toBeNull();
  });
  it('clears private room state and stops polling when membership is denied', async () => {
    await createRoom();
    f.rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'membership_required' } });
    await vi.advanceTimersByTimeAsync(4000);
    expect(store.getState().currentRoom).toBeNull();
    const calls = f.rpc.mock.calls.length;
    await vi.advanceTimersByTimeAsync(12000);
    expect(f.rpc).toHaveBeenCalledTimes(calls);
  });
  it('leaves only after the server accepts and keeps the room on failure', async () => {
    await createRoom();
    f.rpc.mockResolvedValueOnce({ data: null, error: { message: 'Network unavailable' } });
    expect(await store.getState().leaveRoom()).toBe(false);
    expect(store.getState().currentRoom?.id).toBe(roomId);
    f.rpc.mockResolvedValueOnce({ data: { id: roomId, revision: 2, left: true }, error: null });
    expect(await store.getState().leaveRoom()).toBe(true);
    expect(store.getState().currentRoom).toBeNull();
  });
  it('reports and blocks verified member UUIDs through the server', async () => {
    await createRoom();
    f.rpc.mockResolvedValueOnce({ data: { id: roomId }, error: null });
    expect(await store.getState().reportParticipant(other, 'harassment')).toBe(true);
    expect(f.rpc).toHaveBeenCalledWith('campfire_report_v1', {
      p_room_id: roomId, p_target_user: other, p_reason: 'harassment',
    });
    f.rpc.mockResolvedValueOnce({ data: { blocked: true }, error: null });
    expect(await store.getState().blockParticipant(other)).toBe(true);
    expect(f.rpc).toHaveBeenCalledWith('campfire_block_v1', { p_target_user: other, p_blocked: true });
    expect(store.getState().currentRoom).toBeNull();
  });
  it('ends the matching local focus after successful leave without ending unrelated sessions', async () => {
    await createRoom();
    f.game.activeSession = { status: 'active', campfire_room_code: room().code };
    f.rpc.mockResolvedValueOnce({ data: { id: roomId, revision: 2, left: true }, error: null });
    expect(await store.getState().leaveRoom()).toBe(true);
    expect(f.abandonFocus).toHaveBeenCalledTimes(1);
    await createRoom();
    f.game.activeSession = { status: 'active', campfire_room_code: 'another-room' };
    f.rpc.mockResolvedValueOnce({ data: { id: roomId, revision: 2, left: true }, error: null });
    expect(await store.getState().leaveRoom()).toBe(true);
    expect(f.abandonFocus).toHaveBeenCalledTimes(1);
  });
  it('does not start a duplicate, expired, or no-longer-focusing membership session', async () => {
    const active = room({ status: 'active', startedAt: '2026-11-01T11:59:00Z',
      participants: room().participants.map(p => ({ ...p, status: 'focusing' })) });
    f.game.saveData.focus_sessions.push({ id: 'finished', campfire_room_code: active.code, status: 'completed', rewarded: true });
    f.rpc.mockResolvedValue({ data: active, error: null });
    expect(await createRoom()).toBe(true);
    expect(f.startFocus).not.toHaveBeenCalled();
    store.getState().clearLocalRoom(); f.game.saveData.focus_sessions = [];
    f.rpc.mockResolvedValue({ data: { ...active, startedAt: '2026-11-01T11:00:00Z' }, error: null });
    expect(await createRoom()).toBe(true);
    expect(f.startFocus).not.toHaveBeenCalled();
    store.getState().clearLocalRoom();
    f.rpc.mockResolvedValue({ data: { ...active, participants: room().participants.map(p => ({ ...p, status: 'abandoned' })) }, error: null });
    expect(await createRoom()).toBe(true);
    expect(f.startFocus).not.toHaveBeenCalled();
  });
  it('keeps failed network reads visibly stale and reconnects only to server data', async () => {
    await createRoom();
    f.rpc.mockResolvedValueOnce({ data: null, error: { message: 'Fetch failed', code: '' } });
    await vi.advanceTimersByTimeAsync(4000);
    expect(store.getState().currentRoom?.id).toBe(roomId);
    expect(store.getState().isRealtimeConnected).toBe(false);
    expect(store.getState().error).toBeTruthy();
    f.rpc.mockResolvedValueOnce({ data: room({ revision: 2, name: 'Reconnected' }), error: null });
    await vi.advanceTimersByTimeAsync(4000);
    expect(store.getState().currentRoom?.name).toBe('Reconnected');
    expect(store.getState().isRealtimeConnected).toBe(true);
  });
  it('fails closed when a poll returns an invalid canonical membership', async () => {
    await createRoom();
    f.rpc.mockResolvedValueOnce({ data: room({ participants: [] }), error: null });
    await vi.advanceTimersByTimeAsync(4000);
    expect(store.getState().currentRoom).toBeNull();
  });
  it('stops the matching group session after verified membership revocation', async () => {
    await createRoom();
    f.game.activeSession = { status: 'active', campfire_room_code: room().code };
    f.rpc.mockResolvedValueOnce({ data: null, error: { code: 'P0001', message: 'Membership required' } });
    await vi.advanceTimersByTimeAsync(4000);
    expect(store.getState().currentRoom).toBeNull();
    expect(f.abandonFocus).toHaveBeenCalledTimes(1);
  });
  it('queues game abandonment while a report is in flight instead of silently dropping it', async () => {
    await createRoom();
    let resolve!: (value: any) => void;
    f.rpc.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
    const reporting = store.getState().reportParticipant(other, 'harassment');
    await vi.advanceTimersByTimeAsync(0);
    const abandoning = store.getState().abandonRoom();
    resolve({ data: { id: roomId }, error: null });
    await reporting;
    expect(await abandoning).toBe(true);
    expect(f.rpc).toHaveBeenCalledWith('campfire_command_v1', expect.objectContaining({ p_command: 'abandon' }));
  });
  it('reuses a create intention request ID after a transport failure', async () => {
    f.rpc.mockResolvedValueOnce({ data: null, error: { code: '', message: 'Fetch failed' } });
    expect(await createRoom()).toBe(false);
    const requestId = f.rpc.mock.calls[0][1].p_request_id;
    expect(await createRoom()).toBe(true);
    expect(f.rpc.mock.calls[1][1].p_request_id).toBe(requestId);
  });
  it('retries offline game abandonment after a successful read without restarting gameplay', async () => {
    await createRoom();
    f.rpc.mockResolvedValueOnce({ data: null, error: { code: '', message: 'Fetch failed' } });
    expect(await store.getState().abandonRoom()).toBe(false);
    f.rpc.mockResolvedValueOnce({ data: room({ revision: 2 }), error: null });
    f.rpc.mockResolvedValueOnce({ data: room({ revision: 3, status: 'severed',
      participants: room().participants.map(p => ({ ...p, status: 'abandoned' })) }), error: null });
    await vi.advanceTimersByTimeAsync(4000);
    expect(f.rpc.mock.calls.filter(([fn, args]) => fn === 'campfire_command_v1' && args.p_command === 'abandon')).toHaveLength(2);
    expect(store.getState().currentRoom?.status).toBe('severed');
    expect(f.startFocus).not.toHaveBeenCalled();
  });
  it('does not claim a leave succeeded without a matching server acknowledgement', async () => {
    await createRoom();
    f.rpc.mockResolvedValueOnce({ data: {}, error: null });
    expect(await store.getState().leaveRoom()).toBe(false);
    expect(store.getState().currentRoom?.id).toBe(roomId);
    expect(f.abandonFocus).not.toHaveBeenCalled();
  });
  it('verifies social reward provenance only for a fresh canonical session of this owner', async () => {
    const active = room({ status: 'active', startedAt: '2026-11-01T11:59:00Z',
      participants: room().participants.map(p => ({ ...p, status: 'focusing' })) });
    f.rpc.mockResolvedValue({ data: active, error: null });
    await createRoom();
    const session = f.game.activeSession;
    expect(store.getState().hasVerifiedSession(session)).toBe(true);
    expect(store.getState().hasVerifiedSession({ ...session, campfire_room_code: 'forged' })).toBe(false);
    expect(store.getState().hasVerifiedSession({ ...session, expected_end_at: '2026-11-01T12:01:00Z' })).toBe(false);
    f.game.saveData.storage_owner = other;
    expect(store.getState().hasVerifiedSession(session)).toBe(false);
    f.game.saveData.storage_owner = owner;
    vi.setSystemTime(new Date('2026-11-01T12:00:11Z'));
    expect(store.getState().hasVerifiedSession(session)).toBe(false);
    await vi.advanceTimersByTimeAsync(4000);
    expect(store.getState().hasVerifiedSession(session)).toBe(true);
    f.rpc.mockResolvedValue({ data: null, error: { message: 'Fetch failed', code: '' } });
    await vi.advanceTimersByTimeAsync(4000);
    expect(store.getState().hasVerifiedSession(session)).toBe(false);
    store.getState().clearLocalRoom();
    expect(store.getState().hasVerifiedSession(session)).toBe(false);
  });
  it('recovers a durable active room without duplicating or rewriting the focus session', async () => {
    const active = room({ status: 'active', startedAt: '2026-11-01T11:59:00Z',
      participants: room().participants.map(p => ({ ...p, status: 'focusing' })) });
    f.rpc.mockResolvedValue({ data: active, error: null });
    await createRoom();
    const session = f.game.activeSession;
    store.getState().clearLocalRoom();
    expect(store.getState().hasVerifiedSession(session)).toBe(false);
    expect(await store.getState().recoverActiveRoom()).toBe(true);
    expect(f.rpc).toHaveBeenLastCalledWith('campfire_read_v1', { p_room_id: roomId });
    expect(store.getState().hasVerifiedSession(session)).toBe(true);
    expect(f.game.activeSession).toBe(session);
    expect(f.startFocus).toHaveBeenCalledTimes(1);
    expect(f.game.saveData.focus_sessions).toHaveLength(1);
    expect(f.save).toHaveBeenCalledTimes(1);
    store.getState().clearLocalRoom();
    session.expected_end_at = '2026-11-01T12:29:00Z'; session.is_paused = true;
    expect(await store.getState().recoverActiveRoom()).toBe(true);
    expect(f.game.activeSession.expected_end_at).toBe('2026-11-01T12:29:00Z');
    expect(store.getState().hasVerifiedSession(session)).toBe(false);
  });
  it('retains the base session without social proof when recovery is denied', async () => {
    f.game.activeSession = { id: 'base-session', status: 'active', campfire_room_code: room().code, campfire_room_id: roomId };
    const session = f.game.activeSession;
    f.rpc.mockResolvedValueOnce({ data: null, error: { code: 'P0001', message: 'Membership required' } });
    expect(await store.getState().recoverActiveRoom()).toBe(false);
    expect(f.game.activeSession).toBe(session);
    expect(f.abandonFocus).not.toHaveBeenCalled();
    expect(store.getState().currentRoom).toBeNull();
    expect(store.getState().hasVerifiedSession(session)).toBe(false);
    expect(store.getState().isRealtimeConnected).toBe(false);
  });
  it('does not recover another save owner room or send its ID to the server', async () => {
    f.game.activeSession = { id: 'base-session', status: 'active', campfire_room_code: room().code, campfire_room_id: roomId };
    f.getUser.mockResolvedValue({ data: { user: { id: other, is_anonymous: false } }, error: null });
    expect(await store.getState().recoverActiveRoom()).toBe(false);
    expect(f.rpc).not.toHaveBeenCalled();
  });
  it('preserves verified bonus after a legitimate pause and resume', async () => {
    f.rpc.mockResolvedValue({ data: room({ status: 'active', startedAt: '2026-11-01T11:59:00Z',
      participants: room().participants.map(p => ({ ...p, status: 'focusing' })) }), error: null });
    await createRoom();
    const session = f.game.activeSession;
    session.total_paused_ms = 300000;
    session.expected_end_at = '2026-11-01T12:29:00Z';
    session.is_paused = false;
    expect(store.getState().hasVerifiedSession(session)).toBe(true);
    session.total_paused_ms = -1;
    expect(store.getState().hasVerifiedSession(session)).toBe(false);
    session.total_paused_ms = Infinity;
    expect(store.getState().hasVerifiedSession(session)).toBe(false);
  });
  it.each(['completed', 'abandoned'])('reconciles a durable %s session after offline force-close without creating another session', async status => {
    const session = { id: 'durable-ended', status, campfire_room_id: roomId, campfire_room_code: room().code,
      started_at: '2026-11-01T11:30:00Z', expected_end_at: '2026-11-01T11:55:00Z', rewarded: status === 'completed' };
    f.game.saveData.focus_sessions = [session];
    f.rpc.mockResolvedValueOnce({ data: room({ status: 'active', startedAt: session.started_at,
      participants: room().participants.map(p => ({ ...p, status: 'focusing' })) }), error: null });
    f.rpc.mockResolvedValueOnce({ data: room({ revision: 2, status: status === 'completed' ? 'completed' : 'severed',
      startedAt: session.started_at, participants: room().participants.map(p => ({ ...p, status })) }), error: null });
    expect(await store.getState().recoverActiveRoom()).toBe(true);
    expect(f.rpc).toHaveBeenCalledWith('campfire_command_v1', expect.objectContaining({ p_command: status === 'completed' ? 'complete' : 'abandon' }));
    expect(f.game.saveData.focus_sessions).toEqual([session]);
    expect(f.startFocus).not.toHaveBeenCalled(); expect(f.save).not.toHaveBeenCalled();
  });
  it('does not replay completed server membership or old group history while another focus is active', async () => {
    const session = { id: 'durable-ended', status: 'completed', campfire_room_id: roomId, campfire_room_code: room().code,
      started_at: '2026-11-01T11:30:00Z', expected_end_at: '2026-11-01T11:55:00Z' };
    f.game.saveData.focus_sessions = [session];
    f.rpc.mockResolvedValueOnce({ data: room({ status: 'completed', startedAt: session.started_at,
      participants: room().participants.map(p => ({ ...p, status: 'completed' })) }), error: null });
    expect(await store.getState().recoverActiveRoom()).toBe(true);
    expect(f.rpc).toHaveBeenCalledTimes(1);
    store.getState().clearLocalRoom(); f.rpc.mockClear();
    f.game.activeSession = { id: 'unrelated', status: 'active' };
    expect(await store.getState().recoverActiveRoom()).toBe(false);
    expect(f.rpc).not.toHaveBeenCalled();
    f.game.activeSession = null; session.started_at = '2026-10-31T12:00:00Z';
    localStorage.removeItem(`rimba_campfire_room_id:${owner}`);
    expect(await store.getState().recoverActiveRoom()).toBe(false);
    expect(f.rpc).not.toHaveBeenCalled();
  });
  it('recovers its own lobby pointer after local clearing without persisting participant names', async () => {
    await createRoom();
    expect(localStorage.getItem(`rimba_campfire_room_id:${owner}`)).toBe(roomId);
    expect(localStorage.getItem('rimba_campfire_room')).toBeNull();
    store.getState().clearLocalRoom();
    expect(await store.getState().recoverActiveRoom()).toBe(true);
    expect(store.getState().currentRoom?.status).toBe('lobby');
    expect(f.startFocus).not.toHaveBeenCalled();
    f.rpc.mockResolvedValueOnce({ data: { id: roomId, left: true, revision: 2 }, error: null });
    expect(await store.getState().leaveRoom()).toBe(true);
    expect(localStorage.getItem(`rimba_campfire_room_id:${owner}`)).toBeNull();
  });
  it('does not read a previous account lobby pointer for a new save owner', async () => {
    localStorage.setItem(`rimba_campfire_room_id:${other}`, roomId);
    expect(await store.getState().recoverActiveRoom()).toBe(false);
    expect(f.rpc).not.toHaveBeenCalled();
    localStorage.setItem(`rimba_campfire_room_id:${owner}`, roomId);
    f.rpc.mockResolvedValueOnce({ data: null, error: { code: 'P0001', message: 'Membership required' } });
    expect(await store.getState().recoverActiveRoom()).toBe(false);
    expect(localStorage.getItem(`rimba_campfire_room_id:${owner}`)).toBeNull();
    expect(localStorage.getItem(`rimba_campfire_room_id:${other}`)).toBe(roomId);
  });
});
