// mini-app/src/components/PettingGlove.tsx
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { NOTAP } from "./NavCarousel";

// Размер летящей перчатки — достаточно большой чтобы быть видимым
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

  // Позиция курсора (центр перчатки) — без вычета half
  const rawX = useMotionValue(-9999);
  const rawY = useMotionValue(-9999);
  // Плавное следование за курсором
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

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    activePointerId.current = e.pointerId;
    historyRef.current = [{ x: e.clientX, y: e.clientY, t: Date.now() }];
    // Прыжок в точку курсора (перчатка центрируется на курсоре через translate)
    rawX.jump(e.clientX);
    rawY.jump(e.clientY);
    gX.jump(e.clientX);
    gY.jump(e.clientY);
    setIsDragging(true);
    onStroking(false);
  }, [rawX, rawY, gX, gY, onStroking]);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (activePointerId.current === null || e.pointerId !== activePointerId.current) return;
    e.preventDefault();
    rawX.set(e.clientX);
    rawY.set(e.clientY);
    historyRef.current.push({ x: e.clientX, y: e.clientY, t: Date.now() });
    onStroking(isOverPet(e.clientX, e.clientY) && isMoving());
  }, [isOverPet, isMoving, onStroking, rawX, rawY]);

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
    window.addEventListener("pointerup",    handlePointerUp);
    window.addEventListener("pointercancel",handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup",    handlePointerUp);
      window.removeEventListener("pointercancel",handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  const gloveAnim = isStroking
    ? { rotate: [-18, 18, -18], transition: { repeat: Infinity, duration: 0.22, ease: "easeInOut" as const } }
    : { rotate: 0 };

  return (
    <>
      {/* ── Статичная перчатка внутри кнопки ── */}
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
            width: 40, height: 40, objectFit: "contain",
            pointerEvents: "none",
            opacity: isDragging ? 0.20 : 1,
            transition: "opacity 0.15s",
          }}
        />
      </div>

      {/* ── Летящая перчатка ── */}
      {isDragging && (
        // Слой на весь экран, не перехватывает события (pointerEvents: none)
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          pointerEvents: "none", overflow: "visible",
        }}>
          <motion.div
            animate={gloveAnim}
            style={{
              position: "absolute",
              top: 0, left: 0,
              // Центрируем перчатку относительно курсора через translate
              x: gX,
              y: gY,
              translateX: "-50%",
              translateY: "-50%",
              width: GLOVE_FLY,
              height: GLOVE_FLY,
              pointerEvents: "none",
              transformOrigin: "center center",
            }}
          >
            <img
              src="/sprites/glove.svg"
              draggable={false}
              style={{
                width: "100%", height: "100%",
                objectFit: "contain",
                filter: isStroking
                  ? "drop-shadow(0 4px 20px rgba(249,168,212,0.75))"
                  : "drop-shadow(0 4px 14px rgba(0,0,0,0.22))",
                transition: "filter 0.15s",
              }}
            />
          </motion.div>
        </div>
      )}
    </>
  );
}