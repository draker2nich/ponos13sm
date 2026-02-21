// mini-app/src/store/useMenuStore.ts
import { create } from "zustand";

export type MenuCategory = "feed" | "play" | "sleep" | "shop";

interface MenuStore {
  openMenu: MenuCategory | null;
  setMenu: (cat: MenuCategory | null) => void;
}

export const useMenuStore = create<MenuStore>((set) => ({
  openMenu: null,
  setMenu: (cat) => set({ openMenu: cat }),
}));