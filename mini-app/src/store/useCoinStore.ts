// mini-app/src/store/useCoinStore.ts
import { create } from "zustand";

interface CoinStore {
  coins: number;
  addCoins: (n: number) => void;
  spendCoins: (n: number) => boolean;
}

export const useCoinStore = create<CoinStore>((set, get) => ({
  coins: 0,
  addCoins: (n) => set({ coins: get().coins + n }),
  spendCoins: (n) => {
    if (get().coins < n) return false;
    set({ coins: get().coins - n });
    return true;
  },
}));