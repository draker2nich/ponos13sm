import { create } from "zustand";
import { api, ApiError, type ActionType, type Pet } from "../api";
import { clampPercent } from "../lib/format";
import { useCoinStore } from "./useCoinStore";

// Mirrors backend/game.py ACTIONS so the UI reacts before the server answers
const OPTIMISTIC: Record<ActionType, Pick<Pet, "hunger" | "happiness" | "health">> = {
  feed: { hunger: 30, happiness: 5, health: 0 },
  play: { hunger: -5, happiness: 25, health: 5 },
  pet: { hunger: 0, happiness: 15, health: 10 },
};

export type ActionResult = { ok: true; streakReward: number } | { ok: false; availableAt: string | null };

interface PetStore {
  pet: Pet | null;
  loading: boolean;
  busy: boolean;
  load: (id: number) => Promise<void>;
  setPet: (pet: Pet) => void;
  act: (action: ActionType) => Promise<ActionResult>;
}

export const cooldownOf = (pet: Pet, action: ActionType) =>
  pet.cooldowns.find((c) => c.action === action)?.available_at ?? null;

export const usePetStore = create<PetStore>((set, get) => ({
  pet: null,
  loading: false,
  busy: false,

  load: async (id) => {
    set({ loading: true });
    try {
      set({ pet: await api.pet(id) });
    } finally {
      set({ loading: false });
    }
  },

  setPet: (pet) => set({ pet }),

  act: async (action) => {
    const { pet, busy } = get();
    if (!pet || busy) return { ok: false, availableAt: null };

    const d = OPTIMISTIC[action];
    set({
      busy: true,
      pet: {
        ...pet,
        hunger: clampPercent(pet.hunger + d.hunger),
        happiness: clampPercent(pet.happiness + d.happiness),
        health: clampPercent(pet.health + d.health),
      },
    });

    try {
      const res = await api.act(pet.id, action);
      set({ pet: res.pet });
      useCoinStore.getState().setCoins(res.coins);
      return { ok: true, streakReward: res.streak_reward };
    } catch (e) {
      const availableAt = e instanceof ApiError ? e.availableAt : null;
      set({
        pet: availableAt
          ? { ...pet, cooldowns: pet.cooldowns.map((c) => (c.action === action ? { ...c, available_at: availableAt } : c)) }
          : pet,
      });
      return { ok: false, availableAt };
    } finally {
      set({ busy: false });
    }
  },
}));
