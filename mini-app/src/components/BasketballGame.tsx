// mini-app/src/components/BasketballGame.tsx
// Свайп-баскетбол v2: ветер, сужающаяся корзина, бонусные мячи, уровни сложности
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCoinStore } from "../store/useCoinStore";

const W = 320, H = 480;
const BALL_R = 18;
const BASE_HOOP_W = 68, HOOP_Y = 90;
const GRAVITY = 0.38;
const GAME_SEC = 30;
const MAX_BALLS = 15;

interface Ball {
  id: number; x: number; y: number;
  vx: number; vy: number;
  scored: boolean; missed: boolean;
  golden: boolean;
}

interface ScoreFx { id: number; x: number; y: number; text: string; color: string }
interface WindFx { dir: number; strength: number }

interface Props { onClose: () => void }

export function BasketballGame({ onClose }: Props) {
  const addCoins = useCoinStore(s => s.addCoins);
  const [phase, setPhase] = useState<"ready" | "playing" | "result">("ready");
  const [timer, setTimer] = useState(GAME_SEC);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [made, setMade] = useState(0);
  const [thrown, setThrown] = useState(0);
  const [hoopX, setHoopX] = useState(W / 2);
  const [hoopW, setHoopW] = useState(BASE_HOOP_W);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [fxs, setFxs] = useState<ScoreFx[]>([]);
  const [earned, setEarned] = useState(0);
  const [wind, setWind] = useState<WindFx>({ dir: 0, strength: 0 });
  const [level, setLevel] = useState(1);

  const swipeStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const ballId = useRef(0);
  const fxId = useRef(0);
  const hoopDir = useRef(1);
  const canvasRef = useRef<HTMLDivElement>(null);
  const windRef = useRef<WindFx>({ dir: 0, strength: 0 });
  const scoreRef = useRef(0);
  const madeRef = useRef(0);

  const startGame = useCallback(() => {
    if (phase !== "ready") return;
    setPhase("playing");
  }, [phase]);

  // Timer
  useEffect(() => {
    if (phase !== "playing") return;
    const t = setInterval(() => {
      setTimer(s => {
        if (s <= 1) { setPhase("result"); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Difficulty scaling
  useEffect(() => {
    if (phase !== "playing") return;
    const t = setInterval(() => {
      const m = madeRef.current;
      const newLevel = m >= 15 ? 5 : m >= 10 ? 4 : m >= 6 ? 3 : m >= 3 ? 2 : 1;
      setLevel(newLevel);
      // Shrink hoop
      setHoopW(Math.max(40, BASE_HOOP_W - (newLevel - 1) * 5));
    }, 500);
    return () => clearInterval(t);
  }, [phase]);

  // Wind changes
  useEffect(() => {
    if (phase !== "playing") return;
    const t = setInterval(() => {
      if (level >= 2) {
        const str = (level - 1) * 0.08 + Math.random() * 0.12;
        const dir = Math.random() > 0.5 ? 1 : -1;
        windRef.current = { dir, strength: str };
        setWind({ dir, strength: str });
      }
    }, 3000);
    return () => clearInterval(t);
  }, [phase, level]);

  // Move hoop
  useEffect(() => {
    if (phase !== "playing") return;
    const baseSpeed = 2 + level * 0.5;
    const t = setInterval(() => {
      setHoopX(x => {
        let nx = x + hoopDir.current * (baseSpeed + Math.random() * 1.5);
        if (nx > W - hoopW / 2 - 10) { hoopDir.current = -1; nx = W - hoopW / 2 - 10; }
        if (nx < hoopW / 2 + 10) { hoopDir.current = 1; nx = hoopW / 2 + 10; }
        return nx;
      });
    }, 30);
    return () => clearInterval(t);
  }, [phase, level, hoopW]);

  // Physics loop
  useEffect(() => {
    if (phase !== "playing") return;
    let raf = 0;
    const loop = () => {
      setBalls(prev => {
        const next: Ball[] = [];
        for (const b of prev) {
          if (b.scored || b.missed) { next.push(b); continue; }
          const w = windRef.current;
          const nx = b.x + b.vx + w.dir * w.strength;
          const ny = b.y + b.vy;
          const nvy = b.vy + GRAVITY;

          if (ny <= HOOP_Y + 12 && ny + nvy >= HOOP_Y - 4) {
            const dist = Math.abs(nx - hoopX);
            if (dist < hoopW / 2 - 4) {
              const perfect = dist < 6;
              const basePts = perfect ? 3 : 2;
              const goldenMult = b.golden ? 3 : 1;
              const streakMult = 1 + Math.floor(streak / 3) * 0.5;
              const levelMult = 1 + (level - 1) * 0.15;
              const total = Math.round(basePts * streakMult * levelMult * goldenMult);
              scoreRef.current += total;
              setScore(scoreRef.current);
              setStreak(s => { const n = s + 1; setMaxStreak(m => Math.max(m, n)); return n; });
              madeRef.current++;
              setMade(madeRef.current);
              const fid = fxId.current++;
              const label = b.golden ? `+${total} ⭐` : perfect ? `+${total} 🔥` : `+${total}`;
              setFxs(f => [...f.slice(-4), {
                id: fid, x: nx, y: HOOP_Y, text: label,
                color: b.golden ? "#ffd700" : perfect ? "#ffd700" : "#fff",
              }]);
              setTimeout(() => setFxs(f => f.filter(ff => ff.id !== fid)), 800);
              next.push({ ...b, x: nx, y: HOOP_Y, vy: 2, scored: true });
              continue;
            }
          }

          if (ny > H + 40 || nx < -30 || nx > W + 30) {
            if (!b.scored) setStreak(0);
            continue;
          }
          next.push({ ...b, x: nx, y: ny, vx: b.vx * 0.998, vy: nvy });
        }
        return next;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, streak, hoopX, hoopW, level]);

  // Swipe handlers
  const handleStart = useCallback((cx: number, cy: number) => {
    if (phase === "ready") { startGame(); return; }
    if (phase !== "playing") return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ry = cy - rect.top;
    if (ry < H * 0.5) return;
    swipeStart.current = { x: cx - rect.left, y: ry, t: performance.now() };
  }, [phase, startGame]);

  const handleEnd = useCallback((cx: number, cy: number) => {
    if (!swipeStart.current || phase !== "playing") return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ex = cx - rect.left;
    const ey = cy - rect.top;
    const dx = ex - swipeStart.current.x;
    const dy = ey - swipeStart.current.y;
    const dt = performance.now() - swipeStart.current.t;
    swipeStart.current = null;

    if (dy > -30 || dt > 800) return;

    const speed = Math.min(18, Math.sqrt(dx * dx + dy * dy) / dt * 12);
    const angle = Math.atan2(dy, dx);
    const vx = Math.cos(angle) * speed * 0.6;
    const vy = Math.sin(angle) * speed;

    const id = ballId.current++;
    setThrown(n => n + 1);
    // Golden ball — 10% chance at level 3+
    const golden = level >= 3 && Math.random() < 0.10;
    setBalls(b => [...b.slice(-(MAX_BALLS - 1)), {
      id, x: W / 2 + dx * 0.3, y: H - 60,
      vx, vy: Math.min(-6, vy),
      scored: false, missed: false, golden,
    }]);
  }, [phase, level]);

  // Result
  useEffect(() => {
    if (phase !== "result") return;
    const accuracy = thrown > 0 ? made / thrown : 0;
    const accBonus = accuracy > 0.7 ? 1.5 : accuracy > 0.5 ? 1.2 : 1;
    const raw = Math.floor(score / 8);
    const c = Math.max(0, Math.floor(raw * accBonus));
    setEarned(c);
    if (c > 0) addCoins(c);
  }, [phase, score, made, thrown, addCoins]);

  const windArrow = wind.strength > 0.05
    ? (wind.dir > 0 ? "→" : "←")
    : "";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "linear-gradient(180deg, #0a1628, #06060f)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 10,
        touchAction: "none", userSelect: "none",
      }}
    >
      {/* HUD */}
      <div style={{
        width: W, display: "flex", justifyContent: "space-between",
        color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 700,
      }}>
        <span>🏀 {score}</span>
        {phase === "playing" && (
          <>
            <span style={{ color: timer <= 5 ? "#ff6b6b" : undefined }}>⏱ {timer}с</span>
            {windArrow && (
              <span style={{ color: "rgba(150,200,255,0.7)", fontSize: 12 }}>
                💨 {windArrow}{Math.round(wind.strength * 100)}%
              </span>
            )}
          </>
        )}
        {streak > 1 && <span style={{ color: "#ffd700" }}>🔥{streak}</span>}
      </div>

      {/* Level indicator */}
      {phase === "playing" && level > 1 && (
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 700 }}>
          Уровень {level}
        </div>
      )}

      {/* Canvas */}
      <div
        ref={canvasRef}
        onMouseDown={e => handleStart(e.clientX, e.clientY)}
        onMouseUp={e => handleEnd(e.clientX, e.clientY)}
        onTouchStart={e => { const t = e.touches[0]; handleStart(t.clientX, t.clientY); }}
        onTouchEnd={e => { const t = e.changedTouches[0]; handleEnd(t.clientX, t.clientY); }}
        style={{
          width: W, height: H, position: "relative",
          background: "linear-gradient(180deg, #0d1b3e, #162040)",
          borderRadius: 24, border: "1px solid rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}
      >
        {/* Backboard */}
        <div style={{
          position: "absolute", top: HOOP_Y - 40, left: hoopX - 4,
          width: 8, height: 44, background: "rgba(255,255,255,0.12)",
          borderRadius: 3, transition: "left 0.03s linear",
        }} />

        {/* Hoop — dynamic width */}
        <div style={{
          position: "absolute", top: HOOP_Y - 4,
          left: hoopX - hoopW / 2,
          width: hoopW, height: 8,
          borderRadius: 4,
          background: "linear-gradient(90deg, #ff6b35, #ff4500)",
          boxShadow: "0 2px 12px rgba(255,69,0,0.4)",
          transition: "left 0.03s linear, width 0.5s ease",
        }} />

        {/* Net */}
        <div style={{
          position: "absolute", top: HOOP_Y + 4, left: hoopX - hoopW / 2 + 8,
          width: hoopW - 16, height: 28,
          borderLeft: "2px dashed rgba(255,255,255,0.12)",
          borderRight: "2px dashed rgba(255,255,255,0.12)",
          borderBottom: "2px dashed rgba(255,255,255,0.08)",
          borderRadius: "0 0 8px 8px",
          transition: "left 0.03s linear, width 0.5s ease",
        }} />

        {/* Wind particles */}
        {wind.strength > 0.05 && phase === "playing" && [...Array(5)].map((_, i) => (
          <motion.div key={`wind-${i}`}
            animate={{
              x: [wind.dir > 0 ? -20 : W + 20, wind.dir > 0 ? W + 20 : -20],
              opacity: [0, 0.3, 0],
            }}
            transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.4 }}
            style={{
              position: "absolute",
              top: 60 + i * 80,
              width: 20 + wind.strength * 40, height: 1,
              background: "rgba(150,200,255,0.3)",
              borderRadius: 1,
            }}
          />
        ))}

        {/* Balls */}
        {balls.map(b => (
          <div key={b.id} style={{
            position: "absolute",
            left: b.x - BALL_R, top: b.y - BALL_R,
            width: BALL_R * 2, height: BALL_R * 2,
            fontSize: BALL_R * 1.8, lineHeight: `${BALL_R * 2}px`,
            textAlign: "center", pointerEvents: "none",
            opacity: b.scored ? 0.5 : 1,
            transition: "opacity 0.3s",
            filter: b.golden ? "drop-shadow(0 0 8px rgba(255,215,0,0.8))" : undefined,
          }}>{b.golden ? "🌟" : "🏀"}</div>
        ))}

        {/* Score FX */}
        {fxs.map(fx => (
          <motion.div key={fx.id}
            initial={{ opacity: 1, y: 0, scale: 0.8 }}
            animate={{ opacity: 0, y: -50, scale: 1.3 }}
            transition={{ duration: 0.7 }}
            style={{
              position: "absolute", left: fx.x, top: fx.y,
              transform: "translateX(-50%)",
              fontSize: 18, fontWeight: 900, color: fx.color,
              textShadow: `0 0 10px ${fx.color}55`,
              pointerEvents: "none",
            }}
          >{fx.text}</motion.div>
        ))}

        {/* Ready overlay */}
        {phase === "ready" && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 12,
            background: "rgba(0,0,0,0.4)",
          }}>
            <span style={{ fontSize: 52 }}>🏀</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>Баскетбол</span>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Свайпни вверх чтобы бросить!</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Корзина сужается • Ветер усиливается</span>
            <motion.span
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              style={{ fontSize: 14, color: "#ffd700", fontWeight: 700, marginTop: 8 }}
            >Тапни чтобы начать</motion.span>
          </div>
        )}

        {/* Swipe hint */}
        {phase === "playing" && thrown === 0 && (
          <motion.div
            animate={{ y: [0, -20, 0], opacity: [0.6, 1, 0.6] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            style={{
              position: "absolute", bottom: 80, left: "50%", transform: "translateX(-50%)",
              fontSize: 28, pointerEvents: "none",
            }}
          >👆</motion.div>
        )}

        {/* Result */}
        {phase === "result" && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            onClick={e => e.stopPropagation()}
            style={{
              position: "absolute", inset: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 10,
              background: "rgba(0,0,0,0.75)",
            }}
          >
            <span style={{ fontSize: 44 }}>🏆</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>Результат</span>
            <div style={{
              display: "flex", flexDirection: "column", gap: 5,
              background: "rgba(255,255,255,0.06)", borderRadius: 16, padding: "14px 24px",
              border: "1px solid rgba(255,255,255,0.08)",
            }}>
              <Row label="Очки" value={`${score}`} />
              <Row label="Попадания" value={`${made}/${thrown}`} />
              <Row label="Точность" value={thrown > 0 ? `${Math.round(made / thrown * 100)}%` : "—"} />
              <Row label="Макс. серия" value={`${maxStreak}x`} color="#ffd700" />
              <Row label="Макс. уровень" value={`${level}`} />
              <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "2px 0" }} />
              <Row label="Монеты" value={`+${earned} 🪙`} color="#ffd700" />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => {
                setPhase("ready"); setTimer(GAME_SEC); setScore(0); scoreRef.current = 0;
                setStreak(0); setMaxStreak(0); setMade(0); madeRef.current = 0;
                setThrown(0); setBalls([]); setLevel(1); setHoopW(BASE_HOOP_W);
                setWind({ dir: 0, strength: 0 });
              }}
                style={{ ...closeBtnStyle, borderColor: "rgba(100,200,100,0.3)", color: "rgba(100,200,100,0.7)" }}>
                Ещё раз
              </button>
              <button onClick={onClose} style={closeBtnStyle}>Выйти</button>
            </div>
          </motion.div>
        )}
      </div>

      {phase !== "result" && (
        <button onClick={onClose} style={closeBtnStyle}>Закрыть</button>
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