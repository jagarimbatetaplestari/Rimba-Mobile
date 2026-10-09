import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { soundManager } from "@/lib/audio/sounds";
import { hapticSuccess, hapticWarning } from "@/lib/mobile/nativeBridge";

export type CampfireAnimal = "fox" | "bunny" | "koala" | "bird" | "bee";
export type CampfireMode = "shared_destiny" | "gentle_circle";

export interface CampfireParticipant {
  id: string;
  name: string;
  animal: CampfireAnimal;
  species: string;
  isHost: boolean;
  status: "ready" | "focusing" | "completed" | "abandoned";
  joinedAt: string;
}

export interface CampfireRoom {
  code: string;
  name: string;
  durationMinutes: number;
  mode: CampfireMode;
  status: "lobby" | "active" | "completed" | "severed";
  startedAt: string | null;
  severedBy?: string;
  participants: CampfireParticipant[];
}

interface CampfireState {
  currentRoom: CampfireRoom | null;
  myParticipantId: string | null;
  isRealtimeConnected: boolean;
  createRoom: (
    hostName: string,
    durationMinutes: number,
    animal: CampfireAnimal,
    species: string,
    mode?: CampfireMode,
    roomName?: string
  ) => CampfireRoom;
  joinRoom: (
    code: string,
    playerName: string,
    animal: CampfireAnimal,
    species: string
  ) => boolean;
  setRoomMode: (mode: CampfireMode) => void;
  startRoomFocus: () => void;
  abandonRoom: (abandonedByName?: string) => void;
  completeRoom: () => void;
  leaveRoom: () => void;
}

let activeChannel: RealtimeChannel | null = null;

function cleanupChannel() {
  if (activeChannel) {
    try {
      supabase.removeChannel(activeChannel);
    } catch (e) {
      console.warn("Failed to remove channel:", e);
    }
    activeChannel = null;
  }
}

function generateRoomCode(): string {
  const num = Math.floor(100 + Math.random() * 900);
  return `RIMBA-${num}`;
}

