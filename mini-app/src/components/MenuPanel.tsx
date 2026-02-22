// mini-app/src/components/MenuPanel.tsx
import { useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMenuStore, MENU_ORDER, type MenuCategory } from "../store/useMenuStore";
import { NOTAP } from "./NavCarousel";

/* ── Styles (declared before MENU_CONTENT so they can be referenced) ── */
const itemBtn: React.CSSProperties = {
  padding: "10px 16px", borderRadius: 18,
  background: "rgba(255,255,255,0.55)",
  border: "1px solid rgba(255,255,255,0.75)",
  fontSize: 13, fontWeight: 600, color: "rgba(0,0,0,0.65)",
  cursor: "pointer", fontFamily: "inherit", outline: "none", ...NOTAP,
};

const itemBtnDisabled: React.CSSProperties = {
  ...itemBtn,
  background: "rgba(255,255,255,0.35)",
  border: "1px dashed rgba(0,0,0,0.12)",
  color: "rgba(0,0,0,0.35)",
  cursor: "not-allowed",
};

const actionBtn: React.CSSProperties = {
  padding: "12px 32px", borderRadius: 999,
  background: "linear-gradient(135deg,#c5b8d8,#a89cc8)",
  border: "none", fontSize: 14, fontWeight: 700,
  color: "#fff", cursor: "pointer", fontFamily: "inherit", outline: "none", ...NOTAP,
};

/* ── Per-category menu content ── */
const MENU_CONTENT: Record<MenuCategory, React.ReactNode> = {
  feed: (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 13, color: "rgba(0,0,0,0.45)", textAlign: "center", margin: 0 }}>
        Выбери угощение для питомца
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
        {["🍎 Яблоко", "🍗 Курица", "🥕 Морковь", "🐟 Рыба", "🧁 Кекс", "🍖 Мясо"].map(f => (
          <button key={f} style={itemBtn}>{f}</button>
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
          <button key={g} style={itemBtn}>{g}</button>
        ))}
      </div>
    </div>
  ),
  shop: (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 13, color: "rgba(0,0,0,0.45)", textAlign: "center", margin: 0 }}>
        Магазин — скоро откроется!
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
        {["🎀 Бант", "👑 Корона", "🛁 Ванна", "🏠 Домик", "💎 Кристалл"].map(i => (
          <button key={i} style={itemBtnDisabled}>{i}</button>
        ))}
      </div>
    </div>
  ),
  wash: (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <span style={{ fontSize: 48 }}>🛁</span>
      <p style={{ fontSize: 14, color: "rgba(0,0,0,0.50)", textAlign: "center", margin: 0, lineHeight: 1.5 }}>
        Питомец хочет помыться.<br />Выбери средство для купания!
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
        {["🧴 Шампунь", "🧼 Мыло", "🫧 Пена"].map(i => (
          <button key={i} style={itemBtn}>{i}</button>
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
      <button style={actionBtn}>Спокойной ночи 🌙</button>
    </div>
  ),
};

/* ════════════════════════════════════════════
   MenuPanel
   ════════════════════════════════════════════ */
export function MenuPanel({ menuH }: { menuH: string }) {
  const { openMenu, prevMenu, setMenu, closeMenu } = useMenuStore();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const handleStart = useCallback((cx: number, cy: number) => {
    touchStart.current = { x: cx, y: cy };
  }, []);

  const handleEnd = useCallback((cx: number, cy: number) => {
    if (!touchStart.current || !openMenu) return;
    const dx = cx - touchStart.current.x;
    const dy = cy - touchStart.current.y;
    touchStart.current = null;
    if (dy > 40 && Math.abs(dy) > Math.abs(dx) * 1.3) { closeMenu(); return; }
    if (Math.abs(dx) < 35 || Math.abs(dx) < Math.abs(dy) * 0.7) return;
    const idx = MENU_ORDER.indexOf(openMenu);
    if (dx < 0 && idx < MENU_ORDER.length - 1) setMenu(MENU_ORDER[idx + 1]);
    if (dx > 0 && idx > 0) setMenu(MENU_ORDER[idx - 1]);
  }, [openMenu, setMenu, closeMenu]);

  const dir = useMemo(() => {
    if (!prevMenu || !openMenu) return 0;
    const pi = MENU_ORDER.indexOf(prevMenu), ni = MENU_ORDER.indexOf(openMenu);
    if (pi === -1 || ni === -1) return 0;
    return ni > pi ? 1 : -1;
  }, [prevMenu, openMenu]);

  return (
    <div
      onTouchStart={e => { const t = e.touches[0]; handleStart(t.clientX, t.clientY); }}
      onTouchEnd={e   => { const t = e.changedTouches[0]; handleEnd(t.clientX, t.clientY); }}
      onMouseDown={e  => handleStart(e.clientX, e.clientY)}
      onMouseUp={e    => handleEnd(e.clientX, e.clientY)}
      style={{
        width: "100%", height: menuH,
        position: "relative", overflow: "hidden",
        touchAction: "pan-y pinch-zoom",
        ...NOTAP,
      }}
    >
      <AnimatePresence mode="popLayout" custom={dir}>
        {openMenu && (
          <motion.div
            key={openMenu}
            custom={dir}
            initial={{ x: dir !== 0 ? `${dir * 100}%` : 0, y: dir === 0 ? "100%" : 0, opacity: dir !== 0 ? 0.5 : 1 }}
            animate={{ x: 0, y: 0, opacity: 1 }}
            exit={{ x: dir !== 0 ? `${-dir * 100}%` : 0, y: dir === 0 ? "100%" : 0, opacity: dir !== 0 ? 0.5 : 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 40, mass: 0.8 }}
            style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}
          >
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 24px", scrollbarWidth: "none" }}>
              {MENU_CONTENT[openMenu]}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}