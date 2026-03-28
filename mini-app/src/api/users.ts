import { api } from "./client";

export interface UserMe {
  id: number;
  username: string | null;
  first_name: string | null;
  coins: number;
  game_best_score: number;
  is_premium: boolean;
}

export interface AddCoinsResponse {
  coins: number;
  game_best_score: number;
}

export const getMe = () =>
  api.get<UserMe>("/users/me").then((r) => r.data);

export const addCoins = (amount: number, game_score?: number) =>
  api.post<AddCoinsResponse>("/users/me/coins", { amount, game_score }).then((r) => r.data);