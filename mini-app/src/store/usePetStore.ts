import { create } from "zustand";
import type { Pet, FeedEntry, ActionType } from "../api/types";
import { getPet, doAction, getFeed } from "../api/pets";

interface PetStore {
  pet: Pet | null;
  feed: FeedEntry[];
  loading: boolean;
  error: string | null;
  fetchPet: (id: number) => Promise<void>;
  performAction: (action: ActionType) => Promise<void>;
  fetchFeed: () => Promise<void>;
  setPet: (pet: Pet) => void;
}

export const usePetStore = create<PetStore>((set, get) => ({
  pet: null,
  feed: [],
  loading: false,
  error: null,

  fetchPet: async (id) => {
    set({ loading: true, error: null });
    try {
      const pet = await getPet(id);
      set({ pet, loading: false });
    } catch (e: unknown) {
      set({ error: String(e), loading: false });
    }
  },

  performAction: async (action) => {
    const { pet } = get();
    if (!pet) return;
    try {
      const res = await doAction(pet.id, action);
      set({ pet: res.pet });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: { available_at?: string } } } };
      const available_at = err.response?.data?.detail?.available_at;
      if (available_at) {
        set({
          pet: {
            ...pet,
            cooldowns: pet.cooldowns.map((c) =>
              c.action === action ? { ...c, available_at } : c
            ),
          },
        });
      }
    }
  },

  fetchFeed: async () => {
    const { pet } = get();
    if (!pet) return;
    const feed = await getFeed(pet.id);
    set({ feed });
  },

  setPet: (pet) => set({ pet }),
}));
