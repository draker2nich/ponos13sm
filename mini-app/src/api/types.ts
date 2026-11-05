export type PetMood = "happy" | "content" | "sad" | "hungry" | "sleepy";
export type PetType = "cat" | "dog" | "bunny" | "bear";
export type ActionType = "feed" | "play" | "pet";
export type ItemKind = "food" | "wash";

export interface Owner {
  user_id: number;
  name: string | null;
  is_creator: boolean;
  is_me: boolean;
  last_active_at: string | null;
}

export interface Cooldown {
  action: ActionType;
  available_at: string | null;
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
  is_sleeping: boolean;
  owners: Owner[];
  cooldowns: Cooldown[];
  updated_at: string;
}

export interface CatalogItem {
  id: number;
  emoji: string;
  cost: number;
  hunger: number;
  happiness: number;
  health: number;
}

export type Catalog = Record<ItemKind, CatalogItem[]>;

export interface Me {
  id: number;
  username: string | null;
  first_name: string | null;
  coins: number;
  game_best_score: number;
  is_premium: boolean;
}
