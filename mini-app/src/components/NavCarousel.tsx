// mini-app/src/components/NavCarousel.tsx
import { useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import type { ActionType } from "../api/types";

export type TabId = ActionType | "shop" | "sleep" | "wash" | "partner" | "settings";

export const NAV_PAD  = 8;
export const BTN_W    = 50;
export const BTN_GAP  = 5;
export const VISIBLE  = 3;
export const SPAD     = 14; // увеличен для крайних теней

// PILL_INNER_W теперь включает горизонтальный padding для теней
export const PILL_INNER_W = VISIBLE * BTN_W + (VISIBLE - 1) * BTN_GAP + SPAD * 2; // 188

export const NOTAP: React.CSSProperties = {
  WebkitTapHighlightColor: "transparent",
  WebkitTouchCallout: "none",
  WebkitUserSelect: "none",
  userSelect: "none",
};

interface CarouselProps {
  children: React.ReactNode;
  activeIndex: number;
  totalCount: number;
}

export function Carousel({ children, activeIndex, totalCount }: CarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const down = useRef(false);
  const sx   = useRef(0);
  const sl   = useRef(0);

  // Скроллим так чтобы активная кнопка была по центру видимой области
  // Видимая область кнопок = PILL_INNER_W - SPAD*2 = 3 кнопки
  const scrollToActive = useCallback((idx: number, smooth: boolean) => {
    const el = scrollRef.current;
    if (!el) return;
    const visibleW = VISIBLE * BTN_W + (VISIBLE - 1) * BTN_GAP;
    const centerOffset = visibleW / 2 - BTN_W / 2;
    const targetScroll = idx * (BTN_W + BTN_GAP) - centerOffset;
    const maxScroll = (totalCount - VISIBLE) * (BTN_W + BTN_GAP);
    const clamped = Math.max(0, Math.min(maxScroll, targetScroll));
    el.scrollTo({ left: clamped, behavior: smooth ? "smooth" : "instant" });
  }, [totalCount]);

  useEffect(() => { scrollToActive(activeIndex, false); }, []); // eslint-disable-line
  useEffect(() => { scrollToActive(activeIndex, true); }, [activeIndex, scrollToActive]);

  return (
    // Внешний wrapper: ширина = PILL_INNER_W (включает SPAD по краям)
    // overflow: hidden по горизонтали, visible по вертикали для теней
    <div style={{
      width: PILL_INNER_W,
      overflowX: "hidden",
      overflowY: "visible",
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
          height: BTN_W + SPAD * 2,
          // Горизонтальный padding = SPAD, чтобы тени крайних кнопок не резались
          paddingInline: SPAD,
          paddingBlock: SPAD,
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
          cursor: "grab",
          overflowY: "visible",
          boxSizing: "border-box",
          ...NOTAP,
        }}
      >
        {children}
      </div>
    </div>
  );
}

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