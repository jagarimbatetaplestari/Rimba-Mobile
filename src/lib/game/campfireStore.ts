import { create } from "zustand";
import { persist } from "zustand/middleware";
import { soundManager } from "@/lib/audio/sounds";
import { hapticSuccess, hapticWarning } from "@/lib/mobile/nativeBridge";

export type CampfireAnimal = "fox" | "bunny" | "koala" | "bird" | "bee";

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
  status: "lobby" | "active" | "completed" | "severed";
  startedAt: string | null;
  participants: CampfireParticipant[];
}

interface CampfireState {
  currentRoom: CampfireRoom | null;
  createRoom: (
    hostName: string,
    durationMinutes: number,
    animal: CampfireAnimal,
    species: string,
    roomName?: string
  ) => CampfireRoom;
  joinRoom: (
    code: string,
    playerName: string,
    animal: CampfireAnimal,
    species: string
  ) => boolean;
  startRoomFocus: () => void;
  abandonRoom: () => void;
  completeRoom: () => void;
  leaveRoom: () => void;
}

const MOCK_WANDERERS: Omit<CampfireParticipant, "id" | "joinedAt">[] = [
  {
    name: "Ranger Arya",
    animal: "fox",
    species: "oak",
    isHost: false,
    status: "ready",
  },
  {
    name: "Dewi Lestari",
    animal: "bunny",
    species: "pine",
    isHost: false,
    status: "ready",
  },
  {
    name: "Bayu Hening",
    animal: "bird",
    species: "autumn",
    isHost: false,
    status: "ready",
  },
];

function generateRoomCode(): string {
  const num = Math.floor(100 + Math.random() * 900);
  return `RIMBA-${num}`;
}

export const useCampfireStore = create<CampfireState>()(
  persist(
    (set, get) => ({
      currentRoom: null,

      createRoom: (
        hostName,
        durationMinutes,
        animal,
        species,
        roomName = "Bilik Api Unggun Suaka"
      ) => {
        const code = generateRoomCode();
        const host: CampfireParticipant = {
          id: `p_host_${Date.now()}`,
          name: hostName || "Tamu Rimba",
          animal,
          species,
          isHost: true,
          status: "ready",
          joinedAt: new Date().toISOString(),
        };

        // Add 1 friendly mock wanderer so the campfire feels alive and collaborative immediately
        const mockCompanion = MOCK_WANDERERS[Math.floor(Math.random() * MOCK_WANDERERS.length)];
        const companion: CampfireParticipant = {
          ...mockCompanion,
          id: `p_comp_${Date.now()}`,
          joinedAt: new Date().toISOString(),
        };

        const newRoom: CampfireRoom = {
          code,
          name: roomName,
          durationMinutes,
          status: "lobby",
          startedAt: null,
          participants: [host, companion],
        };

        set({ currentRoom: newRoom });
        return newRoom;
      },

      joinRoom: (code, playerName, animal, species) => {
        const normalized = code.trim().toUpperCase();
        if (!normalized) return false;

        // If joining self room
        const current = get().currentRoom;
        if (current && current.code === normalized) {
          return true;
        }

        // Create joined room representation
        const selfParticipant: CampfireParticipant = {
          id: `p_self_${Date.now()}`,
          name: playerName || "Tamu Rimba",
          animal,
          species,
          isHost: false,
          status: "ready",
          joinedAt: new Date().toISOString(),
        };

        // Seed with the host wanderer
        const hostWanderer: CampfireParticipant = {
          id: `p_host_remote`,
          name: "Ranger Suaka",
          animal: "koala",
          species: "ancient",
          isHost: true,
          status: "ready",
          joinedAt: new Date().toISOString(),
        };

        const room: CampfireRoom = {
          code: normalized,
          name: `Bilik Hening ${normalized}`,
          durationMinutes: 25,
          status: "lobby",
          startedAt: null,
          participants: [hostWanderer, selfParticipant],
        };

        set({ currentRoom: room });
        return true;
      },

      startRoomFocus: () => {
        const current = get().currentRoom;
        if (!current) return;

        const updatedParticipants = current.participants.map((p) => ({
          ...p,
          status: "focusing" as const,
        }));

        set({
          currentRoom: {
            ...current,
            status: "active",
            startedAt: new Date().toISOString(),
            participants: updatedParticipants,
          },
        });
      },

      abandonRoom: () => {
        const current = get().currentRoom;
        if (!current) return;

        const updatedParticipants = current.participants.map((p) => {
          if (p.isHost) {
            return { ...p, status: "abandoned" as const };
          }
          return p;
        });

        set({
          currentRoom: {
            ...current,
            status: "severed",
            participants: updatedParticipants,
          },
        });
      },

      completeRoom: () => {
        const current = get().currentRoom;
        if (!current) return;

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
        set({ currentRoom: null });
      },
    }),
    {
      name: "rimba_campfire_room",
      partialize: (state) => ({ currentRoom: state.currentRoom }),
    }
  )
);
