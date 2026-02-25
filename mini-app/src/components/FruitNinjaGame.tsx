// mini-app/src/components/BubblePopGame.tsx
// Лопай пузыри разных цветов и размеров. Combo за быстрые тапы.
// Бомбы штрафуют. Золотые пузыри дают x3. Скорость растёт.
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCoinStore } from "../store/useCoinStore";

const W = 320, H = 480;
const GAME_SEC = 25;
const MAX_BUBBLES = 12;

type BubbleType = "normal" | "golden" | "bomb" | "tiny";

interface Bubble {
  id: number; x: number; y: number;
  r: number; type: BubbleType;
  vx: number; vy: number;
  emoji: string; points: number;
}

interface PopFx { id: number; x: number; y: number; text: string; color: string }

const BUBBLE_COLORS: Record<BubbleType, string> = {
  normal: "radial-gradient(circle at 30% 30%, rgba(130,180,255,0.9), rgba(70,120,220,0.7))",
  golden: "radial-gradient(circle at 30% 30%, rgba(255,230,100,0.95), rgba(220,180,30,0.8))",
  bomb: "radial-gradient(circle at 30% 30%, rgba(80,80,80,0.9), rgba(40,40,40,0.8))",
  tiny: "radial-gradient(circle at 30% 30%, rgba(180,130,255,0.9), rgba(130,80,220,0.7))",
};

interface Props { onClose: () => void }

