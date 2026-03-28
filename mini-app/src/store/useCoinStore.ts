// mini-app/src/store/useCoinStore.ts
import { create } from "zustand";
import { getMe, addCoins as apiAddCoins } from "../api/users";

interface CoinStore {
  coins: number;
  gameBestScore: number;
  loaded: boolean;

  /** Загрузить баланс с сервера */
  fetchCoins: () => Promise<void>;

  /** Установить монеты локально (из ответа action) */
  setCoins: (n: number) => void;

  /** Начислить монеты через API (из игры) */
  addCoinsFromGame: (amount: number, gameScore?: number) => Promise<void>;

  /** Потратить монеты локально (оптимистично) */
  spendCoins: (n: number) => boolean;
}

export const useCoinStore = create<CoinStore>((set, get) => ({
  coins: 0,
  gameBestScore: 0,
  loaded: false,

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
}));