// mini-app/src/store/useMenuStore.ts
import { create } from "zustand";

export type MenuCategory = "feed" | "play" | "sleep" | "shop";

// Ordered list — defines swipe direction between categories
export const MENU_ORDER: MenuCategory[] = ["feed", "play", "shop", "sleep"];

interface MenuStore {
  openMenu: MenuCategory | null;
  prevMenu: MenuCategory | null;
  setMenu: (cat: MenuCategory | null) => void;
  closeMenu: () => void;
}

export const useMenuStore = create<MenuStore>((set, get) => ({
  openMenu: null,
  prevMenu: null,
  setMenu: (cat) => set({ prevMenu: get().openMenu, openMenu: cat }),
  closeMenu: () => set({ prevMenu: get().openMenu, openMenu: null }),
}));