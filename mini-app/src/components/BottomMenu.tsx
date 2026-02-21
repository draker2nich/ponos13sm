// mini-app/src/components/BottomMenu.tsx
import { motion } from "framer-motion";
import type { Pet, ActionType } from "../api/types";
import type { TabId } from "../pages/HomePage";
import { MENU_TABS } from "../pages/HomePage";

/* ────────── Food menu content ────────── */
const FOOD_ITEMS = [
  { emoji: "🍎", label: "Яблоко",   action: "feed" as ActionType, bonus: "+30 🍎" },
  { emoji: "🍗", label: "Курица",   action: "feed" as ActionType, bonus: "+35 🍎" },
  { emoji: "🥕", label: "Морковь",  action: "feed" as ActionType, bonus: "+20 🍎" },
  { emoji: "🐟", label: "Рыба",     action: "feed" as ActionType, bonus: "+28 🍎" },
  { emoji: "🧁", label: "Кексик",   action: "feed" as ActionType, bonus: "+15 🍎 +10 😊" },
  { emoji: "🍖", label: "Кость",    action: "feed" as ActionType, bonus: "+40 🍎" },
];

function FoodMenu({ onAction }: { onAction: (a: ActionType, msg: string) => Promise<void> }) {
  return (
    <div style={{ padding: "16px 20px 0", flex: 1, overflowY: "auto" }}>
      <p style={{ fontSize: 13, color: "rgba(0,0,0,0.38)", marginBottom: 14, textAlign: "center" }}>
        Выбери угощение для питомца
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {FOOD_ITEMS.map(item => (
          <motion.button
            key={item.label}
            whileTap={{ scale: 0.92 }}
            onClick={() => onAction(item.action, item.bonus)}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              padding: "12px 6px", borderRadius: 18,
              background: "rgba(255,255,255,0.55)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.70)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <span style={{ fontSize: 30 }}>{item.emoji}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(0,0,0,0.55)" }}>{item.label}</span>
            <span style={{ fontSize: 10, color: "rgba(0,0,0,0.30)" }}>{item.bonus}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ────────── Play menu content ────────── */
const MINI_GAMES = [
  { emoji: "🎾", label: "Мячик",    desc: "Поймай мячи!",   action: "play" as ActionType },
  { emoji: "🎲", label: "Кубики",   desc: "Скоро!",          action: "play" as ActionType, locked: true },
  { emoji: "🃏", label: "Карты",    desc: "Скоро!",          action: "play" as ActionType, locked: true },
];

function PlayMenu({ onAction }: { onAction: (a: ActionType, msg: string) => Promise<void> }) {
  return (
    <div style={{ padding: "16px 20px 0", flex: 1, overflowY: "auto" }}>
      <p style={{ fontSize: 13, color: "rgba(0,0,0,0.38)", marginBottom: 14, textAlign: "center" }}>
        Поиграй с питомцем
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {MINI_GAMES.map(g => (
          <motion.button
            key={g.label}
            whileTap={g.locked ? {} : { scale: 0.97 }}
            onClick={g.locked ? undefined : () => onAction(g.action, "+25 🎾")}
            style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "14px 16px", borderRadius: 20,
              background: g.locked ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.55)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.65)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              cursor: g.locked ? "not-allowed" : "pointer",
              fontFamily: "inherit", opacity: g.locked ? 0.5 : 1,
            }}
          >
            <span style={{ fontSize: 32 }}>{g.emoji}</span>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(0,0,0,0.65)" }}>{g.label}</span>
              <span style={{ fontSize: 12, color: "rgba(0,0,0,0.35)" }}>{g.desc}</span>
            </div>
            {!g.locked && (
              <div style={{ marginLeft: "auto", fontSize: 18 }}>▶</div>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ────────── Sleep menu content ────────── */
function SleepMenu({ petName, onAction }: { petName: string; onAction: (a: ActionType, msg: string) => Promise<void> }) {
  return (
    <div style={{
      padding: "24px 20px 0", flex: 1,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
    }}>
      <span style={{ fontSize: 56 }}>😴</span>
      <p style={{ fontSize: 14, color: "rgba(0,0,0,0.50)", textAlign: "center", lineHeight: 1.5 }}>
        {petName} хочет отдохнуть.<br />Отправь питомца спать!
      </p>
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={() => onAction("pet", "+10 💤")}
        style={{
          padding: "14px 36px", borderRadius: 999,
          background: "linear-gradient(135deg,#c5b8d8,#9b8ec4)",
          border: "none", color: "#fff", fontSize: 15, fontWeight: 700,
          cursor: "pointer", fontFamily: "inherit",
          boxShadow: "0 4px 20px rgba(155,142,196,0.4)",
        }}
      >
        Уложить спать 🌙
      </motion.button>
    </div>
  );
}

/* ────────── Shop menu content ────────── */
const SHOP_ITEMS = [
  { emoji: "🎩", label: "Шляпа",      price: 50,  available: false },
  { emoji: "🦺", label: "Жилетка",    price: 80,  available: false },
  { emoji: "🌺", label: "Ошейник",    price: 30,  available: false },
  { emoji: "🪄", label: "Волшебная палочка", price: 120, available: false },
];

function ShopMenu() {
  return (
    <div style={{ padding: "16px 20px 0", flex: 1, overflowY: "auto" }}>
      <p style={{ fontSize: 13, color: "rgba(0,0,0,0.38)", marginBottom: 14, textAlign: "center" }}>
        Магазин — скоро откроется! 🛍️
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
        {SHOP_ITEMS.map(item => (
          <div
            key={item.label}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              padding: "14px 8px", borderRadius: 18,
              background: "rgba(255,255,255,0.35)",
              border: "1px solid rgba(255,255,255,0.55)",
              opacity: 0.5, position: "relative", overflow: "hidden",
            }}
          >
            <span style={{ fontSize: 32 }}>{item.emoji}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(0,0,0,0.50)" }}>{item.label}</span>
            <span style={{ fontSize: 11, color: "rgba(0,0,0,0.35)" }}>🔒 {item.price} монет</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────── BottomMenu shell ────────── */
interface Props {
  tab: typeof MENU_TABS[number];
  pet: Pet;
  onAction: (a: ActionType, msg: string) => Promise<void>;
  onClose: () => void;
}

const TAB_TITLE: Record<string, string> = {
  feed: "Кормление",
  play: "Игры",
  sleep: "Сон",
  shop: "Магазин",
};

export function BottomMenu({ tab, pet, onAction, onClose: _onClose }: Props) {
  return (
    <motion.div
      key="bottom-menu"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 380, damping: 38, mass: 0.8 }}
      style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0,
        /* exactly 50% of the parent container height */
        height: "50%",
        zIndex: 12,
        display: "flex",
        flexDirection: "column",
        borderRadius: "24px 24px 0 0",
        background: "rgba(240,242,255,0.82)",
        backdropFilter: "blur(40px) saturate(180%)",
        WebkitBackdropFilter: "blur(40px) saturate(180%)",
        border: "1px solid rgba(255,255,255,0.75)",
        borderBottom: "none",
        boxShadow: "0 -8px 40px rgba(100,100,160,0.14), inset 0 1.5px 0 rgba(255,255,255,0.9)",
        overflow: "hidden",
      }}
    >
      {/* Drag handle + title */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "12px 20px 8px", position: "relative", flexShrink: 0,
      }}>
        {/* Handle pill */}
        <div style={{
          position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
          width: 36, height: 4, borderRadius: 2, background: "rgba(0,0,0,0.12)",
        }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(0,0,0,0.55)", marginTop: 8 }}>
          {TAB_TITLE[tab]}
        </span>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {tab === "feed"  && <FoodMenu  onAction={onAction} />}
        {tab === "play"  && <PlayMenu  onAction={onAction} />}
        {tab === "sleep" && <SleepMenu petName={pet.name} onAction={onAction} />}
        {tab === "shop"  && <ShopMenu />}
      </div>

      {/* Bottom padding for home indicator */}
      <div style={{ height: 8, flexShrink: 0 }} />
    </motion.div>
  );
}