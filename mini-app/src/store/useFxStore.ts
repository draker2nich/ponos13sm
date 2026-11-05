import { create } from "zustand";

/** Short-lived visual feedback over the pet, like "+30 сытости" */
interface FxStore {
  burst: { id: number; text: string } | null;
  fire: (text: string) => void;
}

let nextId = 0;

export const useFxStore = create<FxStore>((set) => ({
  burst: null,
  fire: (text) => {
    const id = ++nextId;
    set({ burst: { id, text } });
    setTimeout(() => set((s) => (s.burst?.id === id ? { burst: null } : s)), 900);
  },
}));
