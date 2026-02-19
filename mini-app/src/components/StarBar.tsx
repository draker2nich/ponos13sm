// mini-app/src/components/StatBar.tsx
import { motion } from "framer-motion";

interface Props {
  label: string;
  value: number;
  color: string;
  icon: string;
}

export function StatBar({ label, value, color, icon }: Props) {
  const v = Math.max(0, Math.min(100, value));
  const low = v < 25;

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: 5 }}>
          <span>{icon}</span>{label}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: low ? "#ff6b6b" : "rgba(255,255,255,0.75)" }}>
          {Math.round(v)}
        </span>
      </div>
      <div style={{ height: 7, borderRadius: 7, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${v}%` }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          style={{
            height: "100%", borderRadius: 7,
            background: low
              ? "linear-gradient(90deg,#ff4d4d,#ff6b35)"
              : `linear-gradient(90deg,${color},${color}bb)`,
            boxShadow: low ? "0 0 8px #ff4d4d88" : `0 0 8px ${color}66`,
          }}
        />
      </div>
    </div>
  );
}