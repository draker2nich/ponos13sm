// mini-app/src/components/FeedMiniGame.tsx
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PetSVG } from "./PetSVG";
import type { PetType } from "../api/types";

const FOODS = ["🍎", "🍗", "🥕", "🐟", "🧁", "🍖", "🥩", "🫐"];

interface Props {
  petType: PetType;
  onSuccess: () => void;
  onClose: () => void;
}

export function FeedMiniGame({ petType, onSuccess, onClose }: Props) {
  const [food]    = useState(() => FOODS[Math.floor(Math.random() * FOODS.length)]);
  const [dragging, setDragging] = useState(false);
  const [dragPos,  setDragPos]  = useState({ x: 15, y: 75 });
  const [fed,      setFed]      = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const checkHit = useCallback((cx: number, cy: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return false;
    const rx = ((cx - rect.left) / rect.width)  * 100;
    const ry = ((cy - rect.top)  / rect.height) * 100;
    return rx > 28 && rx < 72 && ry > 22 && ry < 68;
  }, []);

  const updatePos = useCallback((cx: number, cy: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragPos({
      x: ((cx - rect.left) / rect.width)  * 100,
      y: ((cy - rect.top)  / rect.height) * 100,
    });
  }, []);

  const drop = useCallback((cx: number, cy: number) => {
    setDragging(false);
    if (checkHit(cx, cy)) {
      setFed(true);
      setTimeout(onSuccess, 750);
    } else {
      setDragPos({ x: 15, y: 75 });
    }
  }, [checkHit, onSuccess]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(6,6,15,0.94)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 16,
      }}
    >
      <motion.p
        initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, fontWeight: 600 }}
      >
        Перетащи еду питомцу!
      </motion.p>

      <div
        ref={containerRef}
        onMouseMove={e => { if (dragging) updatePos(e.clientX, e.clientY); }}
        onMouseUp={e   => { if (dragging) drop(e.clientX, e.clientY); }}
        onTouchMove={e => { if (dragging) { e.preventDefault(); const t = e.touches[0]; updatePos(t.clientX, t.clientY); }}}
        onTouchEnd={e  => { if (dragging) { const t = e.changedTouches[0]; drop(t.clientX, t.clientY); }}}
        style={{
          width: 300, height: 340, position: "relative",
          background: "linear-gradient(135deg, #1a1a2e, #0d0d1a)",
          borderRadius: 28,
          border: "1px solid rgba(255,255,255,0.08)",
          overflow: "hidden", userSelect: "none",
          touchAction: "none",
        }}
      >
        {/* pet */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -52%)", pointerEvents: "none",
        }}>
          <PetSVG mood={fed ? "happy" : "hungry"} petType={petType} isReacting={fed} size={130} />
        </div>

        {/* drop-zone hint */}
        <AnimatePresence>
          {!fed && (
            <motion.div
              animate={{ opacity: [0.2, 0.55, 0.2] }}
              transition={{ repeat: Infinity, duration: 1.6 }}
              style={{
                position: "absolute",
                top: "22%", left: "25%", width: "50%", height: "42%",
                border: "2px dashed rgba(244,162,97,0.4)",
                borderRadius: 22, pointerEvents: "none",
              }}
            />
          )}
        </AnimatePresence>

        {/* food draggable */}
        {!fed && (
          <motion.div
            style={{
              position: "absolute",
              left: `${dragging ? dragPos.x : 15}%`,
              top:  `${dragging ? dragPos.y : 75}%`,
              transform: "translate(-50%,-50%)",
              fontSize: 36, cursor: dragging ? "grabbing" : "grab",
              zIndex: 10, touchAction: "none",
              filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.6))",
            }}
            animate={!dragging ? { scale: [1, 1.1, 1] } : { scale: 1.25 }}
            transition={{ repeat: Infinity, duration: 1 }}
            onMouseDown={e => { e.preventDefault(); setDragging(true); updatePos(e.clientX, e.clientY); }}
            onTouchStart={e => { e.preventDefault(); setDragging(true); const t = e.touches[0]; updatePos(t.clientX, t.clientY); }}
          >
            {food}
          </motion.div>
        )}

        {/* success overlay */}
        <AnimatePresence>
          {fed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                position: "absolute", inset: 0, display: "flex",
                alignItems: "center", justifyContent: "center",
                background: "rgba(82,199,142,0.15)",
                fontSize: 52,
              }}
            >
              😋
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        onClick={onClose}
        style={{
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.15)",
          color: "rgba(255,255,255,0.4)",
          borderRadius: 12, padding: "8px 24px",
          cursor: "pointer", fontSize: 13,
        }}
      >
        Закрыть
      </button>
    </motion.div>
  );
}