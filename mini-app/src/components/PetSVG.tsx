// mini-app/src/components/PetSVG.tsx
import { motion, type TargetAndTransition } from "framer-motion";
import type { PetMood, PetType } from "../api/types";

// ─── Анимации по настроению ───────────────────────────────────────────────────

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

// ─── Глаза по настроению ──────────────────────────────────────────────────────

interface EyeConfig { open: boolean; sad: boolean; sleepy: boolean; blink: boolean }
const EYE_CFG: Record<PetMood, EyeConfig> = {
  happy:   { open: true,  sad: false, sleepy: false, blink: false },
  content: { open: true,  sad: false, sleepy: false, blink: false },
  sad:     { open: true,  sad: true,  sleepy: false, blink: false },
  hungry:  { open: true,  sad: false, sleepy: false, blink: true  },
  sleepy:  { open: false, sad: false, sleepy: true,  blink: false },
};

function Eye({ cx, cy, cfg }: { cx: number; cy: number; cfg: EyeConfig }) {
  if (cfg.sleepy) {
    // закрытый глаз — дуга
    return (
      <path
        d={`M${cx - 6} ${cy} Q${cx} ${cy - 5} ${cx + 6} ${cy}`}
        fill="none" stroke="#3d2b1f" strokeWidth="2.5" strokeLinecap="round"
      />
    );
  }
  if (cfg.sad) {
    return (
      <g>
        <ellipse cx={cx} cy={cy} rx={5} ry={4} fill="#3d2b1f" />
        {/* грустные брови */}
        <path
          d={`M${cx - 6} ${cy - 7} Q${cx} ${cy - 4} ${cx + 6} ${cy - 7}`}
          fill="none" stroke="#3d2b1f" strokeWidth="2" strokeLinecap="round"
        />
        <circle cx={cx + 2} cy={cy - 1} r={1.5} fill="white" opacity={0.6} />
      </g>
    );
  }
  return (
    <g>
      <motion.ellipse
        cx={cx} cy={cy} rx={5.5}
        animate={cfg.blink ? { ry: [5, 0.5, 5] } : { ry: 5 }}
        transition={{ repeat: Infinity, duration: 2.5, repeatDelay: 2 }}
        fill="#3d2b1f"
      />
      <circle cx={cx + 2} cy={cy - 2} r={1.8} fill="white" opacity={0.65} />
    </g>
  );
}

function Mouth({ mood, cx, cy }: { mood: PetMood; cx: number; cy: number }) {
  if (mood === "happy") return (
    <path d={`M${cx-7} ${cy} Q${cx} ${cy+8} ${cx+7} ${cy}`}
      fill="none" stroke="#c0634c" strokeWidth="2.2" strokeLinecap="round" />
  );
  if (mood === "content") return (
    <path d={`M${cx-5} ${cy} Q${cx} ${cy+5} ${cx+5} ${cy}`}
      fill="none" stroke="#c0634c" strokeWidth="2" strokeLinecap="round" />
  );
  if (mood === "hungry") return (
    <path d={`M${cx-7} ${cy-2} Q${cx} ${cy+10} ${cx+7} ${cy-2}`}
      fill="none" stroke="#c0634c" strokeWidth="2.5" strokeLinecap="round" />
  );
  // sad / sleepy
  return (
    <path d={`M${cx-5} ${cy+4} Q${cx} ${cy} ${cx+5} ${cy+4}`}
      fill="none" stroke="#c0634c" strokeWidth="2" strokeLinecap="round" />
  );
}

// ─── SVG животных ─────────────────────────────────────────────────────────────

