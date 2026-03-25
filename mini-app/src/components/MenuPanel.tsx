// mini-app/src/components/MenuPanel.tsx
import { useRef, useCallback, useState, useEffect } from "react";
import { useMenuStore, MENU_ORDER, type MenuCategory } from "../store/useMenuStore";
import { useCoinStore } from "../store/useCoinStore";
import { NOTAP } from "./NavCarousel";
import type { Pet } from "../api/types";

/* ── Styles ── */
const actionBtn: React.CSSProperties = {
  padding: "12px 32px", borderRadius: 999,
  background: "linear-gradient(135deg,#c5b8d8,#a89cc8)",
  border: "none", fontSize: 14, fontWeight: 700,
  color: "#fff", cursor: "pointer", fontFamily: "inherit", outline: "none",
  transition: "transform 0.1s ease",
  ...NOTAP,
};

const dangerBtn: React.CSSProperties = {
  ...actionBtn,
  background: "linear-gradient(135deg,#f87171,#ef4444)",
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
        <div style={{
          height: "100%", borderRadius: 6,
          background: v < 25 ? "#ef4444" : color,
          width: `${v}%`,
          transition: "width 0.4s ease",
        }} />
      </div>
    </div>
  );
}

/* ── Food data ── */
const FOODS: { emoji: string; cost: number; sat: number }[] = [
  { emoji: "🍎", cost: 2, sat: 5 },
  { emoji: "🥕", cost: 2, sat: 5 },
  { emoji: "🌽", cost: 3, sat: 7 },
  { emoji: "🍞", cost: 3, sat: 8 },
  { emoji: "🥚", cost: 4, sat: 9 },
  { emoji: "🧀", cost: 5, sat: 10 },
  { emoji: "🍗", cost: 6, sat: 14 },
  { emoji: "🐟", cost: 7, sat: 15 },
  { emoji: "🍖", cost: 8, sat: 18 },
  { emoji: "🥩", cost: 10, sat: 20 },
  { emoji: "🍣", cost: 12, sat: 22 },
  { emoji: "🍤", cost: 12, sat: 22 },
  { emoji: "🥐", cost: 5, sat: 11 },
  { emoji: "🍕", cost: 8, sat: 16 },
  { emoji: "🌮", cost: 9, sat: 17 },
  { emoji: "🍔", cost: 10, sat: 19 },
  { emoji: "🍰", cost: 14, sat: 25 },
  { emoji: "🧁", cost: 6, sat: 12 },
  { emoji: "🍩", cost: 4, sat: 8 },
  { emoji: "🥗", cost: 7, sat: 13 },
  { emoji: "🍲", cost: 15, sat: 30 },
];

/* ── Wash data ── */
const WASH_ITEMS: { emoji: string; cost: number; clean: number }[] = [
  { emoji: "🧴", cost: 5, clean: 15 },
  { emoji: "🧽", cost: 3, clean: 10 },
  { emoji: "🧼", cost: 4, clean: 12 },
];

/* ── Reusable grid tile ── */
function ShopTile({ emoji, cost, effectIcon, effectVal, afford }: {
  emoji: string; cost: number; effectIcon: string; effectVal: number; afford: boolean;
}) {
  return (
    <button
      disabled={!afford}
      style={{
        aspectRatio: "1",
        borderRadius: 16,
        border: afford ? "1px solid rgba(255,255,255,0.75)" : "1px dashed rgba(0,0,0,0.10)",
        background: afford ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.30)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 3, padding: 6,
        cursor: afford ? "pointer" : "not-allowed",
        fontFamily: "inherit", outline: "none",
        opacity: afford ? 1 : 0.45,
        transition: "transform 0.1s ease",
        ...NOTAP,
      }}
      onPointerDown={e => { if (afford) (e.currentTarget as HTMLElement).style.transform = "scale(0.92)"; }}
      onPointerUp={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
      onPointerLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
    >
      <span style={{ fontSize: 24, lineHeight: 1 }}>{emoji}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <span style={{ fontSize: 9, lineHeight: 1 }}>🪙</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(180,140,20,0.80)" }}>{cost}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <span style={{ fontSize: 9, lineHeight: 1 }}>{effectIcon}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,0,0,0.40)" }}>+{effectVal}</span>
      </div>
    </button>
  );
}

