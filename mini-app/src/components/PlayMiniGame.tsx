// mini-app/src/components/PlayMiniGame.tsx
// Tap-игра: поймай мячики за 8 секунд
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PetSVG } from "./PetSVG";
import type { PetType } from "../api/types";

const GAME_SEC = 8;
const NEED_SCORE = 5;

interface Ball { id: number; x: number; y: number; emoji: string }
const BALL_EMOJIS = ["🎾","⚽","🎈","🌟","💫","🏀"];

interface Props {
  petType: PetType;
  onSuccess: () => void;
  onClose: () => void;
}

export function PlayMiniGame({ petType, onSuccess, onClose }: Props) {
  const [phase, setPhase] = useState<"countdown"|"playing"|"win"|"lose">("countdown");
  const [count, setCount] = useState(3);
  const [timer, setTimer] = useState(GAME_SEC);
  const [score, setScore] = useState(0);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [plusFx, setPlusFx] = useState<{ id: number; x: number; y: number }[]>([]);
  const nextId = useRef(0);
  const called = useRef(false);

  // Countdown 3-2-1
  useEffect(() => {
    if (phase !== "countdown") return;
    if (count === 0) { setPhase("playing"); return; }
    const t = setTimeout(() => setCount(c => c - 1), 800);
    return () => clearTimeout(t);
  }, [phase, count]);

  // Timer
  useEffect(() => {
    if (phase !== "playing") return;
    if (timer === 0) {
      setPhase(score >= NEED_SCORE ? "win" : "lose");
      return;
    }
    const t = setInterval(() => setTimer(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [phase, timer, score]);

  // Spawn balls
  useEffect(() => {
    if (phase !== "playing") return;
    const spawn = () => {
      const id = nextId.current++;
      setBalls(b => [...b.slice(-6), {
        id,
        x: 10 + Math.random() * 80,
        y: 10 + Math.random() * 60,
        emoji: BALL_EMOJIS[Math.floor(Math.random() * BALL_EMOJIS.length)],
      }]);
    };
    spawn();
    const t = setInterval(spawn, 900);
    return () => clearInterval(t);
  }, [phase]);

  // Success callback once
  useEffect(() => {
    if (phase === "win" && !called.current) {
      called.current = true;
      setTimeout(onSuccess, 1000);
    }
  }, [phase, onSuccess]);

  const tap = useCallback((ball: Ball, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setBalls(b => b.filter(bb => bb.id !== ball.id));
    setScore(s => s + 1);
    const clientX = "touches" in e ? e.changedTouches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.changedTouches[0].clientY : e.clientY;
    const fxId = Date.now();
    setPlusFx(f => [...f, { id: fxId, x: clientX, y: clientY }]);
    setTimeout(() => setPlusFx(f => f.filter(x => x.id !== fxId)), 600);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(6,6,15,0.94)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 12,
      }}
    >
      {/* Score / timer bar */}
      <div style={{
        width: 300, display: "flex",
        justifyContent: "space-between", alignItems: "center",
        color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 700,
      }}>
        <span>🎯 {score}/{NEED_SCORE}</span>
        {phase === "playing" && (
          <motion.span
            animate={timer <= 3 ? { scale: [1,1.3,1], color: ["#fff","#ff6b6b","#fff"] } : {}}
            transition={{ repeat: Infinity, duration: 0.5 }}
          >
            ⏱ {timer}с
          </motion.span>
        )}
      </div>

      {/* Arena */}
      <div style={{
        width: 300, height: 340, position: "relative",
        background: "linear-gradient(135deg, #1a1a2e, #0d0d1a)",
        borderRadius: 28, border: "1px solid rgba(255,255,255,0.08)",
        overflow: "hidden", userSelect: "none", touchAction: "none",
      }}>
        {/* Pet bottom-center */}
        <div style={{
          position: "absolute", bottom: -10, left: "50%",
          transform: "translateX(-50%)", pointerEvents: "none",
        }}>
          <PetSVG mood={phase === "win" ? "happy" : "content"} petType={petType}
            isReacting={phase === "win"} size={100} />
        </div>

        {/* Countdown */}
        {phase === "countdown" && (
          <AnimatePresence mode="wait">
            <motion.div key={count}
              initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: count === 0 ? 32 : 72, fontWeight: 900,
                color: count === 0 ? "#52c78e" : "#fff",
              }}
            >
              {count === 0 ? "ЛОВИ!" : count}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Balls */}
        {phase === "playing" && balls.map(ball => (
          <motion.div
            key={ball.id}
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={e => tap(ball, e)}
            onTouchEnd={e => tap(ball, e)}
            style={{
              position: "absolute",
              left: `${ball.x}%`, top: `${ball.y}%`,
              transform: "translate(-50%,-50%)",
              fontSize: 36, cursor: "pointer", zIndex: 10,
            }}
          >
            {ball.emoji}
          </motion.div>
        ))}

        {/* Win / Lose */}
        {(phase === "win" || phase === "lose") && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
            style={{
              position: "absolute", inset: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 8,
              background: phase === "win" ? "rgba(82,199,142,0.15)" : "rgba(255,107,107,0.1)",
            }}
          >
            <span style={{ fontSize: 52 }}>{phase === "win" ? "🎉" : "😿"}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>
              {phase === "win" ? "Отлично!" : "Не успел..."}
            </span>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
              Счёт: {score}/{NEED_SCORE}
            </span>
          </motion.div>
        )}
      </div>

      {/* Plus-score FX */}
      {plusFx.map(fx => (
        <motion.div key={fx.id}
          initial={{ opacity: 1, y: 0, x: fx.x, position: "fixed" as const }}
          animate={{ opacity: 0, y: fx.y - 50 }}
          style={{ position: "fixed", top: 0, left: 0, x: fx.x, y: fx.y - 10,
            fontSize: 18, fontWeight: 900, color: "#ffd700",
            pointerEvents: "none", zIndex: 300 }}
        >+1</motion.div>
      ))}

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