import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import { useGameStore } from '@/lib/game/useGameStore';
import { saveSaveData } from '@/lib/game/storage';
import { scheduleDebouncedCloudSync } from '@/lib/supabase/cloudSync';
import type { FocusSession } from '@/types/game';

export type CampfireAnimal = 'fox' | 'bunny' | 'koala' | 'bird' | 'bee';
export type CampfireMode = 'shared_destiny' | 'gentle_circle';
export interface CampfireParticipant {
  id: string; name: string; animal: CampfireAnimal; species: string; isHost: boolean;
  status: 'ready' | 'focusing' | 'completed' | 'abandoned'; joinedAt: string;
}
export interface CampfireRoom {
  id: string; code: string; revision: number; name: string; durationMinutes: number;
  mode: CampfireMode; status: 'lobby' | 'active' | 'completed' | 'severed';
  startedAt: string | null; severedBy?: string | null;
  participants: CampfireParticipant[]; myParticipantId: string;
}
interface CampfireState {
  currentRoom: CampfireRoom | null; myParticipantId: string | null;
  isRealtimeConnected: boolean; isLoading: boolean; error: string | null;
  createRoom: (hostName: string, minutes: number, animal: CampfireAnimal, species: string,
    mode?: CampfireMode, name?: string) => Promise<boolean>;
  joinRoom: (invite: string, name: string, animal: CampfireAnimal, species: string) => Promise<boolean>;
  setRoomMode: (mode: CampfireMode) => Promise<boolean>;
  startRoomFocus: () => Promise<boolean>;
  abandonRoom: (unusedName?: string) => Promise<boolean>;
  completeRoom: () => Promise<boolean>;
  leaveRoom: () => Promise<boolean>;
  reportParticipant: (targetId: string, reason: string) => Promise<boolean>;
  blockParticipant: (targetId: string) => Promise<boolean>;
  clearLocalRoom: () => void;
  hasVerifiedSession: (session: FocusSession) => boolean;
  recoverActiveRoom: () => Promise<boolean>;
}

// Room snapshots and participant names are memory-only. Never restore unverified presence.
let generation = 0;
let ownerId: string | null = null;
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let startedRoomId: string | null = null;
let verifiedSessionId: string | null = null;
let lastVerifiedAt: number | null = null;
const SIGN_IN = 'Masuk ke akun terverifikasi untuk menggunakan Campfire.';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function removeLegacyRoom() {
  try { if (typeof localStorage !== 'undefined') localStorage.removeItem('rimba_campfire_room'); } catch {}
}
removeLegacyRoom();

function savedRoomId(userId: string): string | null {
  try {
    const id = localStorage.getItem(`rimba_campfire_room_id:${userId}`);
    return id && uuid.test(id) ? id : null;
  } catch { return null; }
}
function rememberRoom(userId: string, id: string | null) {
  try {
    if (id) localStorage.setItem(`rimba_campfire_room_id:${userId}`, id);
    else localStorage.removeItem(`rimba_campfire_room_id:${userId}`);
  } catch {}
}

// Never expose raw database errors or another participant's private data in a toast.
function message(error: unknown): string {
  const detail = String((error as { message?: string })?.message ?? '');
  if (detail === SIGN_IN) return SIGN_IN;
  if (/Authentication required/i.test(detail)) return SIGN_IN;
  if (/suspended/i.test(detail)) return 'Akses Campfire dibatasi. Hubungi dukungan melalui profil.';
  if (/content|display.name/i.test(detail)) return 'Nama ruang atau profil tidak sesuai. Ubah nama profil, lalu coba lagi.';
  if (/host.required|host only/i.test(detail)) return 'Hanya host yang dapat memulai atau mengubah mode.';
  if (/revision|conflict/i.test(detail)) return 'Ruang berubah. Tunggu pembaruan, lalu coba lagi.';
  if (/full|limit|rate/i.test(detail)) return 'Batas ruang atau permintaan tercapai. Coba lagi nanti.';
  if (/blocked|membership|not.found|invite/i.test(detail)) return 'Ruang tidak tersedia atau akses tidak diizinkan.';
  return 'Campfire belum dapat terhubung. Periksa koneksi dan coba lagi.';
}

