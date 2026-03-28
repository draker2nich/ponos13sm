// mini-app/src/store/useSleepStore.ts
import { create } from "zustand";

interface SleepStore {
  sleeping: boolean;
  setSleeping: (v: boolean) => void;
  toggle: () => void;
}

export const useSleepStore = create<SleepStore>((set, get) => ({
  sleeping: false,
  setSleeping: (v) => set({ sleeping: v }),
  toggle: () => set({ sleeping: !get().sleeping }),
}));