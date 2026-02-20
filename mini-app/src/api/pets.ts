import { api } from "./client";
import type { Pet, FeedEntry, InviteResponse, ActionType } from "./types";

export const getMyPets = () =>
  api.get<Pet[]>("/pets/my").then((r) => r.data);

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