// mini-app/src/components/CategoryMenu.tsx
import { motion, AnimatePresence } from "framer-motion";
import type { MenuCategory } from "../store/useMenuStore";

/* ── Placeholder content per category ─────────────────────────────────────── */
const MENU_CONTENT: Record<MenuCategory, React.ReactNode> = {
  feed: (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 13, color: "rgba(0,0,0,0.45)", textAlign: "center", margin: 0 }}>
        Выбери угощение для питомца
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
        {["🍎 Яблоко", "🍗 Курица", "🥕 Морковь", "🐟 Рыба", "🧁 Кекс", "🍖 Мясо"].map(f => (
          <button key={f} style={{
            padding: "10px 16px", borderRadius: 18,
            background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.75)",
            fontSize: 13, fontWeight: 600, color: "rgba(0,0,0,0.65)",
            cursor: "pointer", fontFamily: "inherit",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}>{f}</button>
        ))}
      </div>
    </div>
  ),
  play: (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 13, color: "rgba(0,0,0,0.45)", textAlign: "center", margin: 0 }}>
        Выбери игру
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
        {["🎾 Мяч", "🧸 Игрушка", "🎈 Шарик", "🏀 Баскетбол", "🎮 Игра"].map(g => (
          <button key={g} style={{
            padding: "10px 16px", borderRadius: 18,
            background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.75)",
            fontSize: 13, fontWeight: 600, color: "rgba(0,0,0,0.65)",
            cursor: "pointer", fontFamily: "inherit",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}>{g}</button>
        ))}
      </div>
    </div>
  ),
  sleep: (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <span style={{ fontSize: 48 }}>😴</span>
      <p style={{ fontSize: 14, color: "rgba(0,0,0,0.50)", textAlign: "center", margin: 0, lineHeight: 1.5 }}>
        Питомец хочет отдохнуть.<br />Уложи его спать, чтобы восстановить силы.
      </p>
      <button style={{
        padding: "12px 32px", borderRadius: 999,
        background: "linear-gradient(135deg,#c5b8d8,#a89cc8)",
        border: "none", fontSize: 14, fontWeight: 700,
        color: "#fff", cursor: "pointer", fontFamily: "inherit",
        boxShadow: "0 4px 16px rgba(197,184,216,0.45)",
      }}>
        Спокойной ночи 🌙
      </button>
    </div>
  ),
  shop: (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 13, color: "rgba(0,0,0,0.45)", textAlign: "center", margin: 0 }}>
        Магазин — скоро откроется!
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
        {["🎀 Бант", "👑 Корона", "🛁 Ванна", "🏠 Домик", "💎 Кристалл"].map(i => (
          <button key={i} style={{
            padding: "10px 16px", borderRadius: 18,
            background: "rgba(255,255,255,0.35)", border: "1px dashed rgba(0,0,0,0.12)",
            fontSize: 13, fontWeight: 600, color: "rgba(0,0,0,0.35)",
            cursor: "not-allowed", fontFamily: "inherit",
          }}>{i}</button>
        ))}
      </div>
    </div>
  ),
};

const MENU_TITLES: Record<MenuCategory, string> = {
  feed:  "Кормление",
  play:  "Игра",
  sleep: "Сон",
  shop:  "Магазин",
};

interface Props {
  open: MenuCategory | null;
  /** Height reserved for the carousel strip (px) */
  carouselH: number;
}

export function CategoryMenu({ open, carouselH }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key={open}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 340, damping: 36, mass: 1 }}
          style={{
            // The menu fills the remaining space below the carousel inside
            // the bottom-zone container. The parent already handles sizing.
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Content card — matches the carousel's glassmorphism style */}
          <div style={{
            flex: 1,
            margin: "0 8px 8px",
            borderRadius: "0 0 28px 28px",
            background: "rgba(255,255,255,0.60)",
            backdropFilter: "blur(32px) saturate(180%)",
            WebkitBackdropFilter: "blur(32px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.72)",
            borderTop: "none",
            boxShadow: "0 8px 32px rgba(100,100,140,0.13), 0 2px 8px rgba(100,100,140,0.08)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}>
            {/* Title bar */}
            <div style={{
              padding: "14px 20px 10px",
              borderBottom: "1px solid rgba(0,0,0,0.05)",
              flexShrink: 0,
            }}>
              <span style={{
                fontSize: 13, fontWeight: 700,
                color: "rgba(0,0,0,0.55)", letterSpacing: "0.04em",
              }}>
                {MENU_TITLES[open]}
              </span>
            </div>

            {/* Scrollable body */}
            <div style={{
              flex: 1, overflowY: "auto",
              padding: "16px 16px",
              scrollbarWidth: "none",
            }}>
              {MENU_CONTENT[open]}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}