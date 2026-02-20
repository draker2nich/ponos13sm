// mini-app/src/components/PetSVG.tsx
import { motion, type TargetAndTransition } from "framer-motion";
import type { PetMood, PetType } from "../api/types";

const BODY_ANIM: Record<PetMood, TargetAndTransition> = {
  happy:   { rotate: [-2, 2, -2], transition: { repeat: Infinity, duration: 1.8, ease: "easeInOut" } },
  content: {},  // статичный — пусть пользователь двигает сам
  sad:     { rotate: [0, -3, 0],  transition: { repeat: Infinity, duration: 3, ease: "easeInOut" } },
  hungry:  { scaleY: [1, 0.96, 1], transition: { repeat: Infinity, duration: 0.7 } },
  sleepy:  { opacity: [1, 0.6, 1], transition: { repeat: Infinity, duration: 3 } },
};

const GLOW: Record<PetMood, string> = {
  happy:   "#ffd700",
  content: "rgba(255,255,255,0.5)",
  sad:     "#6a9fd8",
  hungry:  "#ff7f50",
  sleepy:  "#c5b8d8",
};

interface Props {
  mood: PetMood;
  petType: PetType;
  evolution?: number;
  /** px number или CSS строка, напр. "clamp(140px,42vw,200px)" */
  size?: number | string;
  isReacting?: boolean;
}

export function PetSVG({ mood, petType, evolution = 1, size = 160, isReacting = false }: Props) {
  const glow = isReacting ? "#ffd700" : GLOW[mood];
  const dim = typeof size === "number" ? `${size}px` : size;

  return (
    <motion.div
      animate={isReacting ? { scale: [1, 1.08, 1] } : BODY_ANIM[mood]}
      transition={isReacting ? { duration: 0.35 } : undefined}
      style={{
        filter: `drop-shadow(0 0 20px ${glow}55)`,
        display: "inline-block",
        position: "relative",
        width: dim,
        height: dim,
      }}
    >
      <img
        src={`/sprites/${petType}.svg`}
        style={{ width: "100%", height: "100%", display: "block", objectFit: "contain" }}
        draggable={false}  // чтобы браузер не перехватывал drag у картинки
      />
      {evolution >= 5 && (
        <div style={{
          position: "absolute", top: "-8%", left: "50%",
          transform: "translateX(-50%)",
          fontSize: `calc(${dim} * 0.18)`, lineHeight: 1,
          pointerEvents: "none",
        }}>👑</div>
      )}
    </motion.div>
  );
}