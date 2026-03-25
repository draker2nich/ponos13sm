// mini-app/src/components/NavCarousel.tsx
// GPU-accelerated carousel via translateX instead of scrollLeft
import { useRef, useEffect, useCallback, useState } from "react";
import { motion, useMotionValue, useSpring, animate } from "framer-motion";
import type { ActionType } from "../api/types";

export type TabId = ActionType | "shop" | "sleep" | "wash" | "partner" | "settings";

export const NAV_PAD  = 8;
export const BTN_W    = 50;
export const BTN_GAP  = 5;
export const VISIBLE  = 3;
export const SPAD     = 14;

export const PILL_INNER_W = VISIBLE * BTN_W + (VISIBLE - 1) * BTN_GAP + SPAD * 2;

export const NOTAP: React.CSSProperties = {
  WebkitTapHighlightColor: "transparent",
  WebkitTouchCallout: "none",
  WebkitUserSelect: "none",
  userSelect: "none",
};

const ITEM_STEP = BTN_W + BTN_GAP; // 55px per item
const TRACK_PAD = SPAD;

// Spring config — fast & snappy, no wobble
const SNAP_SPRING = { stiffness: 400, damping: 35, mass: 0.6 };

interface CarouselProps {
  children: React.ReactNode;
  activeIndex: number;
  totalCount: number;
}

export function Carousel({ children, activeIndex, totalCount }: CarouselProps) {
  const trackX = useMotionValue(0);
  const springX = useSpring(trackX, SNAP_SPRING);

  // Drag state
  const dragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartVal = useRef(0);
  const velocity = useRef(0);
  const lastX = useRef(0);
  const lastT = useRef(0);

  // Visible area width & max scroll
  const visibleW = VISIBLE * BTN_W + (VISIBLE - 1) * BTN_GAP;
  const totalW = totalCount * BTN_W + (totalCount - 1) * BTN_GAP + TRACK_PAD * 2;
  const maxScroll = Math.max(0, totalW - visibleW);

  // Center the active item
  const getTargetX = useCallback((idx: number) => {
    const centerOffset = visibleW / 2 - BTN_W / 2;
    const raw = idx * ITEM_STEP - centerOffset + TRACK_PAD;
    return -Math.max(0, Math.min(maxScroll, raw));
  }, [visibleW, maxScroll]);

  // Snap to active on mount (instant)
  useEffect(() => {
    const target = getTargetX(activeIndex);
    trackX.jump(target);
    springX.jump(target);
  }, []);

  // Animate to active on change (spring)
  useEffect(() => {
    const target = getTargetX(activeIndex);
    trackX.set(target);
  }, [activeIndex, getTargetX, trackX]);

  // Clamp helper
  const clamp = useCallback((v: number) => {
    return Math.max(-maxScroll, Math.min(0, v));
  }, [maxScroll]);

  // Pointer handlers — unified touch + mouse
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Only handle primary pointer (left click / single touch)
    if (e.button !== 0) return;
    dragging.current = true;
    dragStartX.current = e.clientX;
    dragStartVal.current = trackX.get();
    velocity.current = 0;
    lastX.current = e.clientX;
    lastT.current = performance.now();

    // Stop any running spring animation
    springX.stop();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [trackX, springX]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - dragStartX.current;
    const now = performance.now();
    const dt = now - lastT.current;

    if (dt > 0) {
      velocity.current = (e.clientX - lastX.current) / dt * 1000; // px/sec
    }
    lastX.current = e.clientX;
    lastT.current = now;

    const next = clamp(dragStartVal.current + dx);
    trackX.jump(next);
    springX.jump(next);
  }, [trackX, springX, clamp]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;

    const dx = Math.abs(e.clientX - dragStartX.current);

    // If minimal movement — it's a tap, don't fling
    if (dx < 4) return;

    // Fling: project final position based on velocity
    const current = trackX.get();
    const flingDistance = velocity.current * 0.15; // damped projection
    const projected = clamp(current + flingDistance);

    // Snap to nearest item boundary
    const rawOffset = -projected - TRACK_PAD;
    const nearestIdx = Math.round(rawOffset / ITEM_STEP);
    const snappedIdx = Math.max(0, Math.min(totalCount - VISIBLE, nearestIdx));
    const centerOffset = visibleW / 2 - BTN_W / 2;
    const snapTarget = -(snappedIdx * ITEM_STEP - centerOffset + TRACK_PAD);
    const clampedTarget = clamp(snapTarget);

    trackX.set(clampedTarget);
  }, [trackX, clamp, totalCount, visibleW]);

  return (
    <div style={{
      width: PILL_INNER_W,
      overflow: "hidden",
      position: "relative",
    }}>
      <motion.div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          display: "flex",
          gap: BTN_GAP,
          alignItems: "center",
          paddingInline: TRACK_PAD,
          paddingBlock: SPAD,
          height: BTN_W + SPAD * 2,
          x: springX,
          cursor: "grab",
          touchAction: "none",
          willChange: "transform",
          ...NOTAP,
        }}
      >
        {children}
      </motion.div>
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
  const [pressed, setPressed] = useState(false);

  return (
    <div
      style={{ flexShrink: 0, width: BTN_W, height: BTN_W }}
      onPointerDown={() => !disabled && setPressed(true)}
      onPointerUp={() => { setPressed(false); if (!disabled) onClick?.(); }}
      onPointerCancel={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
    >
      <div
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
          // CSS transform instead of framer-motion whileTap
          transform: pressed && !disabled ? "scale(0.85)" : "scale(1)",
          transition: "transform 0.1s ease, background 0.15s, border 0.15s, box-shadow 0.15s",
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
      </div>
    </div>
  );
}