import type { ActivityAction, FeedEntry, Pet } from "../api";
import { haptic } from "./telegram";
import { toast } from "../store/useToastStore";

const VERBS: Record<ActivityAction, { them: string; me: string }> = {
  feed: { them: "покормил(а)", me: "покормили" },
  play: { them: "поиграл(а)", me: "поиграли" },
  pet: { them: "погладил(а)", me: "погладили" },
  wash: { them: "искупал(а)", me: "искупали" },
};

/** "Аня покормил(а)" or "Вы покормили" */
export function describe(entry: FeedEntry, pet: Pet): string {
  const mine = pet.owners.some((o) => o.is_me && o.user_id === entry.user_id);
  const verb = VERBS[entry.action] ?? VERBS.feed;
  return mine ? `Вы ${verb.me}` : `${entry.user_name ?? "Партнёр"} ${verb.them}`;
}

/** The partner's latest action, if any */
export function lastPartnerAction(pet: Pet): FeedEntry | null {
  const partner = pet.owners.find((o) => !o.is_me);
  return (partner && pet.recent.find((e) => e.user_id === partner.user_id)) ?? null;
}

export function celebrateStreak(streak: number, reward: number) {
  if (!reward) return;
  toast(`Стрик ${streak} дн. — вам обоим +${reward} монет`, "success");
  haptic("success");
}
