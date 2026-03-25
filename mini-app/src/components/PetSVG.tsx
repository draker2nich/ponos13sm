// mini-app/src/components/PetSVG.tsx
// Pure CSS animations — no framer-motion overhead
import type { PetMood, PetType } from "../api/types";

const MOOD_ANIM: Record<PetMood, string> = {
  happy:   "pet-happy",
  content: "pet-idle",
  sad:     "pet-sad",
  hungry:  "pet-hungry",
  sleepy:  "pet-sleepy",
};

const GLOW: Record<PetMood, string> = {
  happy:   "rgba(255,215,0,0.30)",
  content: "rgba(255,255,255,0.20)",
  sad:     "rgba(106,159,216,0.25)",
  hungry:  "rgba(255,127,80,0.25)",
  sleepy:  "rgba(197,184,216,0.25)",
};

interface Props {
  mood: PetMood;
  petType: PetType;
  evolution?: number;
  size?: number | string;
  isReacting?: boolean;
}

export function PetSVG({ mood, petType, evolution = 1, size = 160, isReacting = false }: Props) {
  const glow = isReacting ? "rgba(255,215,0,0.35)" : GLOW[mood];
  const dim = typeof size === "number" ? `${size}px` : size;
  const anim = isReacting ? "pet-react" : MOOD_ANIM[mood];

  return (
    <div
      style={{
        filter: `drop-shadow(0 0 16px ${glow})`,
        display: "inline-block",
        position: "relative",
        width: dim,
        height: dim,
        animation: `${anim} ${isReacting ? "0.35s" : mood === "happy" ? "1.8s" : mood === "hungry" ? "0.7s" : "3s"} ease-in-out infinite`,
        willChange: "transform",
      }}
    >
      <img
        src={`/sprites/${petType}.svg`}
        style={{ width: "100%", height: "100%", display: "block", objectFit: "contain" }}
        draggable={false}
      />
      {evolution >= 5 && (
        <div style={{
          position: "absolute", top: "-8%", left: "50%",
          transform: "translateX(-50%)",
          fontSize: `calc(${dim} * 0.18)`, lineHeight: 1,
          pointerEvents: "none",
        }}>👑</div>
      )}
    </div>
  );
}