function CatSVG({ mood, sz }: { mood: PetMood; sz: number }) {
  const cfg = EYE_CFG[mood];
  const s = sz / 160;
  return (
    <svg width={sz} height={sz} viewBox="0 0 160 160">
      {/* хвост */}
      <motion.path
        d="M115 132 Q148 116 142 96 Q136 82 124 90"
        fill="none" stroke="#e8a87c" strokeWidth="14" strokeLinecap="round"
        animate={{ d: [
          "M115 132 Q148 116 142 96 Q136 82 124 90",
          "M115 132 Q143 122 144 100 Q142 85 128 88",
          "M115 132 Q148 116 142 96 Q136 82 124 90",
        ]}}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      />
      {/* тело */}
      <ellipse cx="80" cy="118" rx="44" ry="34" fill="#e8a87c" />
      <ellipse cx="80" cy="122" rx="27" ry="22" fill="#fde8d0" />
      {/* голова */}
      <circle cx="80" cy="78" r="37" fill="#e8a87c" />
      {/* кошачьи уши */}
      <polygon points="48,62 38,34 64,52" fill="#e8a87c" />
      <polygon points="50,60 42,38 63,51" fill="#e07060" />
      <polygon points="112,62 122,34 96,52" fill="#e8a87c" />
      <polygon points="110,60 118,38 97,51" fill="#e07060" />
      {/* щёки */}
      <ellipse cx="60" cy="88" rx="9" ry="5" fill="#f4b8a8" opacity="0.55" />
      <ellipse cx="100" cy="88" rx="9" ry="5" fill="#f4b8a8" opacity="0.55" />
      {/* глаза */}
      <Eye cx={67} cy={79} cfg={cfg} />
      <Eye cx={93} cy={79} cfg={cfg} />
      {/* нос */}
      <ellipse cx="80" cy="90" rx="4" ry="3" fill="#e07060" />
      {/* усы */}
      <line x1="46" y1="89" x2="70" y2="91" stroke="#c0634c" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      <line x1="46" y1="93" x2="70" y2="93" stroke="#c0634c" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      <line x1="90" y1="91" x2="114" y2="89" stroke="#c0634c" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      <line x1="90" y1="93" x2="114" y2="93" stroke="#c0634c" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      {/* рот */}
      <Mouth mood={mood} cx={80} cy={95} />
      {/* лапки */}
      <ellipse cx="58" cy="148" rx="14" ry="9" fill="#e8a87c" />
      <ellipse cx="102" cy="148" rx="14" ry="9" fill="#e8a87c" />
      {/* ZZZ */}
      {mood === "sleepy" && <>
        <motion.text x="106" y="58" fontSize="13" fill="#a0c4ff" fontWeight="bold"
          animate={{ opacity: [0,1,0], x:[106,114], y:[58,44] }}
          transition={{ repeat: Infinity, duration: 2 }}>z</motion.text>
        <motion.text x="117" y="46" fontSize="18" fill="#a0c4ff" fontWeight="bold"
          animate={{ opacity: [0,1,0], x:[117,128], y:[46,28] }}
          transition={{ repeat: Infinity, duration: 2, delay: 0.6 }}>Z</motion.text>
      </>}
      {/* ✨ happy */}
      {mood === "happy" && <>
        <motion.text x="18" y="52" fontSize="15"
          animate={{ opacity:[0,1,0], y:[52,34] }}
          transition={{ repeat: Infinity, duration: 1.6 }}>✨</motion.text>
        <motion.text x="118" y="55" fontSize="13"
          animate={{ opacity:[0,1,0], y:[55,37] }}
          transition={{ repeat: Infinity, duration: 1.6, delay: 0.5 }}>⭐</motion.text>
      </>}
    </svg>
  );
}