export const useCampfireStore = create<CampfireState>((set, get) => {
  let pendingRequest: Promise<void> | null = null;
  let retryRequest: { key: string; id: string } | null = null;
  let pendingGameAction: 'abandon' | 'complete' | null = null;
  function clearLocalRoom() {
    generation++;
    if (pollTimer) clearTimeout(pollTimer);
    pollTimer = null; ownerId = null; startedRoomId = null;
    lastVerifiedAt = null;
    verifiedSessionId = null;
    retryRequest = null; pendingGameAction = null;
    removeLegacyRoom();
    set({ currentRoom: null, myParticipantId: null, isRealtimeConnected: false,
      isLoading: false, error: null });
  }
  function leaveConfirmedRoom() {
    const previousRoom = get().currentRoom;
    if (ownerId) rememberRoom(ownerId, null);
    clearLocalRoom();
    const game = useGameStore.getState();
    if (previousRoom && game.activeSession?.status === 'active'
      && game.activeSession.campfire_room_code === previousRoom.code) game.abandonFocus();
  }
  async function verifiedOwner() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user || data.user.is_anonymous) throw new Error(SIGN_IN);
    return data.user.id;
  }
  async function stillCurrent(ticket: number, userId: string) {
    const { data, error } = await supabase.auth.getSession();
    if (ticket !== generation) return false;
    if (error || data.session?.user.id !== userId) {
      clearLocalRoom(); return false;
    }
    return true;
  }
  function startCanonicalFocus(room: CampfireRoom, userId: string) {
    const mine = room.participants.find(p => p.id === userId);
    if (startedRoomId === room.id || pendingGameAction) return;
    const game = useGameStore.getState();
    // A durable session, including completed/abandoned, prevents duplicate rewards on reconnect.
    const existing = game.saveData.focus_sessions.find(s => s.campfire_room_id === room.id || s.campfire_room_code === room.code);
    if (existing) {
      startedRoomId = room.id; verifiedSessionId = existing.id; return;
    }
    if (room.status !== 'active' || mine?.status !== 'focusing' || !room.startedAt) return;
    if (game.activeSession?.status === 'active') return;
    const startedMs = Date.parse(room.startedAt);
    const endsMs = startedMs + room.durationMinutes * 60000;
    // Expired snapshots must never manufacture a new finished session/reward.
    if (!Number.isFinite(startedMs) || startedMs > Date.now() + 30000 || endsMs <= Date.now()) return;
    game.startFocus(room.durationMinutes * 60, 'Fokus', false, 'oak', 'Campfire');
    const state = useGameStore.getState();
    if (!state.activeSession || state.activeSession.status !== 'active') return;
    const activeSession = { ...state.activeSession, started_at: room.startedAt,
      expected_end_at: new Date(endsMs).toISOString(), duration_minutes: room.durationMinutes,
      campfire_room_code: room.code, campfire_room_id: room.id, is_shared_destiny: room.mode === 'shared_destiny',
      // Preserve companion count for game rules without persisting other users' names.
      companions: room.participants.filter(p => p.id !== userId).map(() => 'Kawan') };
    const saveData = { ...state.saveData, focus_sessions: state.saveData.focus_sessions.map(
      session => session.id === activeSession.id ? activeSession : session) };
    saveSaveData(saveData, userId);
    useGameStore.setState({ activeSession, saveData });
    startedRoomId = room.id;
    verifiedSessionId = activeSession.id;
    scheduleDebouncedCloudSync();
  }
  function acceptSnapshot(value: unknown, userId: string) {
    const room = value as CampfireRoom;
    if (!room || !uuid.test(room.id) || !/^[a-f0-9]{32}$/i.test(room.code)
      || !Number.isInteger(room.revision) || room.revision < 1
      || room.myParticipantId !== userId || !Array.isArray(room.participants)
      || !room.participants.some(p => p.id === userId)
      || !Number.isInteger(room.durationMinutes) || room.durationMinutes < 5 || room.durationMinutes > 180
      || !['lobby', 'active', 'completed', 'severed'].includes(room.status)
      || !['shared_destiny', 'gentle_circle'].includes(room.mode)) {
      throw new Error('membership_required');
    }
    const current = get().currentRoom;
    if (current?.id === room.id && current.revision > room.revision) return;
    ownerId = userId;
    rememberRoom(userId, room.id);
    lastVerifiedAt = Date.now();
    set({ currentRoom: room, myParticipantId: userId, isRealtimeConnected: true, error: null });
    startCanonicalFocus(room, userId);
  }
  function schedulePoll() {
    if (pollTimer) clearTimeout(pollTimer);
    if (!get().currentRoom) return;
    pollTimer = setTimeout(() => { void poll(); }, 4000);
  }
  async function poll() {
    const room = get().currentRoom;
    const userId = ownerId;
    const ticket = generation;
    if (!room || !userId) return;
    try {
      if (!await stillCurrent(ticket, userId)) return;
      const { data, error } = await supabase.rpc('campfire_read_v1', { p_room_id: room.id });
      if (!await stillCurrent(ticket, userId)) return;
      if (error) {
        // Access denial is terminal. Transport failure keeps a visibly stale snapshot.
        if (error.code && !['PGRST000', 'PGRST001', 'PGRST002'].includes(error.code)) {
          leaveConfirmedRoom(); set({ error: message(error) }); return;
        }
        throw error;
      }
      try { acceptSnapshot(data, userId); }
      catch (error) {
        // A successful HTTP response still cannot authorize malformed membership.
        if ((error as Error)?.message === 'membership_required') {
          leaveConfirmedRoom(); set({ error: message(error) }); return;
        }
        throw error;
      }
      if (pendingGameAction) {
        const canonical = get().currentRoom;
        const mine = canonical?.participants.find(p => p.id === userId);
        if (canonical?.status === 'severed' || canonical?.status === 'completed'
          || mine?.status === 'completed' || mine?.status === 'abandoned') pendingGameAction = null;
        else await gameCommand(pendingGameAction);
      }
    } catch (error) {
      if (ticket === generation) set({ error: message(error), isRealtimeConnected: false });
    } finally { if (ticket === generation) schedulePoll(); }
  }
  async function request(fn: string, args: Record<string, unknown>, effect: 'snapshot' | 'leave' | 'report' | 'block' = 'snapshot', expectedOwner?: string) {
    if (get().isLoading) return false;
    const ticket = generation;
    let settle!: () => void;
    const completion = new Promise<void>(resolve => { settle = resolve; });
    pendingRequest = completion;
    set({ isLoading: true, error: null });
    try {
      const userId = await verifiedOwner();
      if (ticket !== generation) return false;
      if (expectedOwner && expectedOwner !== userId) throw new Error(SIGN_IN);
      if (ownerId && ownerId !== userId) { clearLocalRoom(); return false; }
      const isMutation = fn === 'campfire_create_v1' || fn === 'campfire_command_v1';
      const key = JSON.stringify([userId, fn, args]);
      if (isMutation && retryRequest?.key !== key) retryRequest = { key, id: crypto.randomUUID() };
      const sentArgs = isMutation ? { ...args, p_request_id: retryRequest!.id } : args;
      const { data, error } = await supabase.rpc(fn, sentArgs);
      if (!await stillCurrent(ticket, userId)) return false;
      if (error) {
        if (isMutation && error.code && !['PGRST000', 'PGRST001', 'PGRST002'].includes(error.code)) retryRequest = null;
        if (fn === 'campfire_read_v1' && error.code && !['PGRST000', 'PGRST001', 'PGRST002'].includes(error.code)) {
          // Recovery denial removes social proof, while the existing base session remains intact.
          rememberRoom(userId, null); clearLocalRoom(); set({ error: message(error) }); return false;
        }
        throw error;
      }
      if (isMutation) retryRequest = null;
      if (effect === 'leave' || effect === 'block') {
        if (!data || (effect === 'block' && data.blocked !== true)) throw new Error('Invalid response');
        if (effect === 'leave' && (data.left !== true || data.id !== get().currentRoom?.id)) throw new Error('Invalid response');
        leaveConfirmedRoom();
      } else if (effect === 'report') {
        if (!data || !uuid.test(data.id)) throw new Error('Invalid response');
      } else {
        acceptSnapshot(data, userId); schedulePoll();
      }
      return true;
    } catch (error) {
      if (ticket === generation) set({ error: message(error) });
      return false;
    } finally {
      if (ticket === generation) set({ isLoading: false });
      if (pendingRequest === completion) pendingRequest = null;
      settle();
    }
  }
  function command(action: string, mode?: CampfireMode) {
    const room = get().currentRoom;
    if (!room) return Promise.resolve(false);
    return request('campfire_command_v1', { p_room_id: room.id,
      p_expected_revision: room.revision,
      p_command: action, ...(mode ? { p_mode: mode } : {}) }, action === 'leave' ? 'leave' : 'snapshot');
  }
  async function gameCommand(action: 'abandon' | 'complete') {
    if (!get().currentRoom) return false;
    const ticket = generation;
    pendingGameAction = action;
    // Timer/abandon callbacks may race a safety action; never silently drop them as "busy".
    await pendingRequest;
    if (ticket !== generation) return false;
    const success = await command(action);
    if (success) pendingGameAction = null;
    return success;
  }
  return {
    currentRoom: null, myParticipantId: null, isRealtimeConnected: false, isLoading: false, error: null,
    clearLocalRoom,
    hasVerifiedSession: session => {
      const state = get();
      const room = state.currentRoom;
      const mine = room?.participants.find(p => p.id === ownerId);
      const age = lastVerifiedAt === null ? Infinity : Date.now() - lastVerifiedAt;
      if (!room || !room.startedAt || !ownerId || room.myParticipantId !== ownerId
        || useGameStore.getState().saveData.storage_owner !== ownerId
        || !state.isRealtimeConnected || age < 0 || age > 10000 || startedRoomId !== room.id
        || !['active', 'completed'].includes(room.status)
        || !mine || !['focusing', 'completed'].includes(mine.status)) return false;
      const startedMs = Date.parse(room.startedAt);
      const pausedMs = session.total_paused_ms ?? 0;
      return Number.isFinite(startedMs)
        && Number.isFinite(pausedMs) && pausedMs >= 0
        && session.campfire_room_code === room.code
        && session.id === verifiedSessionId
        && session.started_at === room.startedAt
        && Date.parse(session.expected_end_at) === startedMs + room.durationMinutes * 60000 + pausedMs;
    },
    recoverActiveRoom: async () => {
      const game = useGameStore.getState();
      if (game.activeSession && !game.activeSession.campfire_room_id) return false;
      const saveOwner = game.saveData.storage_owner;
      const pointer = saveOwner ? savedRoomId(saveOwner) : null;
      // Local ended history doubles as a durable lifecycle intention after an offline force-close.
      // Never replay old group history while an unrelated local focus is running.
      const session = game.activeSession ?? game.saveData.focus_sessions.slice().reverse().find(item => {
        const age = Date.now() - Date.parse(item.started_at);
        return item.campfire_room_id && ['completed', 'abandoned'].includes(item.status)
          && Number.isFinite(age) && age >= 0 && age < 6 * 3600000
          && (!pointer || item.campfire_room_id === pointer);
      });
      const roomId = game.activeSession?.campfire_room_id ?? pointer ?? session?.campfire_room_id;
      if (!roomId || !uuid.test(roomId) || !saveOwner) return false;
      const ticket = generation;
      const recovered = await request('campfire_read_v1', { p_room_id: roomId }, 'snapshot', saveOwner);
      if (!recovered || ticket !== generation) return false;
      const room = get().currentRoom;
      const mine = room?.participants.find(p => p.id === ownerId);
      if (session && session.status !== 'active' && room?.status === 'active' && mine?.status === 'focusing'
        && room.code === session.campfire_room_code && room.startedAt === session.started_at) {
        return gameCommand(session.status === 'completed' ? 'complete' : 'abandon');
      }
      return true;
    },
    createRoom: (name, minutes, animal, _species, mode = 'shared_destiny', roomName = 'Bilik Api Unggun Suaka') =>
      request('campfire_create_v1', { p_name: roomName,
        p_display_name: name, p_duration_minutes: minutes, p_mode: mode, p_animal: animal }),
    joinRoom: (invite, name, animal) => request('campfire_join_v1', {
      p_invite: invite.trim().toLowerCase(), p_display_name: name, p_animal: animal }),
    setRoomMode: mode => command('mode', mode), startRoomFocus: () => command('start'),
    abandonRoom: () => gameCommand('abandon'), completeRoom: () => gameCommand('complete'),
    leaveRoom: () => command('leave'),
    reportParticipant: (target, reason) => {
      const room = get().currentRoom;
      if (!room) return Promise.resolve(false);
      return request('campfire_report_v1', { p_room_id: room.id, p_target_user: target, p_reason: reason }, 'report');
    },
    blockParticipant: target => request('campfire_block_v1', { p_target_user: target, p_blocked: true }, 'block'),
  };
});
