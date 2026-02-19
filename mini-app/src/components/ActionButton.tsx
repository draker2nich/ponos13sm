import { motion } from "framer-motion";
import { useCooldown } from "../hooks/useCooldown";
import { usePetStore } from "../store/usePetStore";
import type { ActionType } from "../api/types";

const ACTION_META: Record<ActionType, { label: string; emoji: string; color: string }> = {
  feed:  { label: "Покормить", emoji: "🍎", color: "#f4c97a" },
  play:  { label: "Играть",    emoji: "🎾", color: "#a8d8a8" },
  pet:   { label: "Погладить", emoji: "🤍", color: "#c5b8d8" },
};

function formatCooldown(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}ч ${m}м`;
  if (m > 0) return `${m}м`;
  return `${s}с`;
}

export function ActionButton({ action }: { action: ActionType }) {
  const performAction = usePetStore((s) => s.performAction);
  const remaining = useCooldown(action);
  const { label, emoji, color } = ACTION_META[action];
  const disabled = remaining > 0;

  return (
    <motion.button
      whileTap={disabled ? {} : { scale: 0.93 }}
      onClick={() => { if (!disabled) performAction(action); }}
      style={{
        flex: 1, padding: "14px 8px", borderRadius: 18, border: "none",
        background: disabled ? "#f0f0f0" : color,
        color: disabled ? "#aaa" : "#444",
        fontWeight: 600, fontSize: 13, cursor: disabled ? "not-allowed" : "pointer",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        transition: "background 0.2s",
        boxShadow: disabled ? "none" : `0 4px 16px ${color}66`,
      }}
    >
      <span style={{ fontSize: 24 }}>{emoji}</span>
      <span>{disabled ? formatCooldown(remaining) : label}</span>
    </motion.button>
  );
}