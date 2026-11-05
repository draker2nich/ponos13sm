import { useEffect, useState } from "react";
import { secondsUntil } from "../lib/format";

/** Seconds left until `iso`, re-rendering every second while it runs */
export function useCountdown(iso: string | null): number {
  const [left, setLeft] = useState(() => secondsUntil(iso));

  useEffect(() => {
    setLeft(secondsUntil(iso));
    if (!iso) return;
    const id = window.setInterval(() => {
      const s = secondsUntil(iso);
      setLeft(s);
      if (!s) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [iso]);

  return left;
}
