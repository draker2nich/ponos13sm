// mini-app/src/store/useCoinStore.ts
import { create } from "zustand";
import { getMe, addCoins as apiAddCoins, gameStart as apiGameStart } from "../api/users";

interface CoinStore {
  coins: number;
  gameBestScore: number;
  loaded: boolean;
  coinMultiplier: number;

  fetchCoins: () => Promise<void>;
  setCoins: (n: number) => void;
  addCoinsFromGame: (amount: number, gameScore?: number) => Promise<void>;
  spendCoins: (n: number) => boolean;

  /** Request game start — checks energy server-side, returns ok/message */
  requestGameStart: (petId: number) => Promise<{ ok: boolean; message?: string }>;
}

export const useCoinStore = create<CoinStore>((set, get) => ({
  coins: 0,
  gameBestScore: 0,
  loaded: false,
  coinMultiplier: 1.0,

  fetchCoins: async () => {
    try {
      const me = await getMe();
      set({ coins: me.coins, gameBestScore: me.game_best_score, loaded: true });
    } catch {
      // не критично
    }
  },

  setCoins: (n) => set({ coins: n }),

  addCoinsFromGame: async (amount, gameScore) => {
    const prev = get().coins;
    set({ coins: prev + amount });
    try {
      const res = await apiAddCoins(amount, gameScore);
      set({ coins: res.coins, gameBestScore: res.game_best_score });
    } catch {
      set({ coins: prev });
    }
  },

  spendCoins: (n) => {
    if (get().coins < n) return false;
    set({ coins: get().coins - n });
    return true;
  },

  requestGameStart: async (petId) => {
    try {
      const res = await apiGameStart(petId);
      if (res.ok) {
        set({ coinMultiplier: res.coin_multiplier });
        return { ok: true };
      }
      return { ok: false, message: res.message ?? "Недостаточно энергии" };
    } catch {
      return { ok: false, message: "Ошибка сети" };
    }
  },
}));