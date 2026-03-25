// mini-app/src/components/PettingGlove.tsx
// Rewritten: no framer-motion springs, direct transform via ref
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
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
  const flyRef = useRef<HTMLDivElement>(null);
  const half = GLOVE_FLY / 2;

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

  // Direct DOM manipulation — zero React re-renders during drag
  const setFlyPos = useCallback((cx: number, cy: number) => {
    if (flyRef.current) {
      flyRef.current.style.transform = `translate(${cx - half}px, ${cy - half}px)`;
    }
  }, [half]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    activePointerId.current = e.pointerId;
    historyRef.current = [{ x: e.clientX, y: e.clientY, t: Date.now() }];
    setIsDragging(true);
    onStroking(false);
    // Set initial position immediately
    requestAnimationFrame(() => setFlyPos(e.clientX, e.clientY));
  }, [onStroking, setFlyPos]);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (activePointerId.current === null || e.pointerId !== activePointerId.current) return;
    e.preventDefault();
    setFlyPos(e.clientX, e.clientY);
    historyRef.current.push({ x: e.clientX, y: e.clientY, t: Date.now() });
    onStroking(isOverPet(e.clientX, e.clientY) && isMoving());
  }, [setFlyPos, isOverPet, isMoving, onStroking]);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    if (activePointerId.current === null || e.pointerId !== activePointerId.current) return;
    activePointerId.current = null;
    historyRef.current = [];
    setIsDragging(false);
    onStroking(false);
  }, [onStroking]);

  useEffect(() => {
    if (!isDragging) return;
    const opts = { passive: false } as AddEventListenerOptions;
    window.addEventListener("pointermove", handlePointerMove, opts);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  return (
    <>
      {/* Static glove in circle */}
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
            transition: "opacity 0.1s",
          }}
        />
      </div>

      {/* Flying glove — direct DOM transform, no React state updates */}
      {isDragging && createPortal(
        <div
          ref={flyRef}
          style={{
            position: "fixed",
            top: 0, left: 0,
            width: GLOVE_FLY,
            height: GLOVE_FLY,
            zIndex: 99999,
            pointerEvents: "none",
            // No transition — direct transform updates from pointermove
            willChange: "transform",
          }}
        >
          <img
            src="/sprites/glove.svg"
            draggable={false}
            style={{
              width: "100%", height: "100%",
              objectFit: "contain", display: "block",
              filter: isStroking
                ? "drop-shadow(0 4px 16px rgba(249,168,212,0.80))"
                : "drop-shadow(0 4px 10px rgba(0,0,0,0.25))",
              transition: "filter 0.15s",
              animation: isStroking ? "glove-stroke 0.22s ease-in-out infinite alternate" : "none",
            }}
          />
        </div>,
        document.body
      )}
    </>
  );
}