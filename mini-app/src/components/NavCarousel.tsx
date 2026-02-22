// mini-app/src/components/NavCarousel.tsx
import { useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import type { ActionType } from "../api/types";

export type TabId = ActionType | "shop" | "sleep" | "wash" | "partner" | "settings";

/* ── Layout constants (shared with BottomBlock) ── */
export const NAV_PAD  = 8;
export const BTN_W    = 50;
export const BTN_GAP  = 5;
export const VISIBLE  = 3;
export const SPAD     = 12; // shadow padding — must be >= box-shadow spread

// Inner scrollable content width (3 buttons visible)
export const PILL_INNER_W = VISIBLE * BTN_W + (VISIBLE - 1) * BTN_GAP; // 160

export const NOTAP: React.CSSProperties = {
  WebkitTapHighlightColor: "transparent",
  WebkitTouchCallout: "none",
  WebkitUserSelect: "none",
  userSelect: "none",
};

/* ════════════════════════════════════════════
   Carousel — overflow visible so shadows paint
   ════════════════════════════════════════════ */
interface CarouselProps {
  children: React.ReactNode;
  activeIndex: number; // 0-based index of the active button
  totalCount: number;
}

export function Carousel({ children, activeIndex, totalCount }: CarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const down = useRef(false);
  const sx   = useRef(0);
  const sl   = useRef(0);

  // Scroll so the active button is centered (or clamped at edges)
  const scrollToActive = useCallback((idx: number, smooth: boolean) => {
    const el = scrollRef.current;
    if (!el) return;

    // Target: center of the active button should align with center of the 3-button viewport
    const centerOffset = PILL_INNER_W / 2 - BTN_W / 2; // 55
    const targetScroll = idx * (BTN_W + BTN_GAP) - centerOffset;

    // Clamp to valid scroll range
    const maxScroll = (totalCount - VISIBLE) * (BTN_W + BTN_GAP);
    const clamped = Math.max(0, Math.min(maxScroll, targetScroll));

    el.scrollTo({ left: clamped, behavior: smooth ? "smooth" : "instant" });
  }, [totalCount]);

  // Scroll on mount without animation
  useEffect(() => { scrollToActive(activeIndex, false); }, []); // eslint-disable-line

  // Scroll with animation on active change
  useEffect(() => { scrollToActive(activeIndex, true); }, [activeIndex, scrollToActive]);

  return (
    /*
     * Outer wrapper: clip the HORIZONTAL overflow so we don't expand the pill,
     * but add VERTICAL overflow via negative margins so shadows aren't clipped.
     */
    <div style={{
      width: PILL_INNER_W,
      overflowX: "hidden",
      overflowY: "visible",
      // Pull in extra vertical space so shadows paint above/below
      marginBlock: -SPAD,
      paddingBlock: SPAD,
    }}>
      <div
        ref={scrollRef}
        onMouseDown={e => { down.current = true; sx.current = e.pageX; sl.current = scrollRef.current!.scrollLeft; }}
        onMouseUp={() => { down.current = false; }}
        onMouseLeave={() => { down.current = false; }}
        onMouseMove={e => { if (!down.current) return; scrollRef.current!.scrollLeft = sl.current - (e.pageX - sx.current) * 1.2; }}
        style={{
          display: "flex",
          gap: BTN_GAP,
          alignItems: "center",
          overflowX: "auto",
          // Give each row the button height + vertical shadow room
          height: BTN_W + SPAD * 2,
          padding: `${SPAD}px 0`,
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
          cursor: "grab",
          // Prevent the inner scroll from clipping shadows in the Y axis
          overflowY: "visible",
          ...NOTAP,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   CarouselBtn
   ════════════════════════════════════════════ */
export function CarouselBtn({ icon, active, disabled, cdLabel, onClick }: {
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  cdLabel?: string;
  onClick?: () => void;
}) {
  return (
    <div style={{ flexShrink: 0, width: BTN_W, height: BTN_W }}>
      <motion.button
        whileTap={disabled ? {} : { scale: 0.84 }}
        onClick={disabled ? undefined : onClick}
        style={{
          width: "100%", height: "100%", borderRadius: "50%",
          background: active ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.30)",
          backdropFilter: active ? "blur(16px)" : undefined,
          WebkitBackdropFilter: active ? "blur(16px)" : undefined,
          border: active
            ? "1.5px solid rgba(255,255,255,0.95)"
            : "1px solid rgba(255,255,255,0.50)",
          boxShadow: active
            ? "0 4px 6px rgba(100,100,150,0.22), 0 1px 3px rgba(100,100,150,0.12)"
            : "0 2px 4px rgba(100,100,150,0.10)",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 2,
          transition: "background 0.15s, border 0.15s, box-shadow 0.15s",
          fontFamily: "inherit", padding: 0, outline: "none",
          ...NOTAP,
        }}
      >
        <div style={{
          width: 22, height: 22,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: disabled
            ? "rgba(0,0,0,0.18)"
            : active ? "rgba(0,0,0,0.68)" : "rgba(0,0,0,0.38)",
          filter: disabled ? "opacity(0.35)" : "none",
          transition: "color 0.15s",
        }}>{icon}</div>
        {disabled && cdLabel && (
          <span style={{ fontSize: 7, fontWeight: 800, color: "rgba(0,0,0,0.30)", lineHeight: 1 }}>
            {cdLabel}
          </span>
        )}
      </motion.button>
    </div>
  );
}