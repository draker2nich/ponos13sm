// mini-app/src/store/useMenuStore.ts
import { create } from "zustand";

// Все категории включая partner и settings
export type MenuCategory = "feed" | "play" | "shop" | "wash" | "sleep" | "partner" | "settings";

// Порядок для свайп-навигации
export const MENU_ORDER: MenuCategory[] = ["feed", "play", "shop", "wash", "sleep", "partner", "settings"];

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