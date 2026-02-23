// mini-app/src/components/PettingGlove.tsx
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { NOTAP } from "./NavCarousel";

export const GLOVE_FLY = 96;

interface Props {
  petRef: React.RefObject<HTMLDivElement | null>;
  onStroking: (v: boolean) => void;
  isStroking: boolean;
}

export function PettingGlove({ petRef, onStroking, isStroking }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const activePointerId = useRef<number | null>(null);
  const historyRef = useRef<Array<{ x: number; y: number; t: number }>>([]);
  const half = GLOVE_FLY / 2;

  const rawX = useMotionValue(-9999);
  const rawY = useMotionValue(-9999);
  const gX = useSpring(rawX, { stiffness: 700, damping: 32, mass: 0.25 });
  const gY = useSpring(rawY, { stiffness: 700, damping: 32, mass: 0.25 });

  const isOverPet = useCallback((cx: number, cy: number) => {
    const el = petRef.current;
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const pad = 32;
    return cx >= r.left - pad && cx <= r.right + pad
        && cy >= r.top  - pad && cy <= r.bottom + pad;
  }, [petRef]);

  const isMoving = useCallback(() => {
    const h = historyRef.current;
    const now = Date.now();
    while (h.length > 0 && now - h[0].t > 200) h.shift();
    if (h.length < 2) return false;
    let d = 0;
    for (let i = 1; i < h.length; i++)
      d += Math.abs(h[i].x - h[i-1].x) + Math.abs(h[i].y - h[i-1].y);
    return d > 6;
  }, []);

  const setPos = useCallback((cx: number, cy: number) => {
    rawX.set(cx - half);
    rawY.set(cy - half);
  }, [rawX, rawY, half]);

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
    setPos(e.clientX, e.clientY);
    historyRef.current.push({ x: e.clientX, y: e.clientY, t: Date.now() });
    onStroking(isOverPet(e.clientX, e.clientY) && isMoving());
  }, [setPos, isOverPet, isMoving, onStroking]);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    if (activePointerId.current === null || e.pointerId !== activePointerId.current) return;
    activePointerId.current = null;
    historyRef.current = [];
    setIsDragging(false);
    onStroking(false);
    rawX.set(-9999);
    rawY.set(-9999);
  }, [onStroking, rawX, rawY]);

  useEffect(() => {
    if (!isDragging) return;
    window.addEventListener("pointermove",  handlePointerMove,  { passive: false });
    window.addEventListener("pointerup",    handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove",  handlePointerMove);
      window.removeEventListener("pointerup",    handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  const gloveAnim = isStroking
    ? { rotate: [-18, 18, -18], transition: { repeat: Infinity, duration: 0.22, ease: "easeInOut" as const } }
    : { rotate: 0 };

  return (
    <>
      {/* Статичная перчатка в кружке */}
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
            width: 60, height: 60,
            objectFit: "contain",
            pointerEvents: "none",
            opacity: isDragging ? 0.15 : 1,
            transition: "opacity 0.15s",
          }}
        />
      </div>

      {/* Летящая перчатка — через createPortal в body */}
      {isDragging && createPortal(
        <motion.div
          animate={gloveAnim}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: GLOVE_FLY,
            height: GLOVE_FLY,
            x: gX,
            y: gY,
            zIndex: 99999,
            pointerEvents: "none",
            transformOrigin: "center center",
          }}
        >
          <img
            src="/sprites/glove.svg"
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
              filter: isStroking
                ? "drop-shadow(0 4px 20px rgba(249,168,212,0.85))"
                : "drop-shadow(0 4px 14px rgba(0,0,0,0.28))",
              transition: "filter 0.15s",
            }}
          />
        </motion.div>,
        document.body
      )}
    </>
  );
}