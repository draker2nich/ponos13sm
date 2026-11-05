import { create } from "zustand";
import { api } from "../api";

interface CoinStore {
  coins: number;
  bestScore: number;
  load: () => Promise<void>;
  setCoins: (coins: number) => void;
  /** Coins and score earned in the mini game; optimistic, rolled back on failure */
  claimFromGame: (amount: number, score?: number) => Promise<void>;
}

export const useCoinStore = create<CoinStore>((set, get) => ({
  coins: 0,
  bestScore: 0,

  load: async () => {
    const me = await api.me().catch(() => null);
    if (me) set({ coins: me.coins, bestScore: me.game_best_score });
  },

  setCoins: (coins) => set({ coins }),

  claimFromGame: async (amount, score) => {
    const prev = get().coins;
    set({ coins: prev + amount });
    try {
      const res = await api.claimCoins(amount, score);
      set({ coins: res.coins, bestScore: res.game_best_score });
    } catch {
      set({ coins: prev });
    }
  },
}));
