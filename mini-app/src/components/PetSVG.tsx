// mini-app/src/components/PetSVG.tsx
import { motion, type TargetAndTransition } from "framer-motion";
import type { PetMood, PetType } from "../api/types";

const COLORS: Record<PetType, { body: string; ear: string; belly: string }> = {
  cat:   { body: "#f4a261", ear: "#e76f51", belly: "#fde8d0" },
  dog:   { body: "#a8c5da", ear: "#7ba3bb", belly: "#daeaf4" },
  bunny: { body: "#d4a5c9", ear: "#b87bab", belly: "#f0dded" },
  bear:  { body: "#a1887f", ear: "#795548", belly: "#d7ccc8" },
};

const EYE: Record<PetMood, { ry: number; offsetY: number; blink: boolean }> = {
  happy:   { ry: 4, offsetY: -1, blink: false },
  content: { ry: 5, offsetY:  0, blink: false },
  sad:     { ry: 3, offsetY:  2, blink: false },
  hungry:  { ry: 5, offsetY:  0, blink: true  },
  sleepy:  { ry: 2, offsetY:  1, blink: false  },
};

const BODY_ANIM: Record<PetMood, TargetAndTransition> = {
  happy:   { y: [0, -10, 0], transition: { repeat: Infinity, duration: 1.2, ease: "easeInOut" } },
  content: { y: [0,  -4, 0], transition: { repeat: Infinity, duration: 2.2, ease: "easeInOut" } },
  sad:     { y: [0,   2, 0], transition: { repeat: Infinity, duration: 2.8, ease: "easeInOut" } },
  hungry:  { rotate: [-3, 3, -3], transition: { repeat: Infinity, duration: 0.5 } },
  sleepy:  { opacity: [1, 0.65, 1], transition: { repeat: Infinity, duration: 3 } },
};

const GLOW: Record<PetMood, string> = {
  happy:   "#ffd700",
  content: "#a8d8a8",
  sad:     "#6a9fd8",
  hungry:  "#ff7f50",
  sleepy:  "#c5b8d8",
};

interface Props {
  mood: PetMood;
  petType: PetType;
  evolution?: number; // 1–7
  size?: number;
  isReacting?: boolean;
}

