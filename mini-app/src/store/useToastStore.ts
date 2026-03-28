// mini-app/src/store/useToastStore.ts
import { create } from "zustand";

export type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  text: string;
  type: ToastType;
}

interface ToastStore {
  toasts: Toast[];
  show: (text: string, type?: ToastType) => void;
}

let nextId = 0;

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  show: (text, type = "info") => {
    const id = ++nextId;
    set({ toasts: [...get().toasts, { id, text, type }] });
    setTimeout(() => {
      set({ toasts: get().toasts.filter(t => t.id !== id) });
    }, 2500);
  },
}));