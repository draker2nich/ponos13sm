import type { LucideIcon } from "lucide-react";
import { clampPercent } from "../lib/format";

const SIZE = 36;
const R = 15;
const CIRC = 2 * Math.PI * R;
const LOW = 25;

export function StatusRing({ value, icon: Icon, label }: { value: number; icon: LucideIcon; label: string }) {
  const v = clampPercent(value);
  const low = v < LOW;
  return (
    <div className={`ring${low ? " ring--low" : ""}`} title={`${label}: ${Math.round(v)}`} aria-label={`${label} ${Math.round(v)}`}>
      <svg className="ring__gauge" width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} className="ring__track" />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          className="ring__value"
          strokeDasharray={`${(v / 100) * CIRC} ${CIRC}`}
        />
      </svg>
      <Icon size={16} strokeWidth={1.75} />
    </div>
  );
}
