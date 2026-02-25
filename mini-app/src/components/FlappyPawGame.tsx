// mini-app/src/components/FlappyPawGame.tsx
// Flappy-style v2: ускорение, типы труб, магнит-монеты, daily best
import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useCoinStore } from "../store/useCoinStore";

const W = 300, H = 460;
const BIRD_X = 70, BIRD_R = 16;
const GRAVITY = 0.45;
const FLAP_VEL = -7;
const PIPE_W = 52;
const BASE_GAP = 135;
const BASE_SPEED = 2.8;
const BASE_INTERVAL = 100;
const COIN_R = 12;
const MAGNET_R = 14;

interface Pipe {
  id: number; x: number; topH: number;
  scored: boolean; coinCollected: boolean;
  magnetCollected: boolean; hasMagnet: boolean;
  gapH: number; moving: boolean; moveDir: number;
}

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
  const [hasMagnet, setHasMagnet] = useState(false);
  const [magnetTimer, setMagnetTimer] = useState(0);
  const [speed, setSpeed] = useState(BASE_SPEED);

  const byRef = useRef(H / 2);
  const vyRef = useRef(0);
  const pipesRef = useRef<Pipe[]>([]);
  const scoreRef = useRef(0);
  const coinsRef = useRef(0);
  const pipeTimer = useRef(0);
  const pipeId = useRef(0);
  const alive = useRef(true);
  const raf = useRef(0);
  const magnetEnd = useRef(0);
  const speedRef = useRef(BASE_SPEED);
  const intervalRef = useRef(BASE_INTERVAL);

  const reset = useCallback(() => {
    byRef.current = H / 2; vyRef.current = 0;
    pipesRef.current = []; scoreRef.current = 0; coinsRef.current = 0;
    pipeTimer.current = 0; pipeId.current = 0; alive.current = true;
    magnetEnd.current = 0; speedRef.current = BASE_SPEED;
    intervalRef.current = BASE_INTERVAL;
    setBirdY(H / 2); setBirdVy(0); setBirdAngle(0);
    setPipes([]); setScore(0); setCoins(0);
    setHasMagnet(false); setMagnetTimer(0); setSpeed(BASE_SPEED);
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
      const now = performance.now();
      const magnetActive = now < magnetEnd.current;

      // Progressive difficulty
      const s = scoreRef.current;
      speedRef.current = BASE_SPEED + Math.min(2.5, s * 0.06);
      intervalRef.current = Math.max(65, BASE_INTERVAL - s * 1.5);
      const gapH = Math.max(90, BASE_GAP - s * 1.2);

      vyRef.current += GRAVITY;
      byRef.current += vyRef.current;
      const angle = Math.max(-30, Math.min(70, vyRef.current * 4));

      // Spawn pipes
      pipeTimer.current++;
      if (pipeTimer.current >= intervalRef.current) {
        pipeTimer.current = 0;
        const minTop = 50;
        const maxTop = H - gapH - 50;
        const topH = minTop + Math.random() * (maxTop - minTop);
        const moving = s >= 8 && Math.random() < 0.25;
        const hasMag = !magnetActive && Math.random() < 0.12;
        pipesRef.current = [...pipesRef.current, {
          id: pipeId.current++, x: W + 10, topH,
          scored: false, coinCollected: false,
          magnetCollected: false, hasMagnet: hasMag,
          gapH, moving, moveDir: Math.random() > 0.5 ? 1 : -1,
        }];
      }

      const bx = BIRD_X, by = byRef.current;
      let dead = false;
      let newScore = scoreRef.current;
      let newCoins = coinsRef.current;

      pipesRef.current = pipesRef.current
        .map(p => {
          const np = { ...p, x: p.x - speedRef.current };

          // Moving pipes
          if (np.moving) {
            np.topH += np.moveDir * 0.5;
            if (np.topH < 40 || np.topH > H - np.gapH - 40) {
              np.moveDir *= -1;
            }
          }

          if (!np.scored && np.x + PIPE_W < bx) {
            np.scored = true;
            newScore++;
          }

          // Coin — magnet attraction
          if (!np.coinCollected) {
            const coinX = np.x + PIPE_W / 2;
            const coinY = np.topH + np.gapH / 2;
            const dist = Math.sqrt((bx - coinX) ** 2 + (by - coinY) ** 2);
            const collectR = magnetActive ? BIRD_R + COIN_R + 50 : BIRD_R + COIN_R;
            if (dist < collectR) {
              np.coinCollected = true;
              newCoins += magnetActive ? 2 : 1;
            }
          }

          // Magnet pickup
          if (np.hasMagnet && !np.magnetCollected) {
            const mx = np.x + PIPE_W / 2;
            const my = np.topH + np.gapH / 2 + 22;
            const dist = Math.sqrt((bx - mx) ** 2 + (by - my) ** 2);
            if (dist < BIRD_R + MAGNET_R) {
              np.magnetCollected = true;
              magnetEnd.current = now + 5000;
            }
          }

          // Collision
          if (bx + BIRD_R > np.x && bx - BIRD_R < np.x + PIPE_W) {
            if (by - BIRD_R < np.topH || by + BIRD_R > np.topH + np.gapH) {
              dead = true;
            }
          }
          return np;
        })
        .filter(p => p.x > -PIPE_W - 20);

      scoreRef.current = newScore;
      coinsRef.current = newCoins;

      if (by > H - BIRD_R || by < BIRD_R) dead = true;

      const isMagnet = now < magnetEnd.current;
      setHasMagnet(isMagnet);
      if (isMagnet) setMagnetTimer(Math.ceil((magnetEnd.current - now) / 1000));

      if (dead) {
        alive.current = false;
        setBirdY(byRef.current); setBirdVy(vyRef.current); setBirdAngle(angle);
        setPipes([...pipesRef.current]);
        setScore(scoreRef.current); setCoins(coinsRef.current);
        setSpeed(speedRef.current);
        setBest(b => Math.max(b, scoreRef.current));
        setPhase("dead");
        setTimeout(() => {
          const earned = coinsRef.current + Math.floor(scoreRef.current / 4);
          if (earned > 0) addCoins(earned);
          setPhase("result");
        }, 1200);
        return;
      }

      setBirdY(byRef.current); setBirdVy(vyRef.current); setBirdAngle(angle);
      setPipes([...pipesRef.current]);
      setScore(scoreRef.current); setCoins(coinsRef.current);
      setSpeed(speedRef.current);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [phase, addCoins]);

  const earned = coins + Math.floor(score / 4);

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

      {/* Magnet timer */}
      {hasMagnet && (
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 0.5 }}
          style={{ fontSize: 12, color: "#60a5fa", fontWeight: 800 }}
        >🧲 МАГНИТ {magnetTimer}с</motion.div>
      )}

      {/* Canvas */}
      <div style={{
        width: W, height: H, position: "relative",
        background: "linear-gradient(180deg, #1a2a4a 0%, #0d1525 60%, #1a3020 100%)",
        borderRadius: 24, overflow: "hidden",
        border: `1px solid ${hasMagnet ? "rgba(96,165,250,0.3)" : "rgba(255,255,255,0.06)"}`,
        transition: "border 0.3s",
      }}>
        {/* Stars */}
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
            <div style={{
              position: "absolute", left: p.x, top: 0,
              width: PIPE_W, height: p.topH,
              background: p.moving
                ? "linear-gradient(180deg, #7a2d3d, #5a1a2a)"
                : "linear-gradient(180deg, #2d7a3d, #1a5a2a)",
              borderRadius: "0 0 8px 8px",
              boxShadow: "inset -4px 0 0 rgba(0,0,0,0.15), inset 4px 0 0 rgba(255,255,255,0.08)",
            }}>
              <div style={{
                position: "absolute", bottom: -4, left: -4,
                width: PIPE_W + 8, height: 12,
                background: p.moving
                  ? "linear-gradient(180deg, #9a3a4d, #7a2d3d)"
                  : "linear-gradient(180deg, #3a9a4d, #2d7a3d)",
                borderRadius: 4,
              }} />
            </div>
            <div style={{
              position: "absolute", left: p.x, top: p.topH + p.gapH,
              width: PIPE_W, height: H - p.topH - p.gapH,
              background: p.moving
                ? "linear-gradient(180deg, #7a2d3d, #5a1a2a)"
                : "linear-gradient(180deg, #2d7a3d, #1a5a2a)",
              borderRadius: "8px 8px 0 0",
              boxShadow: "inset -4px 0 0 rgba(0,0,0,0.15), inset 4px 0 0 rgba(255,255,255,0.08)",
            }}>
              <div style={{
                position: "absolute", top: -4, left: -4,
                width: PIPE_W + 8, height: 12,
                background: p.moving
                  ? "linear-gradient(180deg, #9a3a4d, #7a2d3d)"
                  : "linear-gradient(180deg, #3a9a4d, #2d7a3d)",
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
                  top: p.topH + p.gapH / 2 - COIN_R,
                  width: COIN_R * 2, height: COIN_R * 2,
                  fontSize: COIN_R * 1.6, lineHeight: `${COIN_R * 2}px`,
                  textAlign: "center",
                  filter: hasMagnet
                    ? "drop-shadow(0 0 10px rgba(96,165,250,0.8))"
                    : "drop-shadow(0 0 6px rgba(255,215,0,0.6))",
                }}
              >🪙</motion.div>
            )}

            {/* Magnet pickup */}
            {p.hasMagnet && !p.magnetCollected && (
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                style={{
                  position: "absolute",
                  left: p.x + PIPE_W / 2 - MAGNET_R,
                  top: p.topH + p.gapH / 2 + 22 - MAGNET_R,
                  width: MAGNET_R * 2, height: MAGNET_R * 2,
                  fontSize: MAGNET_R * 1.5, lineHeight: `${MAGNET_R * 2}px`,
                  textAlign: "center",
                  filter: "drop-shadow(0 0 8px rgba(96,165,250,0.7))",
                }}
              >🧲</motion.div>
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
          filter: phase === "dead" ? "grayscale(1)"
            : hasMagnet ? "drop-shadow(0 2px 8px rgba(96,165,250,0.6))"
            : "drop-shadow(0 2px 6px rgba(0,0,0,0.4))",
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
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
              Щель сужается • Трубы двигаются • Собирай магниты!
            </span>
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
            <span style={{ fontSize: 44 }}>{score >= 15 ? "🌟" : score >= 8 ? "⭐" : "💫"}</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>Game Over</span>
            <div style={{
              display: "flex", flexDirection: "column", gap: 5,
              background: "rgba(255,255,255,0.06)", borderRadius: 16, padding: "14px 24px",
              border: "1px solid rgba(255,255,255,0.08)",
            }}>
              <Row label="Счёт" value={`${score}`} />
              <Row label="Скорость" value={`${speed.toFixed(1)}x`} />
              <Row label="Монеты собрано" value={`${coins}`} color="#ffd700" />
              <Row label="Бонус за счёт" value={`+${Math.floor(score / 4)}`} />
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