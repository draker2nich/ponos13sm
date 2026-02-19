// ─── src/api/types.ts ─────────────────────────────────────────────────────────
export type PetMood = "happy" | "content" | "sad" | "hungry" | "sleepy";
export type PetType = "cat" | "dog" | "bunny" | "bear";
export type ActionType = "feed" | "play" | "pet";

export interface CooldownInfo {
  action: ActionType;
  available_at: string | null;
}

export interface Owner {
  user_id: number;
  is_creator: boolean;
  last_active_at: string | null;
}

export interface Pet {
  id: number;
  name: string;
  pet_type: PetType;
  hunger: number;
  happiness: number;
  health: number;
  level: number;
  experience: number;
  age_days: number;
  streak: number;
  mood: PetMood;
  owners: Owner[];
  cooldowns: CooldownInfo[];
  updated_at: string;
}

export interface FeedEntry {
  user_id: number;
  action: ActionType;
  hunger_delta: number;
  happiness_delta: number;
  health_delta: number;
  performed_at: string;
}

export interface InviteResponse {
  token: string;
  link: string;
  expires_at: string;
}


// ─── src/api/pets.ts ──────────────────────────────────────────────────────────
import { api } from "./client";
import type { Pet, FeedEntry, InviteResponse, ActionType } from "./types";

export const getPet = (id: number) =>
  api.get<Pet>(`/pets/${id}`).then((r) => r.data);

export const createPet = (name: string, pet_type: string) =>
  api.post<Pet>("/pets", { name, pet_type }).then((r) => r.data);

export const doAction = (petId: number, action: ActionType) =>
  api.post(`/pets/${petId}/actions`, { action }).then((r) => r.data);

export const getFeed = (petId: number) =>
  api.get<FeedEntry[]>(`/pets/${petId}/feed`).then((r) => r.data);

export const createInvite = (petId: number) =>
  api.post<InviteResponse>("/invites", { pet_id: petId }).then((r) => r.data);

export const acceptInvite = (token: string) =>
  api.post(`/invites/${token}/accept`).then((r) => r.data);


// ─── src/api/client.ts (замени существующий) ─────────────────────────────────
import axios from "axios";

const tg = window.Telegram?.WebApp;

export const api = axios.create({
  baseURL: "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((cfg) => {
  const initData = tg?.initData ?? "";
  if (initData) cfg.headers.Authorization = `Bearer ${initData}`;
  return cfg;
});


// ─── src/store/usePetStore.ts ─────────────────────────────────────────────────
import { create } from "zustand";
import type { Pet, FeedEntry, ActionType } from "../api/types";
import { getPet, doAction, getFeed } from "../api/pets";

interface PetStore {
  pet: Pet | null;
  feed: FeedEntry[];
  loading: boolean;
  error: string | null;
  fetchPet: (id: number) => Promise<void>;
  performAction: (action: ActionType) => Promise<void>;
  fetchFeed: () => Promise<void>;
  setPet: (pet: Pet) => void;
}

export const usePetStore = create<PetStore>((set, get) => ({
  pet: null,
  feed: [],
  loading: false,
  error: null,

  fetchPet: async (id) => {
    set({ loading: true, error: null });
    try {
      const pet = await getPet(id);
      set({ pet, loading: false });
    } catch (e: unknown) {
      set({ error: String(e), loading: false });
    }
  },

  performAction: async (action) => {
    const { pet } = get();
    if (!pet) return;
    try {
      const res = await doAction(pet.id, action);
      set({ pet: res.pet });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: { available_at?: string } } } };
      const available_at = err.response?.data?.detail?.available_at;
      if (available_at) {
        set({
          pet: {
            ...pet,
            cooldowns: pet.cooldowns.map((c) =>
              c.action === action ? { ...c, available_at } : c
            ),
          },
        });
      }
    }
  },

  fetchFeed: async () => {
    const { pet } = get();
    if (!pet) return;
    const feed = await getFeed(pet.id);
    set({ feed });
  },

  setPet: (pet) => set({ pet }),
}));


// ─── src/hooks/useCooldown.ts ─────────────────────────────────────────────────
import { useState, useEffect } from "react";
import type { ActionType } from "../api/types";
import { usePetStore } from "../store/usePetStore";

export function useCooldown(action: ActionType): number {
  const pet = usePetStore((s) => s.pet);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!pet) return;
    const cd = pet.cooldowns.find((c) => c.action === action);
    if (!cd?.available_at) { setRemaining(0); return; }

    const tick = () => {
      const diff = Math.max(
        0,
        (new Date(cd.available_at!).getTime() - Date.now()) / 1000
      );
      setRemaining(Math.ceil(diff));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [pet, action]);

  return remaining;
}


// ─── src/components/StreakBadge.tsx ───────────────────────────────────────────
import { motion } from "framer-motion";

export function StreakBadge({ streak }: { streak: number }) {
  if (streak === 0) return null;
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        background: "#fff3e0", borderRadius: 20, padding: "4px 12px",
        fontSize: 13, fontWeight: 700, color: "#e65100",
      }}
    >
      🔥 {streak} {streak === 1 ? "день" : streak < 5 ? "дня" : "дней"}
    </motion.div>
  );
}


// ─── src/components/ActionButton.tsx (замени существующий) ────────────────────
import { motion } from "framer-motion";
import { useCooldown } from "../hooks/useCooldown";
import { usePetStore } from "../store/usePetStore";
import type { ActionType, PetStore as PS } from "../api/types";

const ACTION_META: Record<ActionType, { label: string; emoji: string; color: string }> = {
  feed:  { label: "Покормить", emoji: "🍎", color: "#f4c97a" },
  play:  { label: "Играть",    emoji: "🎾", color: "#a8d8a8" },
  pet:   { label: "Погладить", emoji: "🤍", color: "#c5b8d8" },
};

function formatCooldown(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}ч ${m}м`;
  if (m > 0) return `${m}м`;
  return `${s}с`;
}

export function ActionButton({ action }: { action: ActionType }) {
  const performAction = usePetStore((s: { performAction: (a: ActionType) => Promise<void> }) => s.performAction);
  const remaining = useCooldown(action);
  const { label, emoji, color } = ACTION_META[action];
  const disabled = remaining > 0;

  return (
    <motion.button
      whileTap={disabled ? {} : { scale: 0.93 }}
      onClick={() => { if (!disabled) performAction(action); }}
      style={{
        flex: 1, padding: "14px 8px", borderRadius: 18, border: "none",
        background: disabled ? "#f0f0f0" : color,
        color: disabled ? "#aaa" : "#444",
        fontWeight: 600, fontSize: 13, cursor: disabled ? "not-allowed" : "pointer",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        transition: "background 0.2s",
        boxShadow: disabled ? "none" : `0 4px 16px ${color}66`,
      }}
    >
      <span style={{ fontSize: 24 }}>{emoji}</span>
      <span>{disabled ? formatCooldown(remaining) : label}</span>
    </motion.button>
  );
}