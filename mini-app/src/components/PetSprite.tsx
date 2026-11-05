import { useState } from "react";
import { Crown } from "lucide-react";
import type { PetMood, PetType } from "../api";
import "./PetSprite.css";

const FALLBACK: Record<PetType, string> = { cat: "🐱", dog: "🐶", bunny: "🐰", bear: "🐻" };
const CROWN_FROM_LEVEL = 8;

interface Props {
  type: PetType;
  mood: PetMood;
  level?: number;
  reacting?: boolean;
  size?: string;
}

export function PetSprite({ type, mood, level = 1, reacting = false, size = "160px" }: Props) {
  const [broken, setBroken] = useState(false);

  return (
    <div className={`sprite sprite--${reacting ? "react" : mood}`} style={{ width: size, height: size }}>
      {broken ? (
        <span className="sprite__fallback">{FALLBACK[type]}</span>
      ) : (
        <img src={`${import.meta.env.BASE_URL}sprites/${type}.webp`} alt="" draggable={false} onError={() => setBroken(true)} />
      )}
      {level >= CROWN_FROM_LEVEL && <Crown className="sprite__crown" strokeWidth={1.5} />}
    </div>
  );
}
