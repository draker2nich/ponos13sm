// mini-app/src/components/PettingGlove.tsx
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { NOTAP } from "./NavCarousel";

export const GLOVE_FLY = 52;

interface Props {
  petRef: React.RefObject<HTMLDivElement | null>;
  onStroking: (v: boolean) => void;
  isStroking: boolean;
}

export function PettingGlove({ petRef, onStroking, isStroking }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const activePointerId = useRef<number | null>(null);
  const historyRef = useRef<Array<{ x: number; y: number; t: number }>>([]);

  const rawX = useMotionValue(-9999);
  const rawY = useMotionValue(-9999);
  const gX = useSpring(rawX, { stiffness: 600, damping: 30, mass: 0.3 });
  const gY = useSpring(rawY, { stiffness: 600, damping: 30, mass: 0.3 });
  const half = GLOVE_FLY / 2;

  const isOverPet = useCallback((cx: number, cy: number) => {
    const el = petRef.current;
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const pad = 28;
    return cx >= r.left - pad && cx <= r.right + pad && cy >= r.top - pad && cy <= r.bottom + pad;
  }, [petRef]);

  const isMoving = useCallback(() => {
    const h = historyRef.current;
    const now = Date.now();
    while (h.length > 0 && now - h[0].t > 200) h.shift();
    if (h.length < 2) return false;
    let d = 0;
    for (let i = 1; i < h.length; i++) d += Math.abs(h[i].x - h[i - 1].x) + Math.abs(h[i].y - h[i - 1].y);
    return d > 6;
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    activePointerId.current = e.pointerId;
    historyRef.current = [{ x: e.clientX, y: e.clientY, t: Date.now() }];
    rawX.jump(e.clientX - half);
    rawY.jump(e.clientY - half);
    gX.jump(e.clientX - half);
    gY.jump(e.clientY - half);
    setIsDragging(true);
    onStroking(false);
  }, [rawX, rawY, gX, gY, half, onStroking]);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (activePointerId.current === null || e.pointerId !== activePointerId.current) return;
    e.preventDefault();
    rawX.set(e.clientX - half);
    rawY.set(e.clientY - half);
    historyRef.current.push({ x: e.clientX, y: e.clientY, t: Date.now() });
    onStroking(isOverPet(e.clientX, e.clientY) && isMoving());
  }, [isOverPet, isMoving, onStroking, rawX, rawY, half]);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    if (activePointerId.current === null || e.pointerId !== activePointerId.current) return;
    activePointerId.current = null;
    historyRef.current = [];
    setIsDragging(false);
    onStroking(false);
  }, [onStroking]);

  useEffect(() => {
    if (!isDragging) return;
    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  const gloveAnim = isStroking
    ? { rotate: [-15, 15, -15], transition: { repeat: Infinity, duration: 0.25, ease: "easeInOut" as const } }
    : { rotate: 0 };

  return (
    <>
      {/* Static glove shown in the pill button */}
      <div
        onPointerDown={handlePointerDown}
        style={{
          position: "absolute", inset: 0, zIndex: 2,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: isDragging ? "grabbing" : "grab",
          touchAction: "none", ...NOTAP,
        }}
      >
        <img
          src="/sprites/glove.svg"
          draggable={false}
          style={{
            width: 64, height: 64, objectFit: "contain",
            pointerEvents: "none",
            opacity: isDragging ? 0.25 : 1,
            transition: "opacity 0.15s",
          }}
        />
      </div>

      {/* Flying glove while dragging */}
      {isDragging && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, pointerEvents: "none" }}>
          <motion.div
            animate={gloveAnim}
            style={{
              position: "fixed", top: 0, left: 0,
              width: GLOVE_FLY, height: GLOVE_FLY,
              x: gX, y: gY,
              pointerEvents: "none",
              transformOrigin: "center center",
              overflow: "visible",
            }}
          >
            <img
              src="/sprites/glove.svg"
              draggable={false}
              style={{
                width: "200%", height: "200%",
                objectFit: "contain",
                position: "absolute", top: "-50%", left: "-50%",
                filter: isStroking
                  ? "drop-shadow(0 4px 16px rgba(249,168,212,0.6))"
                  : "drop-shadow(0 4px 12px rgba(0,0,0,0.14))",
                transition: "filter 0.2s",
              }}
            />
          </motion.div>
        </div>
      )}
    </>
  );
}