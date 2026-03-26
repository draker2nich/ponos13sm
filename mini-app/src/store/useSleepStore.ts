// mini-app/src/store/useSleepStore.ts
import { create } from "zustand";

interface SleepStore {
  sleeping: boolean;
  toggle: () => void;
}

export const useSleepStore = create<SleepStore>((set, get) => ({
  sleeping: false,
  toggle: () => set({ sleeping: !get().sleeping }),
}));