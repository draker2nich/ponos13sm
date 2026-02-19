import { motion, type TargetAndTransition } from "framer-motion";
import type { PetMood, PetType } from "../api/types";

const MOOD_COLORS: Record<PetMood, string> = {
  happy:   "#a8d8a8",
  content: "#b8c9e1",
  sad:     "#b0b8c1",
  hungry:  "#f4c97a",
  sleepy:  "#c5b8d8",
};

const MOOD_ANIMATIONS: Record<PetMood, TargetAndTransition> = {
  happy:   { y: [0, -8, 0],      transition: { repeat: Infinity, duration: 1.2 } },
  content: { y: [0, -3, 0],      transition: { repeat: Infinity, duration: 2.0 } },
  sad:     { y: [0,  2, 0],      transition: { repeat: Infinity, duration: 2.5 } },
  hungry:  { rotate: [-3, 3, -3],transition: { repeat: Infinity, duration: 0.6 } },
  sleepy:  { opacity: [1, 0.6, 1],transition: { repeat: Infinity, duration: 3.0 } },
};

const PET_EMOJI: Record<PetType, string> = {
  cat: "🐱", dog: "🐶", bunny: "🐰", bear: "🐻",
};

interface Props {
  mood: PetMood;
  petType: PetType;
  size?: number;
}

export function PetAvatar({ mood, petType, size = 120 }: Props) {
  return (
    <motion.div
      animate={MOOD_ANIMATIONS[mood]}
      style={{
        width: size, height: size,
        borderRadius: "50%",
        background: MOOD_COLORS[mood],
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.5,
        boxShadow: `0 8px 32px ${MOOD_COLORS[mood]}88`,
        cursor: "default",
        userSelect: "none",
      }}
    >
      {PET_EMOJI[petType]}
    </motion.div>
  );
}