export function PetSVG({ mood, petType, evolution = 1, size = 160, isReacting = false }: Props) {
  const c = COLORS[petType] ?? COLORS.cat;
  const eye = EYE[mood] ?? EYE.content;
  const scale = 1 + (evolution - 1) * 0.06;
  const sz = size * scale;
  const glow = isReacting ? "#ffd700" : GLOW[mood];

  return (
    <motion.div
      animate={BODY_ANIM[mood]}
      style={{ filter: `drop-shadow(0 0 20px ${glow}66)`, display: "inline-block" }}
    >
      <svg width={sz} height={sz} viewBox="0 0 160 160">
        {/* Tail */}
        <motion.path
          d="M115 130 Q145 115 140 98 Q135 86 124 92"
          fill="none" stroke={c.body} strokeWidth="13" strokeLinecap="round"
          animate={{ d: [
            "M115 130 Q145 115 140 98 Q135 86 124 92",
            "M115 130 Q140 120 142 103 Q140 88 127 91",
            "M115 130 Q145 115 140 98 Q135 86 124 92",
          ]}}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        />
        {/* Body */}
        <ellipse cx="80" cy="116" rx="42" ry="34" fill={c.body} />
        <ellipse cx="80" cy="120" rx="25" ry="21" fill={c.belly} />
        {/* Head */}
        <circle cx="80" cy="78" r="36" fill={c.body} />
        {/* Ears by type */}
        {petType === "bunny" && <>
          <ellipse cx="58" cy="44" rx="9" ry="23" fill={c.body} />
          <ellipse cx="58" cy="44" rx="5" ry="18" fill={c.ear} />
          <ellipse cx="102" cy="44" rx="9" ry="23" fill={c.body} />
          <ellipse cx="102" cy="44" rx="5" ry="18" fill={c.ear} />
        </>}
        {petType === "bear" && <>
          <circle cx="54" cy="48" r="14" fill={c.body} />
          <circle cx="54" cy="48" r="9"  fill={c.ear} />
          <circle cx="106" cy="48" r="14" fill={c.body} />
          <circle cx="106" cy="48" r="9"  fill={c.ear} />
        </>}
        {petType === "dog" && <>
          <ellipse cx="51" cy="58" rx="17" ry="12" fill={c.ear} transform="rotate(-30 51 58)" />
          <ellipse cx="109" cy="58" rx="17" ry="12" fill={c.ear} transform="rotate(30 109 58)" />
        </>}
        {petType === "cat" && <>
          <polygon points="50,62 41,38 63,52" fill={c.body} />
          <polygon points="52,60 45,42 62,52" fill={c.ear} />
          <polygon points="110,62 119,38 97,52" fill={c.body} />
          <polygon points="108,60 115,42 98,52" fill={c.ear} />
        </>}
        {/* Eyes */}
        {(["left","right"] as const).map((side) => {
          const cx = side === "left" ? 67 : 93;
          const cy = 80 + eye.offsetY;
          return (
            <g key={side}>
              <motion.ellipse cx={cx} cy={cy} rx={6} ry={eye.ry} fill="#2d2d2d"
                animate={eye.blink ? { ry: [eye.ry, 0.5, eye.ry] } : {}}
                transition={{ repeat: Infinity, duration: 2.5, repeatDelay: 1.5 }}
              />
              <circle cx={cx + 2} cy={cy - 2} r={2} fill="white" opacity={0.7} />
            </g>
          );
        })}
        {/* Nose */}
        <ellipse cx="80" cy="89" rx={petType === "dog" ? 7 : 4} ry={petType === "dog" ? 5 : 3} fill="#e76f51" />
        {/* Mouth */}
        {(mood === "happy" || mood === "content") && (
          <path d="M74 94 Q80 100 86 94" fill="none" stroke="#e76f51" strokeWidth="2" strokeLinecap="round" />
        )}
        {mood === "hungry" && (
          <path d="M72 93 Q80 101 88 93" fill="none" stroke="#e76f51" strokeWidth="2.5" strokeLinecap="round" />
        )}
        {(mood === "sad" || mood === "sleepy") && (
          <path d="M74 97 Q80 92 86 97" fill="none" stroke="#e76f51" strokeWidth="2" strokeLinecap="round" />
        )}
        {/* ZZZ sleepy */}
        {mood === "sleepy" && <>
          <motion.text x="106" y="62" fontSize="13" fill="#a0c4ff" fontWeight="bold"
            animate={{ opacity: [0,1,0], x:[106,114], y:[62,46] }}
            transition={{ repeat: Infinity, duration: 2 }}>z</motion.text>
          <motion.text x="116" y="50" fontSize="17" fill="#a0c4ff" fontWeight="bold"
            animate={{ opacity: [0,1,0], x:[116,127], y:[50,31] }}
            transition={{ repeat: Infinity, duration: 2, delay: 0.6 }}>Z</motion.text>
        </>}
        {/* Stars happy */}
        {(mood === "happy" || isReacting) && <>
          <motion.text x="20" y="55" fontSize="15"
            animate={{ opacity:[0,1,0], y:[55,35] }}
            transition={{ repeat: Infinity, duration: 1.6, delay: 0 }}>✨</motion.text>
          <motion.text x="118" y="58" fontSize="13"
            animate={{ opacity:[0,1,0], y:[58,38] }}
            transition={{ repeat: Infinity, duration: 1.6, delay: 0.5 }}>⭐</motion.text>
        </>}
        {/* Crown evolution */}
        {evolution >= 5 && <text x="65" y="32" fontSize="20">👑</text>}
      </svg>
    </motion.div>
  );
}