// mini-app/src/components/PetSVG.tsx
import { motion, type TargetAndTransition } from "framer-motion";
import type { PetMood, PetType } from "../api/types";

const BODY_ANIM: Record<PetMood, TargetAndTransition> = {
  happy:   { y: [0, -10, 0], transition: { repeat: Infinity, duration: 1.2, ease: "easeInOut" } },
  content: { y: [0, -4,  0], transition: { repeat: Infinity, duration: 2.2, ease: "easeInOut" } },
  sad:     { y: [0,  2,  0], transition: { repeat: Infinity, duration: 2.8, ease: "easeInOut" } },
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
  evolution?: number;
  size?: number;
  isReacting?: boolean;
}

export function PetSVG({ mood, petType, evolution = 1, size = 160, isReacting = false }: Props) {
  const sz = Math.round(size * (1 + (evolution - 1) * 0.05));
  const glow = isReacting ? "#ffd700" : GLOW[mood];

  return (
    <motion.div
      animate={BODY_ANIM[mood]}
      style={{
        filter: `drop-shadow(0 0 20px ${glow}66)`,
        display: "inline-block",
        position: "relative",
      }}
    >
      <img
        src={`/pets/${petType}.svg`}
        width={sz}
        height={sz}
        style={{ display: "block" }}
      />
      {evolution >= 5 && (
        <div style={{
          position: "absolute", top: -8, left: "50%",
          transform: "translateX(-50%)",
          fontSize: sz * 0.18, lineHeight: 1, pointerEvents: "none",
        }}>👑</div>
      )}
    </motion.div>
  );
}