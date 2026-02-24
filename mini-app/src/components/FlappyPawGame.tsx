// mini-app/src/components/FlappyPawGame.tsx
// Flappy-style: лапка летит через щели, тап = взмах.
// Монетки собираются в щелях. Чем дальше — тем больше монет.
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCoinStore } from "../store/useCoinStore";

const W = 300, H = 460;
const BIRD_X = 70, BIRD_R = 16;
const GRAVITY = 0.45;
const FLAP_VEL = -7;
const PIPE_W = 52;
const GAP_H = 130;
const PIPE_SPEED = 2.8;
const PIPE_INTERVAL = 100; // frames between pipes
const COIN_R = 12;

interface Pipe { id: number; x: number; topH: number; scored: boolean; coinCollected: boolean }

interface Props { onClose: () => void }

export function FlappyPawGame({ onClose }: Props) {
  const addCoins = useCoinStore(s => s.addCoins);
  const [phase, setPhase] = useState<"ready" | "playing" | "dead" | "result">("ready");
  const [birdY, setBirdY] = useState(H / 2);
  const [birdVy, setBirdVy] = useState(0);
  const [birdAngle, setBirdAngle] = useState(0);
  const [pipes, setPipes] = useState<Pipe[]>([]);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [best, setBest] = useState(0);

  const frameRef = useRef(0);
  const pipeTimer = useRef(0);
  const pipeId = useRef(0);
  const byRef = useRef(H / 2);
  const vyRef = useRef(0);
  const pipesRef = useRef<Pipe[]>([]);
  const scoreRef = useRef(0);
  const coinsRef = useRef(0);
  const alive = useRef(true);
  const raf = useRef(0);

  const reset = useCallback(() => {
    byRef.current = H / 2;
    vyRef.current = 0;
    pipesRef.current = [];
    scoreRef.current = 0;
    coinsRef.current = 0;
    pipeTimer.current = 0;
    pipeId.current = 0;
    alive.current = true;
    setBirdY(H / 2); setBirdVy(0); setBirdAngle(0);
    setPipes([]); setScore(0); setCoins(0);
  }, []);

  const flap = useCallback(() => {
    if (phase === "ready") { reset(); setPhase("playing"); return; }
    if (phase === "dead") { reset(); setPhase("ready"); return; }
    if (phase === "result") return;
    if (!alive.current) return;
    vyRef.current = FLAP_VEL;
  }, [phase, reset]);

  // Game loop
  useEffect(() => {
    if (phase !== "playing") return;
    alive.current = true;

    const loop = () => {
      if (!alive.current) return;

      // Bird physics
      vyRef.current += GRAVITY;
      byRef.current += vyRef.current;
      const angle = Math.max(-30, Math.min(70, vyRef.current * 4));

      // Spawn pipes
      pipeTimer.current++;
      if (pipeTimer.current >= PIPE_INTERVAL) {
        pipeTimer.current = 0;
        const minTop = 50;
        const maxTop = H - GAP_H - 50;
        const topH = minTop + Math.random() * (maxTop - minTop);
        pipesRef.current = [...pipesRef.current, {
          id: pipeId.current++, x: W + 10, topH, scored: false, coinCollected: false,
        }];
      }

      // Move pipes & check
      const bx = BIRD_X, by = byRef.current;
      let dead = false;
      let newScore = scoreRef.current;
      let newCoins = coinsRef.current;

      pipesRef.current = pipesRef.current
        .map(p => {
          const np = { ...p, x: p.x - PIPE_SPEED };

          // Score
          if (!np.scored && np.x + PIPE_W < bx) {
            np.scored = true;
            newScore++;
          }

          // Coin in gap center
          if (!np.coinCollected) {
            const coinX = np.x + PIPE_W / 2;
            const coinY = np.topH + GAP_H / 2;
            const dist = Math.sqrt((bx - coinX) ** 2 + (by - coinY) ** 2);
            if (dist < BIRD_R + COIN_R) {
              np.coinCollected = true;
              newCoins++;
            }
          }

          // Collision with pipes
          if (bx + BIRD_R > np.x && bx - BIRD_R < np.x + PIPE_W) {
            if (by - BIRD_R < np.topH || by + BIRD_R > np.topH + GAP_H) {
              dead = true;
            }
          }

          return np;
        })
        .filter(p => p.x > -PIPE_W - 20);

      scoreRef.current = newScore;
      coinsRef.current = newCoins;

      // Floor / ceiling
      if (by > H - BIRD_R || by < BIRD_R) dead = true;

      if (dead) {
        alive.current = false;
        setBirdY(byRef.current); setBirdVy(vyRef.current); setBirdAngle(angle);
        setPipes([...pipesRef.current]);
        setScore(scoreRef.current); setCoins(coinsRef.current);
        setBest(b => Math.max(b, scoreRef.current));
        setPhase("dead");
        setTimeout(() => {
          const earned = coinsRef.current + Math.floor(scoreRef.current / 3);
          if (earned > 0) addCoins(earned);
          setPhase("result");
        }, 1200);
        return;
      }

      setBirdY(byRef.current); setBirdVy(vyRef.current); setBirdAngle(angle);
      setPipes([...pipesRef.current]);
      setScore(scoreRef.current); setCoins(coinsRef.current);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [phase, addCoins]);

  const earned = coins + Math.floor(score / 3);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "#06060f",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 10,
        touchAction: "none", userSelect: "none",
      }}
      onMouseDown={flap}
      onTouchStart={e => { e.preventDefault(); flap(); }}
    >
      {/* HUD */}
      <div style={{
        width: W, display: "flex", justifyContent: "space-between",
        color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 700,
      }}>
        <span>🪙 {coins}</span>
        <span style={{ fontSize: 20 }}>{score}</span>
        <span style={{ color: "rgba(255,255,255,0.3)" }}>🏆 {best}</span>
      </div>

      {/* Canvas */}
      <div style={{
        width: W, height: H, position: "relative",
        background: "linear-gradient(180deg, #1a2a4a 0%, #0d1525 60%, #1a3020 100%)",
        borderRadius: 24, overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        {/* Stars bg */}
        {[...Array(15)].map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            left: `${(i * 37) % 100}%`, top: `${(i * 23 + 10) % 60}%`,
            width: 2, height: 2, borderRadius: "50%",
            background: `rgba(255,255,255,${0.1 + (i % 3) * 0.15})`,
          }} />
        ))}

        {/* Ground */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 4,
          background: "linear-gradient(90deg, #2d5a3d, #3a7a4d)",
        }} />

        {/* Pipes */}
        {pipes.map(p => (
          <div key={p.id}>
            {/* Top pipe */}
            <div style={{
              position: "absolute", left: p.x, top: 0,
              width: PIPE_W, height: p.topH,
              background: "linear-gradient(180deg, #2d7a3d, #1a5a2a)",
              borderRadius: "0 0 8px 8px",
              boxShadow: "inset -4px 0 0 rgba(0,0,0,0.15), inset 4px 0 0 rgba(255,255,255,0.08)",
            }}>
              {/* Lip */}
              <div style={{
                position: "absolute", bottom: -4, left: -4,
                width: PIPE_W + 8, height: 12,
                background: "linear-gradient(180deg, #3a9a4d, #2d7a3d)",
                borderRadius: 4,
              }} />
            </div>

            {/* Bottom pipe */}
            <div style={{
              position: "absolute", left: p.x, top: p.topH + GAP_H,
              width: PIPE_W, height: H - p.topH - GAP_H,
              background: "linear-gradient(180deg, #2d7a3d, #1a5a2a)",
              borderRadius: "8px 8px 0 0",
              boxShadow: "inset -4px 0 0 rgba(0,0,0,0.15), inset 4px 0 0 rgba(255,255,255,0.08)",
            }}>
              <div style={{
                position: "absolute", top: -4, left: -4,
                width: PIPE_W + 8, height: 12,
                background: "linear-gradient(180deg, #3a9a4d, #2d7a3d)",
                borderRadius: 4,
              }} />
            </div>

            {/* Coin */}
            {!p.coinCollected && (
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                style={{
                  position: "absolute",
                  left: p.x + PIPE_W / 2 - COIN_R,
                  top: p.topH + GAP_H / 2 - COIN_R,
                  width: COIN_R * 2, height: COIN_R * 2,
                  fontSize: COIN_R * 1.6, lineHeight: `${COIN_R * 2}px`,
                  textAlign: "center",
                  filter: "drop-shadow(0 0 6px rgba(255,215,0,0.6))",
                }}
              >🪙</motion.div>
            )}
          </div>
        ))}

        {/* Bird */}
        <div style={{
          position: "absolute",
          left: BIRD_X - BIRD_R, top: birdY - BIRD_R,
          width: BIRD_R * 2, height: BIRD_R * 2,
          fontSize: BIRD_R * 1.8, lineHeight: `${BIRD_R * 2}px`,
          textAlign: "center",
          transform: `rotate(${birdAngle}deg)`,
          filter: phase === "dead" ? "grayscale(1)" : "drop-shadow(0 2px 6px rgba(0,0,0,0.4))",
          transition: "filter 0.3s",
        }}>🐾</div>

        {/* Ready screen */}
        {phase === "ready" && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 10,
          }}>
            <span style={{ fontSize: 48 }}>🐾</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>Flappy Paw</span>
            <motion.span
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 1 }}
              style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}
            >Тапни чтобы лететь!</motion.span>
          </div>
        )}

        {/* Result */}
        {phase === "result" && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
            style={{
              position: "absolute", inset: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 10,
              background: "rgba(0,0,0,0.75)",
            }}
          >
            <span style={{ fontSize: 44 }}>{score >= 10 ? "🌟" : score >= 5 ? "⭐" : "💫"}</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>Game Over</span>
            <div style={{
              display: "flex", flexDirection: "column", gap: 5,
              background: "rgba(255,255,255,0.06)", borderRadius: 16, padding: "14px 24px",
              border: "1px solid rgba(255,255,255,0.08)",
            }}>
              <Row label="Счёт" value={`${score}`} />
              <Row label="Монеты собрано" value={`${coins}`} color="#ffd700" />
              <Row label="Бонус за счёт" value={`+${Math.floor(score / 3)}`} />
              <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "2px 0" }} />
              <Row label="Итого монет" value={`+${earned} 🪙`} color="#ffd700" />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={e => { e.stopPropagation(); reset(); setPhase("ready"); }}
                style={{ ...closeBtnStyle, borderColor: "rgba(100,200,100,0.3)", color: "rgba(100,200,100,0.7)" }}>
                Ещё раз
              </button>
              <button onClick={e => { e.stopPropagation(); onClose(); }} style={closeBtnStyle}>
                Выйти
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {phase !== "result" && (
        <button onClick={e => { e.stopPropagation(); onClose(); }} style={closeBtnStyle}>
          Закрыть
        </button>
      )}
    </motion.div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 28 }}>
      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: color ?? "rgba(255,255,255,0.8)" }}>{value}</span>
    </div>
  );
}

const closeBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.15)",
  color: "rgba(255,255,255,0.4)",
  borderRadius: 12, padding: "8px 24px",
  cursor: "pointer", fontSize: 13, fontFamily: "inherit",
};