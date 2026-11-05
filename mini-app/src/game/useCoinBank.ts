import { useCallback, useEffect, useRef } from "react";
import { useCoinStore } from "../store/useCoinStore";

// The server accepts at most 10 coins per claim and one claim every 3 seconds,
// so coins earned in quick succession are banked and sent in batches.
const MAX_PER_CLAIM = 10;
const CLAIM_INTERVAL_MS = 3200;

export function useCoinBank() {
  const claim = useCoinStore((s) => s.claimFromGame);
  const pending = useRef(0);
  const lastClaim = useRef(0);
  const timer = useRef<number>();

  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    if (!pending.current) return;

    const wait = lastClaim.current + CLAIM_INTERVAL_MS - Date.now();
    if (wait > 0) {
      timer.current = window.setTimeout(flush, wait);
      return;
    }

    const amount = Math.min(pending.current, MAX_PER_CLAIM);
    pending.current -= amount;
    lastClaim.current = Date.now();
    void claim(amount);
    if (pending.current) timer.current = window.setTimeout(flush, CLAIM_INTERVAL_MS);
  }, [claim]);

  const deposit = useCallback(
    (coins: number) => {
      pending.current += coins;
      flush();
    },
    [flush],
  );

  // Leaving the game must not lose banked coins: let the timer chain finish on its own
  useEffect(() => () => void (pending.current && window.setTimeout(flush, CLAIM_INTERVAL_MS)), [flush]);

  return deposit;
}