export const useCampfireStore = create<CampfireState>()(
  persist(
    (set, get) => ({
      currentRoom: null,
      myParticipantId: null,
      isRealtimeConnected: false,

      createRoom: (
        hostName,
        durationMinutes,
        animal,
        species,
        mode = "shared_destiny",
        roomName = "Bilik Api Unggun Suaka"
      ) => {
        cleanupChannel();

        const code = generateRoomCode();
        const hostId = `p_host_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const host: CampfireParticipant = {
          id: hostId,
          name: hostName || "Penjaga Suaka",
          animal,
          species,
          isHost: true,
          status: "ready",
          joinedAt: new Date().toISOString(),
        };

        const newRoom: CampfireRoom = {
          code,
          name: roomName,
          durationMinutes,
          mode,
          status: "lobby",
          startedAt: null,
          participants: [host],
        };

        set({
          currentRoom: newRoom,
          myParticipantId: hostId,
          isRealtimeConnected: false,
        });

        // Initialize Supabase Realtime channel
        try {
          const channel = supabase.channel(`campfire_${code}`, {
            config: {
              broadcast: { self: false },
              presence: { key: hostId },
            },
          });

          channel
            .on("presence", { event: "sync" }, () => {
              const state = channel.presenceState();
              const remoteParticipants: CampfireParticipant[] = [];

              Object.values(state).forEach((presences) => {
                presences.forEach((p: any) => {
                  if (p && p.id) {
                    remoteParticipants.push(p as CampfireParticipant);
                  }
                });
              });

              if (remoteParticipants.length > 0) {
                const current = get().currentRoom;
                if (!current) return;
                // Merge presence with local mock companion preserved if alone
                const mergedMap = new Map<string, CampfireParticipant>();
                current.participants.forEach((p) => mergedMap.set(p.id, p));
                remoteParticipants.forEach((p) => mergedMap.set(p.id, p));

                set({
                  currentRoom: {
                    ...current,
                    participants: Array.from(mergedMap.values()),
                  },
                });
              }
            })
            .on("broadcast", { event: "START_FOCUS" }, ({ payload }) => {
              soundManager.playPop();
              hapticSuccess();
              const current = get().currentRoom;
              if (!current) return;
              set({
                currentRoom: {
                  ...current,
                  status: "active",
                  startedAt: payload.startedAt || new Date().toISOString(),
                  mode: payload.mode || current.mode,
                  durationMinutes: payload.durationMinutes || current.durationMinutes,
                  participants: current.participants.map((p) => ({
                    ...p,
                    status: "focusing",
                  })),
                },
              });
            })
            .on("broadcast", { event: "ROOM_SEVERED" }, ({ payload }) => {
              hapticWarning();
              const current = get().currentRoom;
              if (!current) return;
              set({
                currentRoom: {
                  ...current,
                  status: "severed",
                  severedBy: payload.abandonedBy || "Seorang Kawan",
                  participants: current.participants.map((p) => ({
                    ...p,
                    status: "abandoned",
                  })),
                },
              });
            })
            .on("broadcast", { event: "MEMBER_ABANDONED" }, ({ payload }) => {
              const current = get().currentRoom;
              if (!current) return;
              set({
                currentRoom: {
                  ...current,
                  participants: current.participants.map((p) =>
                    p.id === payload.memberId ? { ...p, status: "abandoned" } : p
                  ),
                },
              });
            })
            .on("broadcast", { event: "ROOM_COMPLETED" }, () => {
              soundManager.playComplete();
              const current = get().currentRoom;
              if (!current) return;
              set({
                currentRoom: {
                  ...current,
                  status: "completed",
                  participants: current.participants.map((p) => ({
                    ...p,
                    status: "completed",
                  })),
                },
              });
            })
            .subscribe((status) => {
              if (status === "SUBSCRIBED") {
                channel.track(host);
                set({ isRealtimeConnected: true });
              }
            });

          activeChannel = channel;
        } catch (err) {
          console.warn("Supabase Realtime not available, falling back to local simulation:", err);
        }

        return newRoom;
      },

      joinRoom: (code, playerName, animal, species) => {
        cleanupChannel();

        const normalized = code.trim().toUpperCase();
        if (!normalized) return false;

        const participantId = `p_join_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const selfParticipant: CampfireParticipant = {
          id: participantId,
          name: playerName || "Penjaga Suaka",
          animal,
          species,
          isHost: false,
          status: "ready",
          joinedAt: new Date().toISOString(),
        };

        const room: CampfireRoom = {
          code: normalized,
          name: `Bilik Hening ${normalized}`,
          durationMinutes: 25,
          mode: "shared_destiny",
          status: "lobby",
          startedAt: null,
          participants: [selfParticipant],
        };

        set({
          currentRoom: room,
          myParticipantId: participantId,
          isRealtimeConnected: false,
        });

        // Initialize Supabase Realtime channel subscription
        try {
          const channel = supabase.channel(`campfire_${normalized}`, {
            config: {
              broadcast: { self: false },
              presence: { key: participantId },
            },
          });

          channel
            .on("presence", { event: "sync" }, () => {
              const state = channel.presenceState();
              const remoteParticipants: CampfireParticipant[] = [];

              Object.values(state).forEach((presences) => {
                presences.forEach((p: any) => {
                  if (p && p.id) {
                    remoteParticipants.push(p as CampfireParticipant);
                  }
                });
              });

              if (remoteParticipants.length > 0) {
                const current = get().currentRoom;
                if (!current) return;
                const mergedMap = new Map<string, CampfireParticipant>();
                current.participants.forEach((p) => mergedMap.set(p.id, p));
                remoteParticipants.forEach((p) => mergedMap.set(p.id, p));

                set({
                  currentRoom: {
                    ...current,
                    participants: Array.from(mergedMap.values()),
                  },
                });
              }
            })
            .on("broadcast", { event: "START_FOCUS" }, ({ payload }) => {
              soundManager.playPop();
              hapticSuccess();
              const current = get().currentRoom;
              if (!current) return;
              set({
                currentRoom: {
                  ...current,
                  status: "active",
                  startedAt: payload.startedAt || new Date().toISOString(),
                  mode: payload.mode || current.mode,
                  durationMinutes: payload.durationMinutes || current.durationMinutes,
                  participants: current.participants.map((p) => ({
                    ...p,
                    status: "focusing",
                  })),
                },
              });
            })
            .on("broadcast", { event: "ROOM_SEVERED" }, ({ payload }) => {
              hapticWarning();
              const current = get().currentRoom;
              if (!current) return;
              set({
                currentRoom: {
                  ...current,
                  status: "severed",
                  severedBy: payload.abandonedBy || "Seorang Kawan",
                  participants: current.participants.map((p) => ({
                    ...p,
                    status: "abandoned",
                  })),
                },
              });
            })
            .on("broadcast", { event: "MEMBER_ABANDONED" }, ({ payload }) => {
              const current = get().currentRoom;
              if (!current) return;
              set({
                currentRoom: {
                  ...current,
                  participants: current.participants.map((p) =>
                    p.id === payload.memberId ? { ...p, status: "abandoned" } : p
                  ),
                },
              });
            })
            .on("broadcast", { event: "ROOM_COMPLETED" }, () => {
              soundManager.playComplete();
              const current = get().currentRoom;
              if (!current) return;
              set({
                currentRoom: {
                  ...current,
                  status: "completed",
                  participants: current.participants.map((p) => ({
                    ...p,
                    status: "completed",
                  })),
                },
              });
            })
            .subscribe((status) => {
              if (status === "SUBSCRIBED") {
                channel.track(selfParticipant);
                set({ isRealtimeConnected: true });
              }
            });

          activeChannel = channel;
        } catch (err) {
          console.warn("Supabase Realtime not available, falling back to local simulation:", err);
        }

        return true;
      },

      setRoomMode: (mode) => {
        const current = get().currentRoom;
        if (!current) return;
        set({
          currentRoom: {
            ...current,
            mode,
          },
        });
      },

      startRoomFocus: () => {
        const current = get().currentRoom;
        if (!current) return;

        const startedAt = new Date().toISOString();

        if (activeChannel) {
          try {
            activeChannel.send({
              type: "broadcast",
              event: "START_FOCUS",
              payload: {
                startedAt,
                durationMinutes: current.durationMinutes,
                mode: current.mode,
              },
            });
          } catch {}
        }

        const updatedParticipants = current.participants.map((p) => ({
          ...p,
          status: "focusing" as const,
        }));

        set({
          currentRoom: {
            ...current,
            status: "active",
            startedAt,
            participants: updatedParticipants,
          },
        });
      },

      abandonRoom: (abandonedByName) => {
        const current = get().currentRoom;
        if (!current) return;

        const myId = get().myParticipantId;
        const myName = abandonedByName || "Penjaga Suaka";

        if (current.mode === "shared_destiny") {
          if (activeChannel) {
            try {
              activeChannel.send({
                type: "broadcast",
                event: "ROOM_SEVERED",
                payload: {
                  abandonedBy: myName,
                  reason: "Kawan meninggalkan lingkaran fokus bersama.",
                },
              });
            } catch {}
          }

          set({
            currentRoom: {
              ...current,
              status: "severed",
              severedBy: myName,
              participants: current.participants.map((p) => ({
                ...p,
                status: "abandoned",
              })),
            },
          });
        } else {
          // gentle_circle: only mark this member as abandoned
          if (activeChannel) {
            try {
              activeChannel.send({
                type: "broadcast",
                event: "MEMBER_ABANDONED",
                payload: {
                  memberId: myId,
                  memberName: myName,
                },
              });
            } catch {}
          }

          set({
            currentRoom: {
              ...current,
              participants: current.participants.map((p) =>
                p.id === myId ? { ...p, status: "abandoned" } : p
              ),
            },
          });
        }
      },

      completeRoom: () => {
        const current = get().currentRoom;
        if (!current) return;

        if (activeChannel) {
          try {
            activeChannel.send({
              type: "broadcast",
              event: "ROOM_COMPLETED",
              payload: {},
            });
          } catch {}
        }

        const updatedParticipants = current.participants.map((p) => ({
          ...p,
          status: "completed" as const,
        }));

        set({
          currentRoom: {
            ...current,
            status: "completed",
            participants: updatedParticipants,
          },
        });
      },

      leaveRoom: () => {
        cleanupChannel();
        set({ currentRoom: null, myParticipantId: null, isRealtimeConnected: false });
      },
    }),
    {
      name: "rimba_campfire_room",
      partialize: (state) => ({ currentRoom: state.currentRoom }),
    }
  )
);
