import { create } from "zustand";
import type { Pet, FeedEntry, ActionType } from "../api/types";
import { getPet, doAction, getFeed } from "../api/pets";
import { useCoinStore } from "./useCoinStore";

// Оптимистичные дельты для мгновенного UI-отклика
const ACTION_DELTAS: Record<ActionType, { hunger: number; happiness: number; health: number }> = {
  feed: { hunger: 30,  happiness: 5,  health: 0  },
  play: { hunger: -5,  happiness: 25, health: 5  },
  pet:  { hunger: 0,   happiness: 15, health: 10 },
};

function applyDelta(pet: Pet, d: typeof ACTION_DELTAS[ActionType]): Pet {
  return {
    ...pet,
    hunger:    Math.max(0, Math.min(100, pet.hunger    + d.hunger)),
    happiness: Math.max(0, Math.min(100, pet.happiness + d.happiness)),
    health:    Math.max(0, Math.min(100, pet.health    + d.health)),
  };
}

interface PetStore {
  pet: Pet | null;
  feed: FeedEntry[];
  loading: boolean;
  error: string | null;
  actionInFlight: boolean;
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
  actionInFlight: false,

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
    const { pet, actionInFlight } = get();
    if (!pet || actionInFlight) return;

    set({ actionInFlight: true });

    const prevPet = pet;
    const optimisticPet = applyDelta(pet, ACTION_DELTAS[action]);

    // Мгновенно обновляем UI
    set({ pet: optimisticPet });

    try {
      const res = await doAction(pet.id, action);
      // Синхронизируем с реальными данными сервера
      set({ pet: res.pet });
      // Синхронизируем монеты из ответа
      if (res.coins !== undefined) {
        useCoinStore.getState().setCoins(res.coins);
      }
      // Обновляем ленту после действия
      const feed = await getFeed(pet.id);
      set({ feed });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: { available_at?: string } } } };
      const available_at = err.response?.data?.detail?.available_at;

      if (available_at) {
        set({
          pet: {
            ...prevPet,
            cooldowns: prevPet.cooldowns.map((c) =>
              c.action === action ? { ...c, available_at } : c
            ),
          },
        });
      } else {
        set({ pet: prevPet });
      }
    } finally {
      set({ actionInFlight: false });
    }
  },

  fetchFeed: async () => {
    const { pet } = get();
    if (!pet) return;
    try {
      const feed = await getFeed(pet.id);
      set({ feed });
    } catch {
      // не критично
    }
  },

  setPet: (pet) => set({ pet }),
}));