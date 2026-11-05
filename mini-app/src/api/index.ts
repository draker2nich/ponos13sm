import { request } from "./client";
import type { ActionType, Catalog, ItemKind, Me, Pet, PetType } from "./types";

export { ApiError } from "./client";
export type * from "./types";

export const api = {
  myPets: () => request<Pet[]>("GET", "/pets/my"),
  pet: (id: number) => request<Pet>("GET", `/pets/${id}`),
  createPet: (name: string, pet_type: PetType) => request<Pet>("POST", "/pets", { name, pet_type }),
  deletePet: (id: number) => request<null>("DELETE", `/pets/${id}`),
  toggleSleep: (id: number) => request<Pet>("POST", `/pets/${id}/sleep`),

  act: (id: number, action: ActionType) =>
    request<{ coins: number; streak_reward: number; pet: Pet }>("POST", `/pets/${id}/actions`, { action }),

  catalog: () => request<Catalog>("GET", "/catalog"),
  buy: (id: number, item_type: ItemKind, item_id: number) =>
    request<{ coins: number; item_emoji: string; streak_reward: number; pet: Pet }>("POST", `/pets/${id}/buy`, {
      item_type,
      item_id,
    }),

  buyStreakFreeze: (id: number) => request<{ coins: number; pet: Pet }>("POST", `/pets/${id}/streak-freeze`),

  createInvite: (pet_id: number) =>
    request<{ token: string; link: string; expires_at: string }>("POST", "/invites", { pet_id }),
  acceptInvite: (token: string) => request<{ pet_id: number }>("POST", `/invites/${token}/accept`),

  me: () => request<Me>("GET", "/users/me"),
  claimCoins: (amount: number, game_score?: number) =>
    request<{ coins: number; game_best_score: number; accepted: number; left_today: number }>(
      "POST",
      "/users/me/coins",
      { amount, game_score },
    ),
};
