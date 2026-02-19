// mini-app/src/components/StreakBadge.tsx
import { motion } from "framer-motion";

export function StreakBadge({ streak }: { streak: number }) {
  if (!streak) return null;
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        background: "linear-gradient(135deg,#ff6b3522,#f7c59f11)",
        border: "1px solid #ff6b3540",
        borderRadius: 20, padding: "5px 12px",
        fontSize: 12, fontWeight: 800, color: "#ff9a5c",
        flexShrink: 0,
      }}
    >
      🔥 {streak}{" "}
      {streak === 1 ? "день" : streak < 5 ? "дня" : "дней"}
    </motion.div>
  );
}