export function BubblePopGame({ onClose }: Props) {
  const addCoins = useCoinStore(s => s.addCoins);
  const [phase, setPhase] = useState<"ready" | "playing" | "result">("ready");
  const [timer, setTimer] = useState(GAME_SEC);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [popped, setPopped] = useState(0);
  const [missed, setMissed] = useState(0);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [fxs, setFxs] = useState<PopFx[]>([]);
  const [earned, setEarned] = useState(0);

  const nextId = useRef(0);
  const fxIdRef = useRef(0);
  const lastPopTime = useRef(0);
  const spawnRate = useRef(800);

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

  // Spawn bubbles
  useEffect(() => {
    if (phase !== "playing") return;
    let timeout: ReturnType<typeof setTimeout>;

    const spawn = () => {
      const elapsed = GAME_SEC - timer;
      // Speed increases over time
      spawnRate.current = Math.max(350, 800 - elapsed * 20);

      const rand = Math.random();
      let type: BubbleType;
      let r: number;
      let points: number;
      let emoji: string;

      if (rand < 0.08) {
        type = "bomb"; r = 22; points = 0; emoji = "💣";
      } else if (rand < 0.15) {
        type = "golden"; r = 20; points = 30; emoji = "✨";
      } else if (rand < 0.30) {
        type = "tiny"; r = 12; points = 15; emoji = "";
      } else {
        type = "normal"; r = 16 + Math.random() * 10; points = 10; emoji = "";
      }

      const id = nextId.current++;
      setBubbles(b => [...b.slice(-(MAX_BUBBLES - 1)), {
        id,
        x: r + Math.random() * (W - r * 2),
        y: H + r,
        r, type, emoji, points,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -(1.5 + Math.random() * 2 + elapsed * 0.05),
      }]);

      timeout = setTimeout(spawn, spawnRate.current);
    };
    timeout = setTimeout(spawn, 300);
    return () => clearTimeout(timeout);
  }, [phase, timer]);

  // Physics
  useEffect(() => {
    if (phase !== "playing") return;
    let raf = 0;
    const loop = () => {
      setBubbles(prev => {
        const next: Bubble[] = [];
        for (const b of prev) {
          const nx = b.x + b.vx;
          const ny = b.y + b.vy;
          // Bounce off walls
          let nvx = b.vx;
          if (nx < b.r || nx > W - b.r) nvx = -nvx;
          // Remove if off screen top
          if (ny < -b.r * 2) {
            if (b.type !== "bomb") setMissed(m => m + 1);
            continue;
          }
          next.push({ ...b, x: Math.max(b.r, Math.min(W - b.r, nx)), y: ny, vx: nvx });
        }
        return next;
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const popBubble = useCallback((b: Bubble, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (phase !== "playing") return;

    const now = Date.now();
    setBubbles(prev => prev.filter(bb => bb.id !== b.id));

    if (b.type === "bomb") {
      // Penalty
      setScore(s => Math.max(0, s - 20));
      setCombo(0);
      lastPopTime.current = 0;
      spawnFx(b.x, b.y, "-20 💥", "#ff4444");
      return;
    }

    // Combo — quick successive pops
    const timeSinceLastPop = now - lastPopTime.current;
    lastPopTime.current = now;
    let newCombo = 0;
    if (timeSinceLastPop < 600) {
      newCombo = combo + 1;
    } else {
      newCombo = 1;
    }
    setCombo(newCombo);
    setMaxCombo(m => Math.max(m, newCombo));

    const comboMult = 1 + Math.floor(newCombo / 3) * 0.3;
    const goldenMult = b.type === "golden" ? 3 : 1;
    const tinyMult = b.type === "tiny" ? 1.5 : 1;
    const pts = Math.round(b.points * comboMult * goldenMult * tinyMult);

    setScore(s => s + pts);
    setPopped(p => p + 1);

    const label = b.type === "golden" ? `+${pts} ⭐` : newCombo >= 3 ? `+${pts} 🔥` : `+${pts}`;
    spawnFx(b.x, b.y, label, b.type === "golden" ? "#ffd700" : "#fff");
  }, [phase, combo]);

  const spawnFx = useCallback((x: number, y: number, text: string, color: string) => {
    const id = fxIdRef.current++;
    setFxs(f => [...f.slice(-6), { id, x, y, text, color }]);
    setTimeout(() => setFxs(f => f.filter(ff => ff.id !== id)), 700);
  }, []);

  // Result
  useEffect(() => {
    if (phase !== "result") return;
    const accuracy = popped + missed > 0 ? popped / (popped + missed) : 0;
    const accBonus = accuracy > 0.8 ? 1.5 : accuracy > 0.6 ? 1.2 : 1;
    const c = Math.max(0, Math.floor(score / 12 * accBonus));
    setEarned(c);
    if (c > 0) addCoins(c);
  }, [phase, score, popped, missed, addCoins]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "linear-gradient(180deg, #0a1a30, #06060f)",
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
        <span>💎 {score}</span>
        {phase === "playing" && (
          <span style={{ color: timer <= 5 ? "#ff6b6b" : undefined }}>⏱ {timer}с</span>
        )}
        {combo >= 3 && <span style={{ color: "#ffd700" }}>🔥{combo}x</span>}
      </div>

      {/* Canvas */}
      <div
        onClick={phase === "ready" ? startGame : undefined}
        style={{
          width: W, height: H, position: "relative",
          background: "linear-gradient(180deg, rgba(20,40,80,0.3), rgba(10,15,30,0.5))",
          borderRadius: 24, overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Bubbles */}
        {bubbles.map(b => (
          <motion.div
            key={b.id}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={e => popBubble(b, e)}
            onTouchEnd={e => { e.preventDefault(); popBubble(b, e); }}
            style={{
              position: "absolute",
              left: b.x - b.r, top: b.y - b.r,
              width: b.r * 2, height: b.r * 2,
              borderRadius: "50%",
              background: BUBBLE_COLORS[b.type],
              border: `1px solid ${b.type === "golden" ? "rgba(255,215,0,0.5)" : "rgba(255,255,255,0.2)"}`,
              boxShadow: b.type === "golden"
                ? "0 0 12px rgba(255,215,0,0.4), inset 0 -2px 4px rgba(0,0,0,0.2)"
                : b.type === "bomb"
                ? "0 0 8px rgba(255,50,50,0.3)"
                : "0 2px 8px rgba(0,0,0,0.2), inset 0 -2px 4px rgba(0,0,0,0.1)",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: b.r * 0.9,
            }}
          >
            {b.emoji || (
              <div style={{
                width: b.r * 0.5, height: b.r * 0.5,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.3)",
                position: "absolute", top: "20%", left: "25%",
              }} />
            )}
          </motion.div>
        ))}

        {/* Pop FX */}
        {fxs.map(fx => (
          <motion.div key={fx.id}
            initial={{ opacity: 1, scale: 0.5, y: 0 }}
            animate={{ opacity: 0, scale: 1.3, y: -40 }}
            transition={{ duration: 0.6 }}
            style={{
              position: "absolute", left: fx.x, top: fx.y,
              transform: "translateX(-50%)",
              fontSize: 16, fontWeight: 900, color: fx.color,
              textShadow: `0 0 8px ${fx.color}55`,
              pointerEvents: "none",
            }}
          >{fx.text}</motion.div>
        ))}

        {/* Ready */}
        {phase === "ready" && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 12,
            background: "rgba(0,0,0,0.4)",
          }}>
            <span style={{ fontSize: 52 }}>🫧</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>Bubble Pop</span>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Лопай пузыри, избегай бомб!</span>
            <div style={{ display: "flex", gap: 16, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
              <span>🫧 +10</span>
              <span>✨ x3</span>
              <span>💣 -20</span>
            </div>
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
              background: "rgba(0,0,0,0.75)",
            }}
          >
            <span style={{ fontSize: 44 }}>🫧</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>Результат</span>
            <div style={{
              display: "flex", flexDirection: "column", gap: 5,
              background: "rgba(255,255,255,0.06)", borderRadius: 16, padding: "14px 24px",
              border: "1px solid rgba(255,255,255,0.08)",
            }}>
              <Row label="Очки" value={`${score}`} />
              <Row label="Лопнуто" value={`${popped}`} />
              <Row label="Пропущено" value={`${missed}`} />
              <Row label="Точность" value={popped + missed > 0 ? `${Math.round(popped / (popped + missed) * 100)}%` : "—"} />
              <Row label="Макс. комбо" value={`${maxCombo}x`} color="#ffd700" />
              <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "2px 0" }} />
              <Row label="Монеты" value={`+${earned} 🪙`} color="#ffd700" />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => {
                setPhase("ready"); setTimer(GAME_SEC); setScore(0);
                setCombo(0); setMaxCombo(0); setPopped(0); setMissed(0);
                setBubbles([]);
              }}
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