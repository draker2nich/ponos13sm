// mini-app/src/components/FruitNinjaGame.tsx
// Fruit Ninja: фрукты вылетают снизу по параболе, свайпай чтобы разрезать.
// Бомбы — штраф. Combo за несколько фруктов одним свайпом. Скорость растёт.
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCoinStore } from "../store/useCoinStore";

const W = 320, H = 500;
const GAME_SEC = 30;
const FRUIT_R = 24;

type FruitKind = "fruit" | "golden" | "bomb";

interface Fruit {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  kind: FruitKind;
  emoji: string;
  sliced: boolean;
  r: number;
}

interface SliceFx {
  id: number; x: number; y: number;
  text: string; color: string;
}

interface HalfFx {
  id: number; x: number; y: number;
  emoji: string; vx: number; vy: number; rot: number;
}

interface TrailPt { x: number; y: number; t: number }

const FRUITS = ["🍎", "🍊", "🍋", "🍉", "🍇", "🍓", "🍑", "🥝", "🍌", "🍐"];
const GRAVITY = 0.28;

interface Props { onClose: () => void }

export function FruitNinjaGame({ onClose }: Props) {
  const addCoins = useCoinStore(s => s.addCoins);
  const [phase, setPhase] = useState<"ready" | "playing" | "result">("ready");
  const [timer, setTimer] = useState(GAME_SEC);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [sliced, setSliced] = useState(0);
  const [missed, setMissed] = useState(0);
  const [lives, setLives] = useState(3);
  const [fruits, setFruits] = useState<Fruit[]>([]);
  const [fxs, setFxs] = useState<SliceFx[]>([]);
  const [halves, setHalves] = useState<HalfFx[]>([]);
  const [trail, setTrail] = useState<TrailPt[]>([]);
  const [earned, setEarned] = useState(0);
  const [swiping, setSwiping] = useState(false);

  const nextId = useRef(0);
  const fxIdRef = useRef(0);
  const halfIdRef = useRef(0);
  const canvasRef = useRef<HTMLDivElement>(null);
  const livesRef = useRef(3);
  const swipeHits = useRef<Set<number>>(new Set());
  const spawnTimer = useRef(0);
  const elapsedRef = useRef(0);

  const startGame = useCallback(() => {
    if (phase !== "ready") return;
    livesRef.current = 3;
    setLives(3);
    setPhase("playing");
  }, [phase]);

  // Timer
  useEffect(() => {
    if (phase !== "playing") return;
    const t = setInterval(() => {
      elapsedRef.current++;
      setTimer(s => {
        if (s <= 1 || livesRef.current <= 0) { setPhase("result"); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Spawn fruits
  useEffect(() => {
    if (phase !== "playing") return;
    let timeout: ReturnType<typeof setTimeout>;

    const spawn = () => {
      const elapsed = elapsedRef.current;
      // Difficulty ramp: more fruits, faster spawn
      const batchSize = elapsed > 20 ? 4 : elapsed > 12 ? 3 : elapsed > 5 ? 2 : 1;
      const spawnDelay = Math.max(500, 1200 - elapsed * 25);

      for (let i = 0; i < batchSize; i++) {
        setTimeout(() => {
          const rand = Math.random();
          let kind: FruitKind;
          let emoji: string;
          let r = FRUIT_R;

          if (rand < 0.10 + elapsed * 0.003) {
            kind = "bomb"; emoji = "💣"; r = 22;
          } else if (rand < 0.18) {
            kind = "golden"; emoji = "⭐"; r = 26;
          } else {
            kind = "fruit";
            emoji = FRUITS[Math.floor(Math.random() * FRUITS.length)];
            r = 20 + Math.random() * 8;
          }

          const startX = 30 + Math.random() * (W - 60);
          const vx = (Math.random() - 0.5) * 4;
          const vy = -(8 + Math.random() * 4 + elapsed * 0.08);

          const id = nextId.current++;
          setFruits(prev => [...prev.slice(-20), {
            id, x: startX, y: H + r,
            vx, vy, kind, emoji, sliced: false, r,
          }]);
        }, i * 150);
      }

      timeout = setTimeout(spawn, spawnDelay);
    };
    timeout = setTimeout(spawn, 600);
    return () => clearTimeout(timeout);
  }, [phase]);

  // Physics
  useEffect(() => {
    if (phase !== "playing") return;
    let raf = 0;
    const loop = () => {
      setFruits(prev => {
        const next: Fruit[] = [];
        for (const f of prev) {
          if (f.sliced) continue;
          const nx = f.x + f.vx;
          const ny = f.y + f.vy;
          const nvy = f.vy + GRAVITY;

          // Fell off bottom after going up
          if (ny > H + 60 && nvy > 0) {
            if (f.kind === "fruit" || f.kind === "golden") {
              setMissed(m => m + 1);
              // Lose life for missed fruit
              livesRef.current = Math.max(0, livesRef.current - 1);
              setLives(livesRef.current);
              if (livesRef.current <= 0) {
                setPhase("result");
              }
            }
            continue;
          }

          // Off screen sides — just continue
          if (nx < -40 || nx > W + 40) continue;

          next.push({ ...f, x: nx, y: ny, vx: f.vx, vy: nvy });
        }
        return next;
      });

      // Decay halves
      setHalves(prev => prev
        .map(h => ({ ...h, x: h.x + h.vx, y: h.y + h.vy, vy: h.vy + 0.3, rot: h.rot + h.vx * 3 }))
        .filter(h => h.y < H + 50)
      );

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // Slice detection
  const checkSlice = useCallback((cx: number, cy: number) => {
    if (phase !== "playing") return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const rx = cx - rect.left;
    const ry = cy - rect.top;

    setFruits(prev => {
      let hitCount = 0;
      const next = prev.map(f => {
        if (f.sliced) return f;
        const dist = Math.sqrt((rx - f.x) ** 2 + (ry - f.y) ** 2);
        if (dist > f.r + 12) return f;
        if (swipeHits.current.has(f.id)) return f;
        swipeHits.current.add(f.id);

        if (f.kind === "bomb") {
          // Bomb hit — lose life
          livesRef.current = Math.max(0, livesRef.current - 1);
          setLives(livesRef.current);
          setCombo(0);
          spawnSliceFx(f.x, f.y, "💥 -1❤️", "#ff4444");
          if (livesRef.current <= 0) {
            setTimeout(() => setPhase("result"), 100);
          }
          return { ...f, sliced: true };
        }

        hitCount++;
        const pts = f.kind === "golden" ? 30 : 10;
        setScore(s => s + pts);
        setSliced(s => s + 1);

        // Spawn halves
        const hid1 = halfIdRef.current++;
        const hid2 = halfIdRef.current++;
        setHalves(h => [...h.slice(-16),
          { id: hid1, x: f.x - 8, y: f.y, emoji: f.emoji, vx: -2 - Math.random() * 2, vy: -3, rot: 0 },
          { id: hid2, x: f.x + 8, y: f.y, emoji: f.emoji, vx: 2 + Math.random() * 2, vy: -3, rot: 0 },
        ]);

        return { ...f, sliced: true };
      });

      if (hitCount > 0) {
        setCombo(c => {
          const nc = c + hitCount;
          setMaxCombo(m => Math.max(m, nc));
          if (hitCount >= 3) {
            const bonus = hitCount * 5;
            setScore(s => s + bonus);
            spawnSliceFx(rx, ry, `${hitCount}x COMBO +${bonus}!`, "#ffd700");
          } else if (hitCount >= 2) {
            spawnSliceFx(rx, ry, `x${hitCount}!`, "#60d89f");
          }
          return nc;
        });
      }

      return next;
    });
  }, [phase]);

  const spawnSliceFx = useCallback((x: number, y: number, text: string, color: string) => {
    const id = fxIdRef.current++;
    setFxs(f => [...f.slice(-8), { id, x, y, text, color }]);
    setTimeout(() => setFxs(f => f.filter(ff => ff.id !== id)), 800);
  }, []);

  // Trail management
  const addTrail = useCallback((cx: number, cy: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const now = Date.now();
    setTrail(t => [...t.filter(p => now - p.t < 120), { x: cx - rect.left, y: cy - rect.top, t: now }]);
  }, []);

  // Touch/mouse handlers
  const handlePointerDown = useCallback((cx: number, cy: number) => {
    if (phase === "ready") { startGame(); return; }
    if (phase !== "playing") return;
    setSwiping(true);
    swipeHits.current = new Set();
    addTrail(cx, cy);
    checkSlice(cx, cy);
  }, [phase, startGame, checkSlice, addTrail]);

  const handlePointerMove = useCallback((cx: number, cy: number) => {
    if (!swiping || phase !== "playing") return;
    addTrail(cx, cy);
    checkSlice(cx, cy);
  }, [swiping, phase, checkSlice, addTrail]);

  const handlePointerUp = useCallback(() => {
    setSwiping(false);
    swipeHits.current = new Set();
    // Reset combo on swipe end
    setCombo(0);
    setTrail([]);
  }, []);

  // Decay trail
  useEffect(() => {
    if (!swiping) return;
    const t = setInterval(() => {
      const now = Date.now();
      setTrail(prev => prev.filter(p => now - p.t < 120));
    }, 30);
    return () => clearInterval(t);
  }, [swiping]);

  // Result
  useEffect(() => {
    if (phase !== "result") return;
    const accuracy = sliced + missed > 0 ? sliced / (sliced + missed) : 0;
    const accBonus = accuracy > 0.85 ? 1.5 : accuracy > 0.7 ? 1.2 : 1;
    const comboBonus = 1 + maxCombo * 0.01;
    const raw = Math.floor(score / 10);
    const c = Math.max(0, Math.floor(raw * accBonus * comboBonus));
    setEarned(c);
    if (c > 0) addCoins(c);
  }, [phase, score, sliced, missed, maxCombo, addCoins]);

  const resetGame = useCallback(() => {
    setPhase("ready"); setTimer(GAME_SEC); setScore(0);
    setCombo(0); setMaxCombo(0); setSliced(0); setMissed(0);
    setLives(3); livesRef.current = 3;
    setFruits([]); setHalves([]); setFxs([]); setTrail([]);
    elapsedRef.current = 0;
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "linear-gradient(180deg, #0c1a2e, #06060f)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 8,
        touchAction: "none", userSelect: "none",
      }}
    >
      {/* HUD */}
      <div style={{
        width: W, display: "flex", justifyContent: "space-between", alignItems: "center",
        color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 700,
      }}>
        <span>🗡 {score}</span>
        {phase === "playing" && (
          <span style={{ color: timer <= 5 ? "#ff6b6b" : undefined }}>⏱ {timer}с</span>
        )}
        <span style={{ letterSpacing: 2 }}>
          {"❤️".repeat(Math.max(0, lives))}
          {"🖤".repeat(Math.max(0, 3 - lives))}
        </span>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        onMouseDown={e => handlePointerDown(e.clientX, e.clientY)}
        onMouseMove={e => handlePointerMove(e.clientX, e.clientY)}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={e => { e.preventDefault(); const t = e.touches[0]; handlePointerDown(t.clientX, t.clientY); }}
        onTouchMove={e => { e.preventDefault(); const t = e.touches[0]; handlePointerMove(t.clientX, t.clientY); }}
        onTouchEnd={e => { e.preventDefault(); handlePointerUp(); }}
        style={{
          width: W, height: H, position: "relative",
          background: "linear-gradient(180deg, #0f1f3a 0%, #0a1525 50%, #0d1a10 100%)",
          borderRadius: 24, overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.06)",
          cursor: swiping ? "none" : "crosshair",
        }}
      >
        {/* Blade trail — SVG */}
        {trail.length >= 2 && (
          <svg style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 50 }}>
            <defs>
              <linearGradient id="bladeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                <stop offset="100%" stopColor="rgba(220,240,255,0.9)" />
              </linearGradient>
            </defs>
            <polyline
              points={trail.map(p => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="url(#bladeGrad)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: "drop-shadow(0 0 6px rgba(180,220,255,0.7))" }}
            />
          </svg>
        )}

        {/* Fruits */}
        {fruits.map(f => !f.sliced && (
          <div
            key={f.id}
            style={{
              position: "absolute",
              left: f.x - f.r, top: f.y - f.r,
              width: f.r * 2, height: f.r * 2,
              fontSize: f.r * 1.5, lineHeight: `${f.r * 2}px`,
              textAlign: "center",
              pointerEvents: "none",
              filter: f.kind === "golden"
                ? "drop-shadow(0 0 10px rgba(255,215,0,0.7))"
                : f.kind === "bomb"
                ? "drop-shadow(0 0 6px rgba(255,60,60,0.5))"
                : "drop-shadow(0 4px 8px rgba(0,0,0,0.4))",
              transform: `rotate(${f.vx * 8}deg)`,
            }}
          >{f.emoji}</div>
        ))}

        {/* Slice halves — flying away */}
        {halves.map(h => (
          <div
            key={h.id}
            style={{
              position: "absolute",
              left: h.x - 12, top: h.y - 12,
              width: 24, height: 24,
              fontSize: 18, lineHeight: "24px",
              textAlign: "center",
              pointerEvents: "none",
              opacity: 0.7,
              transform: `rotate(${h.rot}deg) scale(0.7)`,
              filter: "blur(0.5px)",
            }}
          >{h.emoji}</div>
        ))}

        {/* Slice FX */}
        {fxs.map(fx => (
          <motion.div key={fx.id}
            initial={{ opacity: 1, scale: 0.6, y: 0 }}
            animate={{ opacity: 0, scale: 1.3, y: -45 }}
            transition={{ duration: 0.7 }}
            style={{
              position: "absolute", left: fx.x, top: fx.y,
              transform: "translateX(-50%)",
              fontSize: 16, fontWeight: 900, color: fx.color,
              textShadow: `0 0 10px ${fx.color}55`,
              pointerEvents: "none", zIndex: 60,
              whiteSpace: "nowrap",
            }}
          >{fx.text}</motion.div>
        ))}

        {/* Juice splatter on slice */}
        {fxs.map(fx => fx.color !== "#ff4444" && (
          <motion.div key={`splash-${fx.id}`}
            initial={{ scale: 0, opacity: 0.6 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              position: "absolute",
              left: fx.x - 15, top: fx.y - 15,
              width: 30, height: 30,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,100,80,0.4), transparent)",
              pointerEvents: "none",
            }}
          />
        ))}

        {/* Ready overlay */}
        {phase === "ready" && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 12,
            background: "rgba(0,0,0,0.5)",
          }}>
            <span style={{ fontSize: 56 }}>🗡️</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>Fruit Ninja</span>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Свайпай чтобы разрезать фрукты!</span>
            <div style={{ display: "flex", gap: 16, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
              <span>🍎 +10</span>
              <span>⭐ +30</span>
              <span>💣 -❤️</span>
            </div>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>
              Пропущенный фрукт = -❤️ • 3 жизни
            </span>
            <motion.span
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              style={{ fontSize: 14, color: "#ffd700", fontWeight: 700, marginTop: 8 }}
            >Тапни чтобы начать</motion.span>
          </div>
        )}

        {/* Result */}
        {phase === "result" && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{
              position: "absolute", inset: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 10,
              background: "rgba(0,0,0,0.78)",
            }}
          >
            <span style={{ fontSize: 48 }}>{lives <= 0 ? "💀" : "🏆"}</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>
              {lives <= 0 ? "Game Over" : "Время вышло!"}
            </span>
            <div style={{
              display: "flex", flexDirection: "column", gap: 5,
              background: "rgba(255,255,255,0.06)", borderRadius: 16, padding: "14px 24px",
              border: "1px solid rgba(255,255,255,0.08)",
            }}>
              <Row label="Очки" value={`${score}`} />
              <Row label="Разрезано" value={`${sliced}`} />
              <Row label="Пропущено" value={`${missed}`} />
              <Row label="Точность" value={sliced + missed > 0 ? `${Math.round(sliced / (sliced + missed) * 100)}%` : "—"} />
              <Row label="Макс. комбо" value={`${maxCombo}x`} color="#ffd700" />
              <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "2px 0" }} />
              <Row label="Монеты" value={`+${earned} 🪙`} color="#ffd700" />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={resetGame}
                style={{ ...closeBtnStyle, borderColor: "rgba(100,200,100,0.3)", color: "rgba(100,200,100,0.7)" }}>
                Ещё раз
              </button>
              <button onClick={onClose} style={closeBtnStyle}>Выйти</button>
            </div>
          </motion.div>
        )}
      </div>

      {phase !== "result" && phase !== "ready" && (
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