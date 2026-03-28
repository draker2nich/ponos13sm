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
  is_sleeping: boolean;
  owners: Owner[];
  cooldowns: CooldownInfo[];
  updated_at: string;
}

export interface FeedEntry {
  user_id: number;
  user_name: string | null;
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