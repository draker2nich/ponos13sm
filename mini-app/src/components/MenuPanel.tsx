// mini-app/src/components/MenuPanel.tsx
import { useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMenuStore, MENU_ORDER, type MenuCategory } from "../store/useMenuStore";
import { NOTAP } from "./NavCarousel";
import type { Pet } from "../api/types";

/* ── Styles ── */
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

const dangerBtn: React.CSSProperties = {
  padding: "12px 32px", borderRadius: 999,
  background: "linear-gradient(135deg,#f87171,#ef4444)",
  border: "none", fontSize: 14, fontWeight: 700,
  color: "#fff", cursor: "pointer", fontFamily: "inherit", outline: "none", ...NOTAP,
};

/* ── Stat row ── */
function StatRow({ label, value, color }: { label: string; value: number; color: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: "rgba(0,0,0,0.45)" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: v < 25 ? "#ef4444" : "rgba(0,0,0,0.55)" }}>{Math.round(v)}</span>
      </div>
      <div style={{ height: 6, borderRadius: 6, background: "rgba(0,0,0,0.07)", overflow: "hidden" }}>
        <motion.div
          animate={{ width: `${v}%` }} transition={{ duration: 0.5 }}
          style={{ height: "100%", borderRadius: 6, background: v < 25 ? "#ef4444" : color }}
        />
      </div>
    </div>
  );
}

/* ── Per-category content ── */
function menuContent(cat: MenuCategory, pet: Pet, sleepVal: number): React.ReactNode {
  switch (cat) {
    case "feed":
      return (
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
      );

    case "play":
      return (
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
      );

    case "shop":
      return (
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
      );

    case "wash":
      return (
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
      );

    case "sleep":
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 48 }}>😴</span>
          <p style={{ fontSize: 14, color: "rgba(0,0,0,0.50)", textAlign: "center", margin: 0, lineHeight: 1.5 }}>
            Питомец хочет отдохнуть.<br />Уложи его спать, чтобы восстановить силы.
          </p>
          <StatRow label="Энергия" value={sleepVal} color="#818cf8" />
          <button style={actionBtn}>Спокойной ночи 🌙</button>
        </div>
      );

    case "partner":
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 48 }}>🤝</span>
          <p style={{ fontSize: 14, color: "rgba(0,0,0,0.50)", textAlign: "center", margin: 0, lineHeight: 1.5 }}>
            Пригласи друга ухаживать<br />за питомцем вместе!
          </p>
          {pet.owners.length > 1 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 16px", borderRadius: 16,
                background: "rgba(255,255,255,0.55)",
                border: "1px solid rgba(255,255,255,0.75)",
              }}>
                <span style={{ fontSize: 24 }}>👤</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(0,0,0,0.65)" }}>
                    Партнёр подключён
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(0,0,0,0.35)", marginTop: 2 }}>
                    {pet.owners.filter(o => !o.is_creator).length} совладелец
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <button style={actionBtn}>Пригласить партнёра 🔗</button>
          )}
        </div>
      );

    case "settings":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Pet info */}
          <div style={{
            padding: "14px 16px", borderRadius: 18,
            background: "rgba(255,255,255,0.55)",
            border: "1px solid rgba(255,255,255,0.75)",
            display: "flex", flexDirection: "column", gap: 8,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(0,0,0,0.60)", marginBottom: 2 }}>
              {pet.name}
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {[
                { label: "Уровень", value: `${pet.level}` },
                { label: "Возраст", value: `${pet.age_days} дн.` },
                { label: "Стрик", value: `🔥 ${pet.streak}` },
                { label: "Опыт", value: `${pet.experience} / ${pet.level * 100}` },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: "rgba(0,0,0,0.35)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(0,0,0,0.65)", marginTop: 2 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <StatRow label="Сытость 🍎"  value={pet.hunger}    color="#f59e0b" />
            <StatRow label="Счастье 🎾"  value={pet.happiness} color="#34d399" />
            <StatRow label="Здоровье 🛁" value={pet.health}    color="#60a5fa" />
          </div>

          {/* Danger zone */}
          <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
            <button style={dangerBtn}>Сбросить питомца 🗑</button>
          </div>
        </div>
      );

    default:
      return null;
  }
}

/* ════════════════════════════════════════════
   MenuPanel
   ════════════════════════════════════════════ */
interface Props {
  menuH: string;
  pet: Pet;
  sleepVal: number;
}

export function MenuPanel({ menuH, pet, sleepVal }: Props) {
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
    const idx = MENU_ORDER.indexOf(openMenu as MenuCategory);
    if (idx === -1) return;
    if (dx < 0 && idx < MENU_ORDER.length - 1) setMenu(MENU_ORDER[idx + 1]);
    if (dx > 0 && idx > 0) setMenu(MENU_ORDER[idx - 1]);
  }, [openMenu, setMenu, closeMenu]);

  const dir = useMemo(() => {
    if (!prevMenu || !openMenu) return 0;
    const pi = MENU_ORDER.indexOf(prevMenu as MenuCategory);
    const ni = MENU_ORDER.indexOf(openMenu as MenuCategory);
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
              {menuContent(openMenu as MenuCategory, pet, sleepVal)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}