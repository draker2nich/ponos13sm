import { useCallback } from "react";
import type { ActionType } from "../api";
import { celebrateStreak } from "../lib/activity";
import { formatDuration, secondsUntil } from "../lib/format";
import { haptic } from "../lib/telegram";
import { useFxStore } from "../store/useFxStore";
import { usePetStore } from "../store/usePetStore";
import { toast } from "../store/useToastStore";

const GAIN: Record<ActionType, string> = {
  feed: "+30 сытости",
  play: "+25 настроения",
  pet: "+15 настроения",
};

/** Perform a free action with feedback: a burst over the pet, haptics, or a cooldown hint */
export function useAct() {
  const act = usePetStore((s) => s.act);
  const fire = useFxStore((s) => s.fire);

  return useCallback(
    async (action: ActionType) => {
      const res = await act(action);
      if (res.ok) {
        fire(GAIN[action]);
        haptic("medium");
        celebrateStreak(usePetStore.getState().pet?.streak ?? 0, res.streakReward);
      } else if (res.availableAt) {
        toast(`Можно снова через ${formatDuration(secondsUntil(res.availableAt))}`);
        haptic("error");
      } else {
        toast("Не получилось, попробуй ещё раз", "error");
      }
      return res.ok;
    },
    [act, fire],
  );
}