function DogSVG({ mood, sz }: { mood: PetMood; sz: number }) {
  const cfg = EYE_CFG[mood];
  return (
    <svg width={sz} height={sz} viewBox="0 0 160 160">
      {/* хвост */}
      <motion.path
        d="M116 128 Q150 110 145 90 Q140 76 128 84"
        fill="none" stroke="#a8c5da" strokeWidth="14" strokeLinecap="round"
        animate={{ d: [
          "M116 128 Q150 110 145 90 Q140 76 128 84",
          "M116 128 Q146 118 148 94 Q146 78 131 82",
          "M116 128 Q150 110 145 90 Q140 76 128 84",
        ]}}
        transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
      />
      {/* тело */}
      <ellipse cx="80" cy="118" rx="44" ry="34" fill="#a8c5da" />
      <ellipse cx="80" cy="122" rx="27" ry="22" fill="#daeaf4" />
      {/* голова */}
      <circle cx="80" cy="76" r="37" fill="#a8c5da" />
      {/* висячие уши */}
      <ellipse cx="47" cy="72" rx="18" ry="24" fill="#7ba3bb" transform="rotate(-15 47 72)" />
      <ellipse cx="113" cy="72" rx="18" ry="24" fill="#7ba3bb" transform="rotate(15 113 72)" />
      {/* щёки */}
      <ellipse cx="60" cy="87" rx="10" ry="6" fill="#b8d8e8" opacity="0.55" />
      <ellipse cx="100" cy="87" rx="10" ry="6" fill="#b8d8e8" opacity="0.55" />
      {/* глаза */}
      <Eye cx={67} cy={77} cfg={cfg} />
      <Eye cx={93} cy={77} cfg={cfg} />
      {/* большой нос собаки */}
      <ellipse cx="80" cy="89" rx="8" ry="6" fill="#4a6fa5" />
      <ellipse cx="78" cy="87" rx="3" ry="2" fill="white" opacity="0.4" />
      {/* рот */}
      <Mouth mood={mood} cx={80} cy={96} />
      {/* лапки */}
      <ellipse cx="58" cy="148" rx="15" ry="9" fill="#a8c5da" />
      <ellipse cx="102" cy="148" rx="15" ry="9" fill="#a8c5da" />
      {/* язык при hungry */}
      {mood === "hungry" && (
        <motion.ellipse cx="80" cy="103" rx="7" ry="9" fill="#ff8fa3"
          animate={{ ry: [9, 10, 9] }} transition={{ repeat: Infinity, duration: 0.8 }} />
      )}
      {mood === "sleepy" && <>
        <motion.text x="106" y="56" fontSize="13" fill="#a0c4ff" fontWeight="bold"
          animate={{ opacity: [0,1,0], x:[106,114], y:[56,42] }}
          transition={{ repeat: Infinity, duration: 2 }}>z</motion.text>
        <motion.text x="117" y="44" fontSize="18" fill="#a0c4ff" fontWeight="bold"
          animate={{ opacity: [0,1,0], x:[117,128], y:[44,26] }}
          transition={{ repeat: Infinity, duration: 2, delay: 0.6 }}>Z</motion.text>
      </>}
      {mood === "happy" && <>
        <motion.text x="18" y="50" fontSize="15"
          animate={{ opacity:[0,1,0], y:[50,32] }}
          transition={{ repeat: Infinity, duration: 1.6 }}>✨</motion.text>
        <motion.text x="118" y="53" fontSize="13"
          animate={{ opacity:[0,1,0], y:[53,35] }}
          transition={{ repeat: Infinity, duration: 1.6, delay: 0.5 }}>⭐</motion.text>
      </>}
    </svg>
  );
}

