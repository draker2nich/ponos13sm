import { motion } from "framer-motion";

export function StreakBadge({ streak }: { streak: number }) {
  if (streak === 0) return null;
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        background: "#fff3e0",
        borderRadius: 20,
        padding: "4px 12px",
        fontSize: 13,
        fontWeight: 700,
        color: "#e65100",
      }}
    >
      🔥 {streak} {streak === 1 ? "день" : streak < 5 ? "дня" : "дней"}
    </motion.div>
  );
}