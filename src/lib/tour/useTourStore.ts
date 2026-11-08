import { create } from "zustand";

export interface TourState {
  isTourActive: boolean;
  currentStepIndex: number;
  currentOwner: string;
  startTour: (owner?: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  skipTour: () => void;
  completeTour: () => void;
  hasCompletedTour: (owner?: string) => boolean;
  markTourCompleted: (owner?: string) => void;
  resetTourForOwner: (owner?: string) => void;
}

export function getTourStorageKey(owner?: string): string {
  const cleanOwner = owner && owner.trim() ? owner.trim() : "guest";
  return `rimba_tour_v1_${cleanOwner}`;
}

function getStorage(): Storage | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  if (typeof localStorage !== "undefined") {
    return localStorage;
  }
  return null;
}

export const useTourStore = create<TourState>((set, get) => ({
  isTourActive: false,
  currentStepIndex: 0,
  currentOwner: "guest",

  startTour: (owner = "guest") => {
    const cleanOwner = owner && owner.trim() ? owner.trim() : "guest";
    set({
      isTourActive: true,
      currentStepIndex: 0,
      currentOwner: cleanOwner,
    });
  },

  nextStep: () => {
    set((state) => ({
      currentStepIndex: state.currentStepIndex + 1,
    }));
  },

  prevStep: () => {
    set((state) => ({
      currentStepIndex: Math.max(0, state.currentStepIndex - 1),
    }));
  },

  goToStep: (index: number) => {
    set({ currentStepIndex: Math.max(0, index) });
  },

  skipTour: () => {
    const owner = get().currentOwner;
    get().markTourCompleted(owner);
    set({ isTourActive: false, currentStepIndex: 0 });
  },

  completeTour: () => {
    const owner = get().currentOwner;
    get().markTourCompleted(owner);
    set({ isTourActive: false, currentStepIndex: 0 });
  },

  hasCompletedTour: (owner = "guest") => {
    const storage = getStorage();
    if (!storage) return false;
    try {
      const key = getTourStorageKey(owner);
      return storage.getItem(key) === "true";
    } catch {
      return false;
    }
  },

  markTourCompleted: (owner = "guest") => {
    const storage = getStorage();
    if (!storage) return;
    try {
      const key = getTourStorageKey(owner);
      storage.setItem(key, "true");
    } catch (e) {
      console.warn("[useTourStore] Failed writing tour completion:", e);
    }
  },

  resetTourForOwner: (owner = "guest") => {
    const storage = getStorage();
    if (!storage) return;
    try {
      const key = getTourStorageKey(owner);
      storage.removeItem(key);
    } catch (e) {
      console.warn("[useTourStore] Failed resetting tour completion:", e);
    }
    set({ isTourActive: false, currentStepIndex: 0 });
  },
}));
