import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

const FLY_SIZE = 88;
const HIT_PADDING = 32;
const MOVE_WINDOW_MS = 200;
const MIN_MOVEMENT_PX = 6;

const gloveSrc = `${import.meta.env.BASE_URL}sprites/glove.webp`;

interface Props {
  petRef: RefObject<HTMLDivElement>;
  stroking: boolean;
  onStroking: (v: boolean) => void;
}

/** Drag the glove out of the dock and rub it over the pet to stroke it */
export function PettingGlove({ petRef, stroking, onStroking }: Props) {
  const [dragging, setDragging] = useState(false);
  const pointerId = useRef<number | null>(null);
  const trail = useRef<{ x: number; y: number; t: number }[]>([]);
  const flyRef = useRef<HTMLDivElement>(null);

  const moveFly = (x: number, y: number) => {
    if (flyRef.current) flyRef.current.style.transform = `translate(${x - FLY_SIZE / 2}px, ${y - FLY_SIZE / 2}px)`;
  };

  const overPet = useCallback(
    (x: number, y: number) => {
      const r = petRef.current?.getBoundingClientRect();
      return (
        !!r &&
        x >= r.left - HIT_PADDING &&
        x <= r.right + HIT_PADDING &&
        y >= r.top - HIT_PADDING &&
        y <= r.bottom + HIT_PADDING
      );
    },
    [petRef],
  );

  const isRubbing = () => {
    const now = Date.now();
    const points = (trail.current = trail.current.filter((p) => now - p.t < MOVE_WINDOW_MS));
    let distance = 0;
    for (let i = 1; i < points.length; i++) {
      distance += Math.abs(points[i].x - points[i - 1].x) + Math.abs(points[i].y - points[i - 1].y);
    }
    return distance > MIN_MOVEMENT_PX;
  };

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointerId.current) return;
      e.preventDefault();
      moveFly(e.clientX, e.clientY);
      trail.current.push({ x: e.clientX, y: e.clientY, t: Date.now() });
      onStroking(overPet(e.clientX, e.clientY) && isRubbing());
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== pointerId.current) return;
      pointerId.current = null;
      trail.current = [];
      setDragging(false);
      onStroking(false);
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [dragging, overPet, onStroking]);

  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    pointerId.current = e.pointerId;
    trail.current = [{ x: e.clientX, y: e.clientY, t: Date.now() }];
    setDragging(true);
    requestAnimationFrame(() => moveFly(e.clientX, e.clientY));
  };

  return (
    <>
      <button className="glove" onPointerDown={start} aria-label="Погладить: перетащи перчатку на питомца">
        <img src={gloveSrc} alt="" draggable={false} style={{ opacity: dragging ? 0.2 : 1 }} />
      </button>
      {dragging &&
        createPortal(
          <div ref={flyRef} className={`glove-fly${stroking ? " glove-fly--stroking" : ""}`}>
            <img src={gloveSrc} alt="" draggable={false} />
          </div>,
          document.body,
        )}
    </>
  );
}
