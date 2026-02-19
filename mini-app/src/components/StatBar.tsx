import { motion } from "framer-motion";

interface Props {
  label: string;
  value: number;   // 0–100
  color: string;
  icon: string;
}

export function StatBar({ label, value, color, icon }: Props) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: "#888" }}>{icon} {label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#555" }}>{Math.round(value)}</span>
      </div>
      <div style={{
        height: 8, borderRadius: 8, background: "#eee", overflow: "hidden",
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ height: "100%", borderRadius: 8, background: color }}
        />
      </div>
    </div>
  );
}