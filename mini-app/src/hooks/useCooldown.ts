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