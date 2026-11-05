import { create } from "zustand";

export type ToastKind = "success" | "error" | "info";

interface Toast {
  id: number;
  text: string;
  kind: ToastKind;
}

interface ToastStore {
  toasts: Toast[];
  show: (text: string, kind?: ToastKind) => void;
}

let nextId = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  show: (text, kind = "info") => {
    const id = ++nextId;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, kind }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 2500);
  },
}));

export const toast = (text: string, kind?: ToastKind) => useToastStore.getState().show(text, kind);