function BunnySVG({ mood, sz }: { mood: PetMood; sz: number }) {
  const cfg = EYE_CFG[mood];
  return (
    <svg width={sz} height={sz} viewBox="0 0 160 160">
      {/* длинные уши */}
      <ellipse cx="58" cy="36" rx="10" ry="28" fill="#d4a5c9" />
      <ellipse cx="58" cy="36" rx="6" ry="22" fill="#f2c8e4" />
      <ellipse cx="102" cy="36" rx="10" ry="28" fill="#d4a5c9" />
      <ellipse cx="102" cy="36" rx="6" ry="22" fill="#f2c8e4" />
      {/* тело */}
      <ellipse cx="80" cy="118" rx="40" ry="33" fill="#d4a5c9" />
      <ellipse cx="80" cy="122" rx="24" ry="21" fill="#f0dded" />
      {/* хвост-помпон */}
      <circle cx="118" cy="128" r="9" fill="#f9eef7" />
      {/* голова */}
      <circle cx="80" cy="78" r="36" fill="#d4a5c9" />
      {/* щёки */}
      <ellipse cx="60" cy="88" rx="9" ry="5" fill="#f4a8cc" opacity="0.55" />
      <ellipse cx="100" cy="88" rx="9" ry="5" fill="#f4a8cc" opacity="0.55" />
      {/* глаза */}
      <Eye cx={67} cy={78} cfg={cfg} />
      <Eye cx={93} cy={78} cfg={cfg} />
      {/* носик кролика */}
      <ellipse cx="80" cy="89" rx="4" ry="3" fill="#e07090" />
      <line x1="80" y1="92" x2="76" y2="97" stroke="#c0507a" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="80" y1="92" x2="84" y2="97" stroke="#c0507a" strokeWidth="1.5" strokeLinecap="round" />
      {/* усы */}
      <line x1="44" y1="89" x2="68" y2="91" stroke="#b0507a" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <line x1="44" y1="93" x2="68" y2="93" stroke="#b0507a" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <line x1="92" y1="91" x2="116" y2="89" stroke="#b0507a" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      <line x1="92" y1="93" x2="116" y2="93" stroke="#b0507a" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      {/* рот */}
      <Mouth mood={mood} cx={80} cy={95} />
      {/* лапки */}
      <ellipse cx="60" cy="148" rx="14" ry="8" fill="#d4a5c9" />
      <ellipse cx="100" cy="148" rx="14" ry="8" fill="#d4a5c9" />
      {mood === "sleepy" && <>
        <motion.text x="106" y="56" fontSize="13" fill="#a0c4ff" fontWeight="bold"
          animate={{ opacity: [0,1,0], x:[106,114], y:[56,42] }}
          transition={{ repeat: Infinity, duration: 2 }}>z</motion.text>
        <motion.text x="117" y="44" fontSize="18" fill="#a0c4ff" fontWeight="bold"
          animate={{ opacity: [0,1,0], x:[117,128], y:[44,26] }}
          transition={{ repeat: Infinity, duration: 2, delay: 0.6 }}>Z</motion.text>
      </>}
      {mood === "happy" && <>
        <motion.text x="18" y="52" fontSize="15"
          animate={{ opacity:[0,1,0], y:[52,34] }}
          transition={{ repeat: Infinity, duration: 1.6 }}>✨</motion.text>
        <motion.text x="118" y="55" fontSize="13"
          animate={{ opacity:[0,1,0], y:[55,37] }}
          transition={{ repeat: Infinity, duration: 1.6, delay: 0.5 }}>⭐</motion.text>
      </>}
    </svg>
  );
}

