import { create } from "zustand";

export const TABS = ["feed", "play", "shop", "wash", "sleep", "partner", "settings"] as const;
export type Tab = (typeof TABS)[number];

interface MenuStore {
  open: Tab | null;
  /** -1 / 0 / 1: which side the next panel slides in from */
  direction: number;
  setOpen: (tab: Tab | null) => void;
  step: (delta: 1 | -1) => void;
}

export const useMenuStore = create<MenuStore>((set, get) => ({
  open: null,
  direction: 0,
  setOpen: (tab) => {
    const { open } = get();
    const direction = open && tab ? Math.sign(TABS.indexOf(tab) - TABS.indexOf(open)) : 0;
    set({ open: tab, direction });
  },
  step: (delta) => {
    const { open, setOpen } = get();
    if (!open) return;
    const next = TABS[TABS.indexOf(open) + delta];
    if (next) setOpen(next);
  },
}));
