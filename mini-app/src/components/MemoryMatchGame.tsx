// mini-app/src/components/MemoryMatchGame.tsx
// Найди пары карточек. Уровни увеличивают сетку. Бонус за скорость и мин. попытки.
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCoinStore } from "../store/useCoinStore";

const EMOJIS = ["🐱","🐶","🐰","🐻","🦊","🐼","🐸","🦋","🐝","🌸","🍎","⭐","🎵","🔥","💎","🌈","🎯","🧁"];

interface Card { id: number; emoji: string; flipped: boolean; matched: boolean }

const LEVELS = [
  { pairs: 4, cols: 4, rows: 2, label: "Уровень 1", time: 30 },
  { pairs: 6, cols: 4, rows: 3, label: "Уровень 2", time: 40 },
  { pairs: 8, cols: 4, rows: 4, label: "Уровень 3", time: 50 },
  { pairs: 10, cols: 5, rows: 4, label: "Уровень 4", time: 55 },
  { pairs: 12, cols: 6, rows: 4, label: "Уровень 5", time: 60 },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(pairs: number): Card[] {
  const pool = shuffle(EMOJIS).slice(0, pairs);
  const cards = pool.flatMap((e, i) => [
    { id: i * 2, emoji: e, flipped: false, matched: false },
    { id: i * 2 + 1, emoji: e, flipped: false, matched: false },
  ]);
  return shuffle(cards);
}

interface Props { onClose: () => void }

export function MemoryMatchGame({ onClose }: Props) {
  const addCoins = useCoinStore(s => s.addCoins);
  const [levelIdx, setLevelIdx] = useState(0);
  const [phase, setPhase] = useState<"playing" | "levelUp" | "result">("playing");
  const [cards, setCards] = useState<Card[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [timer, setTimer] = useState(LEVELS[0].time);
  const [moves, setMoves] = useState(0);
  const [matched, setMatched] = useState(0);
  const [totalCoins, setTotalCoins] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [showFx, setShowFx] = useState("");
  const locked = useRef(false);
  const startTime = useRef(Date.now());

  const lv = LEVELS[levelIdx];

  // Init level
  useEffect(() => {
    setCards(buildDeck(lv.pairs));
    setSelected([]);
    setMatched(0);
    setMoves(0);
    setTimer(lv.time);
    locked.current = false;
    startTime.current = Date.now();
  }, [levelIdx]);

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
  }, [phase, levelIdx]);

  // Check level complete
  useEffect(() => {
    if (phase !== "playing") return;
    if (matched >= lv.pairs) {
      const elapsed = Math.floor((Date.now() - startTime.current) / 1000);
      const timeBonus = Math.max(0, lv.time - elapsed);
      const moveBonus = Math.max(0, lv.pairs * 2 - moves);
      const lvCoins = 2 + levelIdx * 2 + Math.floor(timeBonus / 5) + Math.floor(moveBonus / 2);
      setTotalCoins(c => c + lvCoins);
      setShowFx(`+${lvCoins} 🪙`);
      setTimeout(() => setShowFx(""), 1200);

      if (levelIdx < LEVELS.length - 1) {
        setTimeout(() => {
          setPhase("levelUp");
          setTimeout(() => {
            setLevelIdx(i => i + 1);
            setPhase("playing");
          }, 1500);
        }, 600);
      } else {
        setTimeout(() => setPhase("result"), 800);
      }
    }
  }, [matched, phase, levelIdx, lv, moves]);

  const handleTap = useCallback((id: number) => {
    if (locked.current || phase !== "playing") return;
    const card = cards.find(c => c.id === id);
    if (!card || card.flipped || card.matched) return;
    if (selected.includes(id)) return;

    const newSel = [...selected, id];
    setCards(prev => prev.map(c => c.id === id ? { ...c, flipped: true } : c));
    setSelected(newSel);

    if (newSel.length === 2) {
      locked.current = true;
      setMoves(m => m + 1);
      const [a, b] = newSel;
      const ca = cards.find(c => c.id === a)!;
      const cb = cards.find(c => c.id === b)!;

      if (ca.emoji === cb.emoji) {
        // Match!
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === a || c.id === b ? { ...c, matched: true } : c
          ));
          setMatched(m => m + 1);
          setCombo(c => { const n = c + 1; setMaxCombo(m => Math.max(m, n)); return n; });
          setSelected([]);
          locked.current = false;
        }, 300);
      } else {
        // No match
        setCombo(0);
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === a || c.id === b ? { ...c, flipped: false } : c
          ));
          setSelected([]);
          locked.current = false;
        }, 800);
      }
    }
  }, [cards, selected, phase]);

  // Result coins
  useEffect(() => {
    if (phase !== "result") return;
    if (totalCoins > 0) addCoins(totalCoins);
  }, [phase, totalCoins, addCoins]);

  const CARD_W = Math.min(60, (280 - (lv.cols - 1) * 6) / lv.cols);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "linear-gradient(135deg, #0a1628, #06060f)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 12,
        touchAction: "none", userSelect: "none",
      }}
    >
      {/* HUD */}
      <div style={{
        width: 300, display: "flex", justifyContent: "space-between",
        color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 700,
      }}>
        <span>🧠 {lv.label}</span>
        <span style={{ color: timer <= 10 ? "#ff6b6b" : undefined }}>⏱ {timer}с</span>
        <span>📦 {moves}</span>
      </div>

      {combo > 1 && (
        <motion.div key={combo}
          initial={{ scale: 1.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          style={{ fontSize: 14, fontWeight: 800, color: "#ffd700" }}
        >{combo}x COMBO!</motion.div>
      )}

      {/* Coin FX */}
      <AnimatePresence>
        {showFx && (
          <motion.div
            initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -40 }}
            transition={{ duration: 1 }}
            style={{ position: "absolute", top: 80, fontSize: 18, fontWeight: 900, color: "#ffd700" }}
          >{showFx}</motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${lv.cols}, ${CARD_W}px)`,
        gap: 6,
        padding: 16,
      }}>
        {cards.map(card => (
          <motion.div
            key={card.id}
            onClick={() => handleTap(card.id)}
            animate={{
              rotateY: card.flipped || card.matched ? 180 : 0,
              scale: card.matched ? 0.9 : 1,
              opacity: card.matched ? 0.5 : 1,
            }}
            transition={{ duration: 0.3 }}
            style={{
              width: CARD_W, height: CARD_W * 1.2,
              borderRadius: 10,
              background: card.flipped || card.matched
                ? "rgba(255,255,255,0.12)"
                : "linear-gradient(135deg, #2a3a5c, #1a2a4a)",
              border: `1px solid ${card.matched ? "rgba(100,200,100,0.3)" : "rgba(255,255,255,0.1)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: card.matched ? "default" : "pointer",
              fontSize: CARD_W * 0.5,
              transformStyle: "preserve-3d",
              boxShadow: card.flipped && !card.matched
                ? "0 0 12px rgba(255,255,255,0.1)"
                : "none",
            }}
          >
            {(card.flipped || card.matched) ? (
              <span style={{ transform: "rotateY(180deg)" }}>{card.emoji}</span>
            ) : (
              <span style={{ color: "rgba(255,255,255,0.15)" }}>?</span>
            )}
          </motion.div>
        ))}
      </div>

      {/* Level Up */}
      {phase === "levelUp" && (
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          style={{
            position: "absolute", fontSize: 24, fontWeight: 900, color: "#ffd700",
            textShadow: "0 0 20px rgba(255,215,0,0.5)",
          }}
        >🎉 Уровень пройден!</motion.div>
      )}

      {/* Result */}
      {phase === "result" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 12,
            background: "rgba(0,0,0,0.75)",
          }}
        >
          <span style={{ fontSize: 48 }}>🧠</span>
          <span style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>
            {timer > 0 ? "Все уровни пройдены!" : "Время вышло"}
          </span>
          <div style={{
            display: "flex", flexDirection: "column", gap: 6,
            background: "rgba(255,255,255,0.06)", borderRadius: 18, padding: "16px 28px",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
            <Row label="Пройдено уровней" value={`${timer > 0 ? levelIdx + 1 : levelIdx}/${LEVELS.length}`} />
            <Row label="Всего ходов" value={`${moves}`} />
            <Row label="Макс. комбо" value={`${maxCombo}x`} color="#ffd700" />
            <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "4px 0" }} />
            <Row label="Монеты" value={`+${totalCoins} 🪙`} color="#ffd700" />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => {
              setLevelIdx(0); setPhase("playing"); setTotalCoins(0);
              setCombo(0); setMaxCombo(0);
            }}
              style={{ ...closeBtnStyle, borderColor: "rgba(100,200,100,0.3)", color: "rgba(100,200,100,0.7)" }}>
              Ещё раз
            </button>
            <button onClick={onClose} style={closeBtnStyle}>Выйти</button>
          </div>
        </motion.div>
      )}

      {phase === "playing" && (
        <button onClick={onClose} style={closeBtnStyle}>Закрыть</button>
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