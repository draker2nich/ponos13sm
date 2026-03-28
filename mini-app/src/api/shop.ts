import { api } from "./client";
import type { Pet } from "./types";

export interface BuyResponse {
  ok: boolean;
  coins: number;
  item_emoji: string;
  pet: Pet;
}

export const buyItem = (petId: number, itemType: "food" | "wash", itemId: number) =>
  api.post<BuyResponse>(`/pets/${petId}/buy`, { item_type: itemType, item_id: itemId }).then(r => r.data);

export interface SleepResponse {
  ok: boolean;
  is_sleeping: boolean;
  pet: Pet;
}

export const toggleSleep = (petId: number) =>
  api.post<SleepResponse>(`/pets/${petId}/sleep`).then(r => r.data);

export const deletePet = (petId: number) =>
  api.delete(`/pets/${petId}`).then(r => r.data);