// mini-app/src/components/HeartbeatGame.tsx
// Ритм-игра «Heartbeat» v2
// Волны сложности, золотые биты (2x), fever mode, progressive BPM
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCoinStore } from "../store/useCoinStore";

const GAME_DURATION = 30;
const PERFECT_WINDOW = 0.09;
const GOOD_WINDOW = 0.20;
const BASE_BPM = 68;
const BPM_RANGE = 50;

// Difficulty waves — BPM increases over time
const WAVES = [
  { until: 8, bpmBonus: 0, label: "Разминка" },
  { until: 16, bpmBonus: 15, label: "Ускорение!" },
  { until: 24, bpmBonus: 30, label: "Быстрее!" },
  { until: 30, bpmBonus: 45, label: "ФИНАЛ!" },
];

interface HitFx { id: number; label: string; color: string; x: number; y: number }

interface Props { onClose: () => void }

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
  const [ringPhase, setRingPhase] = useState(0);
  const [bpm, setBpm] = useState(BASE_BPM);
  const [earned, setEarned] = useState(0);
  const [waveLabel, setWaveLabel] = useState("");
  const [fever, setFever] = useState(false);
  const [goldenBeat, setGoldenBeat] = useState(false);
  const [totalBeats, setTotalBeats] = useState(0);

  const beatPhaseRef = useRef(0);
  const bpmRef = useRef(BASE_BPM);
  const bpmDir = useRef(1);
  const lastBeatTime = useRef(0);
  const canTap = useRef(true);
  const animFrame = useRef(0);
  const gameElapsed = useRef(0);
  const nextHit = useRef(0);
  const comboRef = useRef(0);
  const goldenRef = useRef(false);
  const feverRef = useRef(false);

  // Countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    if (count === 0) { setPhase("playing"); return; }
    const t = setTimeout(() => setCount(c => c - 1), 700);
    return () => clearTimeout(t);
  }, [phase, count]);

  // Game timer + waves
  useEffect(() => {
    if (phase !== "playing") return;
    gameElapsed.current = 0;
    const t = setInterval(() => {
      gameElapsed.current++;
      const elapsed = gameElapsed.current;

      // Wave check
      const wave = WAVES.find(w => elapsed <= w.until) ?? WAVES[WAVES.length - 1];
      bpmRef.current = BASE_BPM + wave.bpmBonus + bpmDir.current * (Math.random() * 8);
      if (wave.label) setWaveLabel(wave.label);

      // Golden beat — 15% chance after wave 2
      if (elapsed > 8 && Math.random() < 0.15) {
        goldenRef.current = true;
        setGoldenBeat(true);
        setTimeout(() => { goldenRef.current = false; setGoldenBeat(false); }, 2000);
      }

      setTimer(s => {
        if (s <= 1) { clearInterval(t); setPhase("result"); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  // BPM micro-drift
  useEffect(() => {
    if (phase !== "playing") return;
    const t = setInterval(() => {
      bpmRef.current += bpmDir.current * (1.5 + Math.random() * 2.5);
      const wave = WAVES.find(w => gameElapsed.current <= w.until) ?? WAVES[WAVES.length - 1];
      const target = BASE_BPM + wave.bpmBonus;
      if (bpmRef.current > target + BPM_RANGE) bpmDir.current = -1;
      if (bpmRef.current < target - BPM_RANGE / 2) bpmDir.current = 1;
      setBpm(Math.round(bpmRef.current));
    }, 600);
    return () => clearInterval(t);
  }, [phase]);

  // Animation loop
  useEffect(() => {
    if (phase !== "playing") return;
    lastBeatTime.current = performance.now();
    beatPhaseRef.current = 0;

    const loop = (now: number) => {
      const interval = 60000 / bpmRef.current;
      const elapsed = now - lastBeatTime.current;
      let p = elapsed / interval;

      if (p >= 1) {
        lastBeatTime.current = now - (elapsed % interval);
        p = (elapsed % interval) / interval;
        canTap.current = true;
        setTotalBeats(b => b + 1);
      }

      beatPhaseRef.current = p;
      const systole = p < 0.15;
      const baseScale = systole
        ? 1 + 0.24 * Math.sin(p / 0.15 * Math.PI)
        : 1 - 0.04 * Math.sin((p - 0.15) / 0.85 * Math.PI);
      setHeartScale(feverRef.current ? baseScale * 1.08 : baseScale);
      setRingPhase(p);
      animFrame.current = requestAnimationFrame(loop);
    };
    animFrame.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame.current);
  }, [phase]);

  // Fever mode — 10+ combo
  useEffect(() => {
    const isFever = combo >= 10;
    feverRef.current = isFever;
    setFever(isFever);
  }, [combo]);

  // Result → coins (nerfed base, boosted by skill)
  useEffect(() => {
    if (phase !== "result") return;
    const accuracy = totalBeats > 0 ? (perfect + good) / Math.max(1, perfect + good + miss) : 0;
    const accuracyBonus = accuracy > 0.8 ? 1.5 : accuracy > 0.6 ? 1.2 : 1;
    const comboBonus = 1 + maxCombo * 0.02;
    const raw = Math.floor(score / 15);
    const coins = Math.max(1, Math.floor(raw * accuracyBonus * comboBonus));
    setEarned(coins);
    if (coins > 0) addCoins(coins);
  }, [phase, score, maxCombo, perfect, good, miss, totalBeats, addCoins]);

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
    const dist = Math.min(p, 1 - p);
    const golden = goldenRef.current;
    const feverMult = feverRef.current ? 1.5 : 1;
    const goldenMult = golden ? 2 : 1;

    if (dist <= PERFECT_WINDOW) {
      const pts = Math.round(100 * (1 + Math.floor(comboRef.current / 5) * 0.25) * feverMult * goldenMult);
      setScore(s => s + pts);
      comboRef.current++;
      setCombo(comboRef.current);
      setMaxCombo(m => Math.max(m, comboRef.current));
      setPerfect(n => n + 1);
      spawnHit(golden ? `+${pts} ⭐` : `PERFECT! +${pts}`, golden ? "#ffd700" : "#ffd700");
    } else if (dist <= GOOD_WINDOW) {
      const pts = Math.round(50 * (1 + Math.floor(comboRef.current / 5) * 0.15) * feverMult * goldenMult);
      setScore(s => s + pts);
      comboRef.current++;
      setCombo(comboRef.current);
      setMaxCombo(m => Math.max(m, comboRef.current));
      setGood(n => n + 1);
      spawnHit(`GOOD +${pts}`, "#60d89f");
    } else {
      comboRef.current = 0;
      setCombo(0);
      setMiss(n => n + 1);
      spawnHit("MISS", "#ff6b6b");
    }
  }, [phase, spawnHit]);

  const ringSize = 60 + (1 - ringPhase) * 120;
  const ringOpacity = 0.15 + ringPhase * 0.55;
  const feverBg = fever
    ? "radial-gradient(ellipse at 50% 40%, #2a0a3e, #1a0520)"
    : "radial-gradient(ellipse at 50% 40%, #1a0a2e, #06060f)";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: feverBg,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 12,
        touchAction: "none", userSelect: "none",
        transition: "background 0.5s",
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

      {/* Wave label */}
      <AnimatePresence mode="wait">
        {phase === "playing" && waveLabel && (
          <motion.div key={waveLabel}
            initial={{ scale: 1.8, opacity: 0 }} animate={{ scale: 1, opacity: 0.6 }}
            exit={{ opacity: 0 }}
            style={{
              position: "absolute", top: 48,
              fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.4)",
              letterSpacing: "0.1em", textTransform: "uppercase",
            }}
          >{waveLabel}</motion.div>
        )}
      </AnimatePresence>

      {/* Fever indicator */}
      {fever && phase === "playing" && (
        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ repeat: Infinity, duration: 0.4 }}
          style={{
            position: "absolute", top: 48,
            fontSize: 14, fontWeight: 900, color: "#ff6bff",
            textShadow: "0 0 20px #ff6bff",
          }}
        >🔥 FEVER x1.5 🔥</motion.div>
      )}

      {/* Combo */}
      {phase === "playing" && combo > 1 && (
        <motion.div key={combo}
          initial={{ scale: 1.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          style={{
            position: "absolute", top: 68,
            fontSize: 18, fontWeight: 900,
            color: fever ? "#ff6bff" : combo >= 10 ? "#ffd700" : combo >= 5 ? "#f0a0ff" : "rgba(255,255,255,0.6)",
            textShadow: fever ? "0 0 20px #ff6bff" : combo >= 10 ? "0 0 20px #ffd700" : "none",
          }}
        >{combo}x COMBO</motion.div>
      )}

      {/* Golden beat indicator */}
      {goldenBeat && phase === "playing" && (
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 0.3 }}
          style={{
            position: "absolute", top: 90,
            fontSize: 12, fontWeight: 800, color: "#ffd700",
            textShadow: "0 0 12px #ffd700",
          }}
        >⭐ GOLDEN BEAT x2 ⭐</motion.div>
      )}

      {/* Heart area */}
      <div style={{ position: "relative", width: 280, height: 280, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {phase === "playing" && (
          <div style={{
            position: "absolute",
            width: ringSize, height: ringSize,
            border: `3px solid rgba(255,100,150,${ringOpacity})`,
            borderRadius: "50%",
            pointerEvents: "none",
          }} />
        )}
        <div style={{
          position: "absolute",
          width: 64, height: 64,
          border: `2px solid rgba(255,100,150,${goldenBeat ? 0.7 : 0.3})`,
          borderRadius: "50%",
          pointerEvents: "none",
          boxShadow: goldenBeat ? "0 0 20px rgba(255,215,0,0.4)" : "none",
          transition: "border 0.3s, box-shadow 0.3s",
        }} />
        <div style={{
          fontSize: 72,
          transform: `scale(${heartScale})`,
          filter: `drop-shadow(0 0 ${20 + heartScale * 15}px rgba(${fever ? "255,50,255" : "255,50,100"},${0.3 + heartScale * 0.2}))`,
          cursor: "pointer",
        }}>
          {goldenBeat ? "💛" : "❤️"}
        </div>
        {hits.map(h => (
          <motion.div key={h.id}
            initial={{ opacity: 1, scale: 0.6, y: 0 }}
            animate={{ opacity: 0, scale: 1.2, y: -40 }}
            transition={{ duration: 0.6 }}
            style={{
              position: "absolute", left: h.x, top: h.y,
              transform: "translate(-50%,-50%)",
              fontSize: 14, fontWeight: 900, color: h.color,
              textShadow: `0 0 10px ${h.color}`,
              pointerEvents: "none",
            }}
          >{h.label}</motion.div>
        ))}
      </div>

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
            style={{ position: "absolute", fontSize: count === 0 ? 28 : 80, fontWeight: 900, color: "#fff" }}
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
            <Row label="Макс. комбо" value={`${maxCombo}x`} color={maxCombo >= 10 ? "#ff6bff" : undefined} />
            <Row label="Точность" value={`${Math.round((perfect + good) / Math.max(1, perfect + good + miss) * 100)}%`} />
            <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "4px 0" }} />
            <Row label="Монеты" value={`+${earned} 🪙`} color="#ffd700" />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { setPhase("countdown"); setCount(3); setTimer(GAME_DURATION); setScore(0); setCombo(0); comboRef.current = 0; setMaxCombo(0); setPerfect(0); setGood(0); setMiss(0); setTotalBeats(0); setFever(false); setGoldenBeat(false); }}
              style={{ ...closeBtnStyle, borderColor: "rgba(100,200,100,0.3)", color: "rgba(100,200,100,0.7)" }}>
              Ещё раз
            </button>
            <button onClick={onClose} style={closeBtnStyle}>Выйти</button>
          </div>
        </motion.div>
      )}

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