/* ── Per-category content ── */
function MenuContent({ cat, pet, sleepVal }: {
  cat: MenuCategory; pet: Pet; sleepVal: number;
}) {
  const coins = useCoinStore(s => s.coins);

  switch (cat) {
    case "feed":
      return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {FOODS.map((f, i) => (
            <ShopTile key={i} emoji={f.emoji} cost={f.cost} effectIcon="🍎" effectVal={f.sat} afford={coins >= f.cost} />
          ))}
        </div>
      );

    case "play":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 48 }}>🎮</span>
          <p style={{ fontSize: 14, color: "rgba(0,0,0,0.45)", textAlign: "center", margin: 0, lineHeight: 1.5 }}>
            Игры скоро появятся!<br />Следи за обновлениями.
          </p>
        </div>
      );

    case "shop":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 48 }}>🛍</span>
          <p style={{ fontSize: 14, color: "rgba(0,0,0,0.45)", textAlign: "center", margin: 0, lineHeight: 1.5 }}>
            Магазин скоро откроется!<br />Следи за обновлениями.
          </p>
        </div>
      );

    case "wash":
      return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {WASH_ITEMS.map((w, i) => (
            <ShopTile key={i} emoji={w.emoji} cost={w.cost} effectIcon="🛁" effectVal={w.clean} afford={coins >= w.cost} />
          ))}
        </div>
      );

    case "sleep":
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 48 }}>😴</span>
          <p style={{ fontSize: 14, color: "rgba(0,0,0,0.50)", textAlign: "center", margin: 0, lineHeight: 1.5 }}>
            Уложи питомца спать<br />чтобы восстановить силы.
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
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 16px", borderRadius: 16,
              background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.75)",
            }}>
              <span style={{ fontSize: 24 }}>👤</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(0,0,0,0.65)" }}>Партнёр подключён</div>
                <div style={{ fontSize: 11, color: "rgba(0,0,0,0.35)", marginTop: 2 }}>
                  {pet.owners.filter(o => !o.is_creator).length} совладелец
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
          <div style={{
            padding: "14px 16px", borderRadius: 18,
            background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.75)",
            display: "flex", flexDirection: "column", gap: 8,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(0,0,0,0.60)", marginBottom: 2 }}>{pet.name}</div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {[
                { label: "Уровень", value: `${pet.level}` },
                { label: "Возраст", value: `${pet.age_days} дн.` },
                { label: "Стрик", value: `🔥 ${pet.streak}` },
                { label: "Монеты", value: `🪙 ${useCoinStore.getState().coins}` },
                { label: "Опыт", value: `${pet.experience} / ${pet.level * 100}` },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: "rgba(0,0,0,0.35)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(0,0,0,0.65)", marginTop: 2 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <StatRow label="Сытость 🍎" value={pet.hunger} color="#f59e0b" />
            <StatRow label="Счастье 🎾" value={pet.happiness} color="#34d399" />
            <StatRow label="Здоровье 🛁" value={pet.health} color="#60a5fa" />
          </div>
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
interface Props { menuH: string; pet: Pet; sleepVal: number }

export function MenuPanel({ menuH, pet, sleepVal }: Props) {
  const { openMenu, setMenu, closeMenu } = useMenuStore();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [slideDir, setSlideDir] = useState(0);
  const prevMenu = useRef<MenuCategory | null>(null);

  useEffect(() => {
    if (openMenu && prevMenu.current) {
      const pi = MENU_ORDER.indexOf(prevMenu.current);
      const ni = MENU_ORDER.indexOf(openMenu as MenuCategory);
      if (pi !== -1 && ni !== -1) setSlideDir(ni > pi ? 1 : -1);
      else setSlideDir(0);
    } else {
      setSlideDir(0);
    }
    prevMenu.current = openMenu as MenuCategory | null;
  }, [openMenu]);

  const [animKey, setAnimKey] = useState(0);
  useEffect(() => { setAnimKey(k => k + 1); }, [openMenu]);

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

  return (
    <div
      onTouchStart={e => { const t = e.touches[0]; handleStart(t.clientX, t.clientY); }}
      onTouchEnd={e => { const t = e.changedTouches[0]; handleEnd(t.clientX, t.clientY); }}
      onMouseDown={e => handleStart(e.clientX, e.clientY)}
      onMouseUp={e => handleEnd(e.clientX, e.clientY)}
      style={{
        width: "100%", height: menuH,
        position: "relative", overflow: "hidden",
        touchAction: "pan-y pinch-zoom",
        ...NOTAP,
      }}
    >
      {openMenu && (
        <div
          key={animKey}
          style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column", overflow: "hidden",
            animation: `menu-slide-in 0.22s cubic-bezier(0.22, 1, 0.36, 1) forwards`,
            ["--slide-from" as string]: slideDir !== 0 ? `${slideDir * 60}px` : "0px",
          }}
        >
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 24px", scrollbarWidth: "none" }}>
            <MenuContent cat={openMenu as MenuCategory} pet={pet} sleepVal={sleepVal} />
          </div>
        </div>
      )}
    </div>
  );
}