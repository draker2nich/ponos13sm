// mini-app/src/components/CategoryMenu.tsx
import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMenuStore, MENU_ORDER, type MenuCategory } from "../store/useMenuStore";

/* ── Placeholder content per category ─────────────────────────────────────── */
const MENU_CONTENT: Record<MenuCategory, React.ReactNode> = {
  feed: (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <p style={{ fontSize:13, color:"rgba(0,0,0,0.45)", textAlign:"center", margin:0 }}>
        Выбери угощение для питомца
      </p>
      <div style={{ display:"flex", flexWrap:"wrap", gap:10, justifyContent:"center" }}>
        {["🍎 Яблоко","🍗 Курица","🥕 Морковь","🐟 Рыба","🧁 Кекс","🍖 Мясо"].map(f => (
          <button key={f} style={{ padding:"10px 16px", borderRadius:18,
            background:"rgba(255,255,255,0.55)", border:"1px solid rgba(255,255,255,0.75)",
            fontSize:13, fontWeight:600, color:"rgba(0,0,0,0.65)", cursor:"pointer",
            fontFamily:"inherit", boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>{f}</button>
        ))}
      </div>
    </div>
  ),
  play: (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <p style={{ fontSize:13, color:"rgba(0,0,0,0.45)", textAlign:"center", margin:0 }}>
        Выбери игру
      </p>
      <div style={{ display:"flex", flexWrap:"wrap", gap:10, justifyContent:"center" }}>
        {["🎾 Мяч","🧸 Игрушка","🎈 Шарик","🏀 Баскетбол","🎮 Игра"].map(g => (
          <button key={g} style={{ padding:"10px 16px", borderRadius:18,
            background:"rgba(255,255,255,0.55)", border:"1px solid rgba(255,255,255,0.75)",
            fontSize:13, fontWeight:600, color:"rgba(0,0,0,0.65)", cursor:"pointer",
            fontFamily:"inherit", boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>{g}</button>
        ))}
      </div>
    </div>
  ),
  sleep: (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
      <span style={{ fontSize:48 }}>😴</span>
      <p style={{ fontSize:14, color:"rgba(0,0,0,0.50)", textAlign:"center", margin:0, lineHeight:1.5 }}>
        Питомец хочет отдохнуть.<br/>Уложи его спать, чтобы восстановить силы.
      </p>
      <button style={{ padding:"12px 32px", borderRadius:999,
        background:"linear-gradient(135deg,#c5b8d8,#a89cc8)", border:"none",
        fontSize:14, fontWeight:700, color:"#fff", cursor:"pointer", fontFamily:"inherit",
        boxShadow:"0 4px 16px rgba(197,184,216,0.45)" }}>Спокойной ночи 🌙</button>
    </div>
  ),
  shop: (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <p style={{ fontSize:13, color:"rgba(0,0,0,0.45)", textAlign:"center", margin:0 }}>
        Магазин — скоро откроется!
      </p>
      <div style={{ display:"flex", flexWrap:"wrap", gap:10, justifyContent:"center" }}>
        {["🎀 Бант","👑 Корона","🛁 Ванна","🏠 Домик","💎 Кристалл"].map(i => (
          <button key={i} style={{ padding:"10px 16px", borderRadius:18,
            background:"rgba(255,255,255,0.35)", border:"1px dashed rgba(0,0,0,0.12)",
            fontSize:13, fontWeight:600, color:"rgba(0,0,0,0.35)",
            cursor:"not-allowed", fontFamily:"inherit" }}>{i}</button>
        ))}
      </div>
    </div>
  ),
};

const MENU_TITLES: Record<MenuCategory, string> = {
  feed:"Кормление", play:"Игра", sleep:"Сон", shop:"Магазин",
};

/* direction: +1 = slide from right, -1 = slide from left, 0 = slide from bottom */
function getDirection(prev: MenuCategory | null, next: MenuCategory | null): number {
  if (!prev || !next) return 0; // first open → from bottom (handled by parent)
  const pi = MENU_ORDER.indexOf(prev);
  const ni = MENU_ORDER.indexOf(next);
  if (pi === -1 || ni === -1) return 0;
  return ni > pi ? 1 : -1;
}

interface Props {
  /** pixel width of the screen — menu always full width */
  screenW: number;
}

export function CategoryMenu({ screenW }: Props) {
  const { openMenu, prevMenu, setMenu } = useMenuStore();

  // Swipe tracking
  const swipeStartX = useRef(0);
  const swipeStartY = useRef(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    swipeStartX.current = e.clientX;
    swipeStartY.current = e.clientY;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!openMenu) return;
    const dx = e.clientX - swipeStartX.current;
    const dy = e.clientY - swipeStartY.current;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return; // not a horizontal swipe
    const idx = MENU_ORDER.indexOf(openMenu);
    if (dx < 0 && idx < MENU_ORDER.length - 1) setMenu(MENU_ORDER[idx + 1]); // swipe left → next
    if (dx > 0 && idx > 0) setMenu(MENU_ORDER[idx - 1]);                     // swipe right → prev
  };

  const dir = getDirection(prevMenu, openMenu);
  // For horizontal transitions (switching categories)
  const xEnter = dir !== 0 ? dir * screenW : 0;
  const xExit  = dir !== 0 ? -dir * screenW : 0;
  // For vertical transitions (first open): enter from below (y), exit downward
  const yEnter = dir === 0 ? "100%" : 0;
  const yExit  = dir === 0 ? "100%" : 0;

  return (
    <div
      style={{
        flex: 1,
        position: "relative",
        overflow: "hidden",
        width: screenW,
        // Full-width relative to viewport, break out of any padding
        marginLeft: "calc(-50vw + 50%)",
        // Background so underlying elements don't show during animation
        background: "rgba(255,255,255,0.60)",
        backdropFilter: "blur(32px) saturate(180%)",
        WebkitBackdropFilter: "blur(32px) saturate(180%)",
        borderTop: "1px solid rgba(255,255,255,0.72)",
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <AnimatePresence mode="popLayout" custom={dir}>
        {openMenu && (
          <motion.div
            key={openMenu}
            custom={dir}
            initial={{ x: xEnter, y: yEnter, opacity: dir !== 0 ? 0.6 : 1 }}
            animate={{ x: 0, y: 0, opacity: 1 }}
            exit={{ x: xExit, y: yExit, opacity: dir !== 0 ? 0.6 : 1 }}
            transition={{ type:"spring", stiffness:400, damping:38, mass:0.9 }}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Title */}
            <div style={{
              padding:"14px 20px 10px", flexShrink:0,
              borderBottom:"1px solid rgba(0,0,0,0.05)",
            }}>
              <span style={{ fontSize:13, fontWeight:700, color:"rgba(0,0,0,0.55)", letterSpacing:"0.04em" }}>
                {MENU_TITLES[openMenu]}
              </span>
            </div>
            {/* Scrollable content */}
            <div style={{ flex:1, overflowY:"auto", padding:"16px", scrollbarWidth:"none" }}>
              {MENU_CONTENT[openMenu]}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}