function BearSVG({ mood, sz }: { mood: PetMood; sz: number }) {
  const cfg = EYE_CFG[mood];
  return (
    <svg width={sz} height={sz} viewBox="0 0 160 160">
      {/* тело */}
      <ellipse cx="80" cy="120" rx="45" ry="34" fill="#a1887f" />
      <ellipse cx="80" cy="124" rx="28" ry="22" fill="#d7ccc8" />
      {/* голова */}
      <circle cx="80" cy="78" r="37" fill="#a1887f" />
      {/* круглые уши медведя */}
      <circle cx="52" cy="48" r="16" fill="#a1887f" />
      <circle cx="52" cy="48" r="10" fill="#795548" />
      <circle cx="108" cy="48" r="16" fill="#a1887f" />
      <circle cx="108" cy="48" r="10" fill="#795548" />
      {/* мордочка */}
      <ellipse cx="80" cy="89" rx="16" ry="12" fill="#d7ccc8" />
      {/* щёки */}
      <ellipse cx="58" cy="84" rx="9" ry="5" fill="#d4a090" opacity="0.45" />
      <ellipse cx="102" cy="84" rx="9" ry="5" fill="#d4a090" opacity="0.45" />
      {/* глаза */}
      <Eye cx={67} cy={77} cfg={cfg} />
      <Eye cx={93} cy={77} cfg={cfg} />
      {/* нос */}
      <ellipse cx="80" cy="88" rx="6" ry="4.5" fill="#5d4037" />
      <ellipse cx="78" cy="86" rx="2.5" ry="1.8" fill="white" opacity="0.35" />
      {/* рот */}
      <Mouth mood={mood} cx={80} cy={95} />
      {/* лапки */}
      <ellipse cx="56" cy="148" rx="17" ry="10" fill="#a1887f" />
      <ellipse cx="104" cy="148" rx="17" ry="10" fill="#a1887f" />
      {/* коготки */}
      {[50,56,62].map(x => (
        <line key={x} x1={x} y1="152" x2={x} y2="158" stroke="#795548" strokeWidth="1.5" strokeLinecap="round" />
      ))}
      {[98,104,110].map(x => (
        <line key={x} x1={x} y1="152" x2={x} y2="158" stroke="#795548" strokeWidth="1.5" strokeLinecap="round" />
      ))}
      {mood === "sleepy" && <>
        <motion.text x="106" y="56" fontSize="13" fill="#a0c4ff" fontWeight="bold"
          animate={{ opacity: [0,1,0], x:[106,114], y:[56,42] }}
          transition={{ repeat: Infinity, duration: 2 }}>z</motion.text>
        <motion.text x="117" y="44" fontSize="18" fill="#a0c4ff" fontWeight="bold"
          animate={{ opacity: [0,1,0], x:[117,128], y:[44,26] }}
          transition={{ repeat: Infinity, duration: 2, delay: 0.6 }}>Z</motion.text>
      </>}
      {mood === "happy" && <>
        <motion.text x="18" y="50" fontSize="15"
          animate={{ opacity:[0,1,0], y:[50,32] }}
          transition={{ repeat: Infinity, duration: 1.6 }}>✨</motion.text>
        <motion.text x="118" y="53" fontSize="13"
          animate={{ opacity:[0,1,0], y:[53,35] }}
          transition={{ repeat: Infinity, duration: 1.6, delay: 0.5 }}>⭐</motion.text>
      </>}
    </svg>
  );
}

// ─── Главный компонент ────────────────────────────────────────────────────────

interface Props {
  mood: PetMood;
  petType: PetType;
  evolution?: number;
  size?: number;
  isReacting?: boolean;
}

const PET_MAP: Record<PetType, (mood: PetMood, sz: number) => React.ReactNode> = {
  cat:   (m, s) => <CatSVG   mood={m} sz={s} />,
  dog:   (m, s) => <DogSVG   mood={m} sz={s} />,
  bunny: (m, s) => <BunnySVG mood={m} sz={s} />,
  bear:  (m, s) => <BearSVG  mood={m} sz={s} />,
};

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
      {(PET_MAP[petType] ?? PET_MAP.cat)(mood, sz)}
      {/* Корона при высокой эволюции */}
      {evolution >= 5 && (
        <div style={{
          position: "absolute", top: -8, left: "50%",
          transform: "translateX(-50%)",
          fontSize: sz * 0.18, lineHeight: 1, pointerEvents: "none",
        }}>👑</div>
      )}
      {/* Реакция при isReacting */}
      {isReacting && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 0 }}
          animate={{ opacity: [0, 1, 0], scale: 1.2, y: -sz * 0.4 }}
          transition={{ duration: 0.8 }}
          style={{
            position: "absolute", top: 0, left: "50%",
            transform: "translateX(-50%)",
            fontSize: sz * 0.22, pointerEvents: "none",
          }}
        >😋</motion.div>
      )}
    </motion.div>
  );
}