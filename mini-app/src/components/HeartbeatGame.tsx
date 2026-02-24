// mini-app/src/components/HeartbeatGame.tsx
// Ритм-игра «Heartbeat»: сердце пульсирует с живым ритмом,
// игрок тапает в момент максимального сжатия.
// Темп плавно меняется — ускоряется и замедляется.
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCoinStore } from "../store/useCoinStore";

const GAME_DURATION = 20; // секунд
const PERFECT_WINDOW = 0.10; // ±10% фазы
const GOOD_WINDOW = 0.22;
const BASE_BPM = 72;
const BPM_RANGE = 40; // ±40 от базового

interface HitFx {
  id: number;
  label: string;
  color: string;
  x: number;
  y: number;
}

interface Props {
  onClose: () => void;
}

export function HeartbeatGame({ onClose }: Props) {
  const addCoins = useCoinStore(s => s.addCoins);
  const [phase, setPhase] = useState<"countdown" | "playing" | "result">("countdown");
  const [count, setCount] = useState(3);
  const [timer, setTimer] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [perfect, setPerfect] = useState(0);
  const [good, setGood] = useState(0);
  const [miss, setMiss] = useState(0);
  const [hits, setHits] = useState<HitFx[]>([]);
  const [heartScale, setHeartScale] = useState(1);
  const [ringPhase, setRingPhase] = useState(0); // 0..1, 1 = beat момент
  const [bpm, setBpm] = useState(BASE_BPM);
  const [earned, setEarned] = useState(0);

  const beatPhaseRef = useRef(0); // текущая фаза 0..1
  const bpmRef = useRef(BASE_BPM);
  const bpmDir = useRef(1);
  const lastBeatTime = useRef(0);
  const canTap = useRef(true);
  const animFrame = useRef(0);
  const gameStart = useRef(0);
  const nextHit = useRef(0);

  // Countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    if (count === 0) { setPhase("playing"); return; }
    const t = setTimeout(() => setCount(c => c - 1), 700);
    return () => clearTimeout(t);
  }, [phase, count]);

  // Game timer
  useEffect(() => {
    if (phase !== "playing") return;
    gameStart.current = performance.now();
    const t = setInterval(() => {
      setTimer(s => {
        if (s <= 1) {
          clearInterval(t);
          setPhase("result");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  // BPM drift — плавно меняем темп
  useEffect(() => {
    if (phase !== "playing") return;
    const t = setInterval(() => {
      bpmRef.current += bpmDir.current * (2 + Math.random() * 3);
      if (bpmRef.current > BASE_BPM + BPM_RANGE) bpmDir.current = -1;
      if (bpmRef.current < BASE_BPM - BPM_RANGE) bpmDir.current = 1;
      setBpm(Math.round(bpmRef.current));
    }, 800);
    return () => clearInterval(t);
  }, [phase]);

  // Animation loop — heart pulse + ring
  useEffect(() => {
    if (phase !== "playing") return;
    lastBeatTime.current = performance.now();
    beatPhaseRef.current = 0;

    const loop = (now: number) => {
      const interval = 60000 / bpmRef.current; // ms per beat
      const elapsed = now - lastBeatTime.current;
      let p = elapsed / interval;

      if (p >= 1) {
        lastBeatTime.current = now - (elapsed % interval);
        p = (elapsed % interval) / interval;
        canTap.current = true; // новый бит — можно тапать
      }

      beatPhaseRef.current = p;

      // Сердце: systole в фазе 0..0.15, diastole 0.15..1
      const systole = p < 0.15;
      const scale = systole ? 1 + 0.22 * Math.sin(p / 0.15 * Math.PI) : 1 - 0.04 * Math.sin((p - 0.15) / 0.85 * Math.PI);
      setHeartScale(scale);

      // Кольцо сужается к центру: 1 → 0 за один бит
      setRingPhase(p);

      animFrame.current = requestAnimationFrame(loop);
    };
    animFrame.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame.current);
  }, [phase]);

  // Result → coins
  useEffect(() => {
    if (phase !== "result") return;
    const coins = Math.floor(score / 10);
    setEarned(coins);
    if (coins > 0) addCoins(coins);
  }, [phase, score, addCoins]);

  const spawnHit = useCallback((label: string, color: string) => {
    const id = nextHit.current++;
    const x = 140 + (Math.random() - 0.5) * 60;
    const y = 140 + (Math.random() - 0.5) * 40;
    setHits(h => [...h.slice(-5), { id, label, color, x, y }]);
    setTimeout(() => setHits(h => h.filter(hh => hh.id !== id)), 700);
  }, []);

  const handleTap = useCallback(() => {
    if (phase !== "playing" || !canTap.current) return;
    canTap.current = false;

    const p = beatPhaseRef.current;
    // Бит = фаза ~0 или ~1 (wraparound)
    const dist = Math.min(p, 1 - p);

    if (dist <= PERFECT_WINDOW) {
      const pts = 100 * (1 + Math.floor(combo / 5) * 0.2);
      setScore(s => s + Math.round(pts));
      setCombo(c => { const n = c + 1; setMaxCombo(m => Math.max(m, n)); return n; });
      setPerfect(n => n + 1);
      spawnHit("PERFECT!", "#ffd700");
    } else if (dist <= GOOD_WINDOW) {
      const pts = 50 * (1 + Math.floor(combo / 5) * 0.1);
      setScore(s => s + Math.round(pts));
      setCombo(c => { const n = c + 1; setMaxCombo(m => Math.max(m, n)); return n; });
      setGood(n => n + 1);
      spawnHit("GOOD", "#60d89f");
    } else {
      setCombo(0);
      setMiss(n => n + 1);
      spawnHit("MISS", "#ff6b6b");
    }
  }, [phase, combo, spawnHit]);

  const ringSize = 60 + (1 - ringPhase) * 120; // от 180px → 60px
  const ringOpacity = 0.15 + ringPhase * 0.55;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "radial-gradient(ellipse at 50% 40%, #1a0a2e, #06060f)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 12,
        touchAction: "none", userSelect: "none",
      }}
      onClick={handleTap}
    >
      {/* HUD */}
      <div style={{
        position: "absolute", top: 20, left: 0, right: 0,
        display: "flex", justifyContent: "space-between", padding: "0 24px",
        color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 700,
      }}>
        <span>🪙 {score}</span>
        {phase === "playing" && (
          <span style={{ color: timer <= 5 ? "#ff6b6b" : "rgba(255,255,255,0.6)" }}>
            ⏱ {timer}с
          </span>
        )}
        <span>💓 {bpm} bpm</span>
      </div>

      {/* Combo */}
      {phase === "playing" && combo > 1 && (
        <motion.div
          key={combo}
          initial={{ scale: 1.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          style={{
            position: "absolute", top: 60,
            fontSize: 18, fontWeight: 900,
            color: combo >= 10 ? "#ffd700" : combo >= 5 ? "#f0a0ff" : "rgba(255,255,255,0.6)",
            textShadow: combo >= 10 ? "0 0 20px #ffd700" : "none",
          }}
        >
          {combo}x COMBO
        </motion.div>
      )}

      {/* Heart area */}
      <div style={{ position: "relative", width: 280, height: 280, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* Contracting ring — timing guide */}
        {phase === "playing" && (
          <div style={{
            position: "absolute",
            width: ringSize, height: ringSize,
            border: `3px solid rgba(255,100,150,${ringOpacity})`,
            borderRadius: "50%",
            transition: "none",
            pointerEvents: "none",
          }} />
        )}

        {/* Target ring */}
        <div style={{
          position: "absolute",
          width: 64, height: 64,
          border: "2px solid rgba(255,100,150,0.3)",
          borderRadius: "50%",
          pointerEvents: "none",
        }} />

        {/* Heart */}
        <div style={{
          fontSize: 72,
          transform: `scale(${heartScale})`,
          filter: `drop-shadow(0 0 ${20 + heartScale * 15}px rgba(255,50,100,${0.3 + heartScale * 0.2}))`,
          transition: "none",
          cursor: "pointer",
        }}>
          ❤️
        </div>

        {/* Hit effects */}
        {hits.map(h => (
          <motion.div key={h.id}
            initial={{ opacity: 1, scale: 0.6, y: 0 }}
            animate={{ opacity: 0, scale: 1.2, y: -40 }}
            transition={{ duration: 0.6 }}
            style={{
              position: "absolute", left: h.x, top: h.y,
              transform: "translate(-50%,-50%)",
              fontSize: 16, fontWeight: 900, color: h.color,
              textShadow: `0 0 10px ${h.color}`,
              pointerEvents: "none",
            }}
          >{h.label}</motion.div>
        ))}
      </div>

      {/* Instruction */}
      {phase === "playing" && (
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, margin: 0 }}>
          Тапай в момент удара сердца!
        </p>
      )}

      {/* Countdown */}
      {phase === "countdown" && (
        <AnimatePresence mode="wait">
          <motion.div key={count}
            initial={{ scale: 2.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.3, opacity: 0 }}
            style={{
              position: "absolute", fontSize: count === 0 ? 28 : 80,
              fontWeight: 900, color: "#fff",
            }}
          >{count === 0 ? "TAP!" : count}</motion.div>
        </AnimatePresence>
      )}

      {/* Result */}
      {phase === "result" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 12,
            background: "rgba(0,0,0,0.7)",
          }}
          onClick={e => e.stopPropagation()}
        >
          <span style={{ fontSize: 48 }}>💓</span>
          <span style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>Результат</span>
          <div style={{
            display: "flex", flexDirection: "column", gap: 6,
            background: "rgba(255,255,255,0.06)", borderRadius: 18, padding: "16px 28px",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
            <Row label="Очки" value={`${score}`} />
            <Row label="Perfect" value={`${perfect}`} color="#ffd700" />
            <Row label="Good" value={`${good}`} color="#60d89f" />
            <Row label="Miss" value={`${miss}`} color="#ff6b6b" />
            <Row label="Макс. комбо" value={`${maxCombo}x`} />
            <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "4px 0" }} />
            <Row label="Монеты" value={`+${earned} 🪙`} color="#ffd700" />
          </div>
          <button onClick={onClose} style={closeBtnStyle}>Закрыть</button>
        </motion.div>
      )}

      {/* Close button during play */}
      {phase !== "result" && (
        <button onClick={e => { e.stopPropagation(); onClose(); }} style={{
          ...closeBtnStyle, position: "absolute", bottom: 30,
        }}>Закрыть</button>
      )}
    </motion.div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 32 }}>
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