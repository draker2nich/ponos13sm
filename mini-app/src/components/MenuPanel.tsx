// mini-app/src/components/MenuPanel.tsx
import { useRef, useCallback, useState, useEffect } from "react";
import { useMenuStore, MENU_ORDER, type MenuCategory } from "../store/useMenuStore";
import { useCoinStore } from "../store/useCoinStore";
import { useSleepStore } from "../store/useSleepStore";
import { usePetStore } from "../store/usePetStore";
import { useToastStore } from "../store/useToastStore";
import { buyItem, toggleSleep, deletePet } from "../api/shop";
import { getMe } from "../api/users";
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

function haptic(type: "light" | "medium" | "error" | "success") {
  try {
    const hf = (window as any).Telegram?.WebApp?.HapticFeedback;
    if (type === "error") hf?.notificationOccurred?.("error");
    else if (type === "success") hf?.notificationOccurred?.("success");
    else hf?.impactOccurred?.(type);
  } catch { /* noop */ }
}

function StatRow({ label, value, color }: { label: string; value: number; color: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: "rgba(0,0,0,0.45)" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: v < 25 ? "#ef4444" : "rgba(0,0,0,0.55)" }}>{Math.round(v)}</span>
      </div>
      <div style={{ height: 6, borderRadius: 6, background: "rgba(0,0,0,0.07)", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 6, background: v < 25 ? "#ef4444" : color, width: `${v}%`, transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
}

const FOODS: { emoji: string; cost: number; sat: number }[] = [
  { emoji: "🍎", cost: 2, sat: 5 }, { emoji: "🥕", cost: 2, sat: 5 },
  { emoji: "🌽", cost: 3, sat: 7 }, { emoji: "🍞", cost: 3, sat: 8 },
  { emoji: "🥚", cost: 4, sat: 9 }, { emoji: "🧀", cost: 5, sat: 10 },
  { emoji: "🍗", cost: 6, sat: 14 }, { emoji: "🐟", cost: 7, sat: 15 },
  { emoji: "🍖", cost: 8, sat: 18 }, { emoji: "🥩", cost: 10, sat: 20 },
  { emoji: "🍣", cost: 12, sat: 22 }, { emoji: "🍤", cost: 12, sat: 22 },
  { emoji: "🥐", cost: 5, sat: 11 }, { emoji: "🍕", cost: 8, sat: 16 },
  { emoji: "🌮", cost: 9, sat: 17 }, { emoji: "🍔", cost: 10, sat: 19 },
  { emoji: "🍰", cost: 14, sat: 25 }, { emoji: "🧁", cost: 6, sat: 12 },
  { emoji: "🍩", cost: 4, sat: 8 }, { emoji: "🥗", cost: 7, sat: 13 },
  { emoji: "🍲", cost: 15, sat: 30 },
];

const WASH_ITEMS: { emoji: string; cost: number; clean: number }[] = [
  { emoji: "🧴", cost: 5, clean: 15 }, { emoji: "🧽", cost: 3, clean: 10 }, { emoji: "🧼", cost: 4, clean: 12 },
];

const ENERGY_ITEMS: { emoji: string; cost: number; energy: number }[] = [
  { emoji: "☕", cost: 3, energy: 12 },
  { emoji: "🧃", cost: 4, energy: 15 },
  { emoji: "🍫", cost: 5, energy: 18 },
  { emoji: "⚡", cost: 8, energy: 30 },
  { emoji: "🥤", cost: 6, energy: 22 },
];

function ShopTile({ emoji, cost, effectIcon, effectVal, afford, onClick }: {
  emoji: string; cost: number; effectIcon: string; effectVal: number; afford: boolean;
  onClick: () => void;
}) {
  return (
    <button disabled={!afford} onClick={afford ? onClick : undefined} style={{
      aspectRatio: "1", borderRadius: 16,
      border: afford ? "1px solid rgba(255,255,255,0.75)" : "1px dashed rgba(0,0,0,0.10)",
      background: afford ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.30)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 3, padding: 6, cursor: afford ? "pointer" : "not-allowed",
      fontFamily: "inherit", outline: "none", opacity: afford ? 1 : 0.45,
      transition: "transform 0.1s ease", ...NOTAP,
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

function MenuContent({ cat, pet, sleepVal, onGameOpen, onPetDeleted }: {
  cat: MenuCategory; pet: Pet; sleepVal: number; onGameOpen: () => void;
  onPetDeleted: () => void;
}) {
  const coins = useCoinStore(s => s.coins);
  const setCoins = useCoinStore(s => s.setCoins);
  const requestGameStart = useCoinStore(s => s.requestGameStart);
  const { sleeping, setSleeping } = useSleepStore();
  const setPet = usePetStore(s => s.setPet);
  const toast = useToastStore(s => s.show);
  const [busy, setBusy] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    getMe().then(me => setCurrentUserId(me.id)).catch(() => {});
  }, []);

  const handleBuy = async (itemType: "food" | "wash" | "energy", itemId: number, emoji: string) => {
    if (busy) return;
    setBusy(true);
    const prevCoins = coins;
    const item = itemType === "food" ? FOODS[itemId]
               : itemType === "wash" ? WASH_ITEMS[itemId]
               : ENERGY_ITEMS[itemId];
    if (item) setCoins(coins - item.cost);
    try {
      const res = await buyItem(pet.id, itemType, itemId);
      setCoins(res.coins);
      setPet(res.pet);
      toast(`${emoji} Применено!`, "success");
      haptic("success");
    } catch (e: any) {
      setCoins(prevCoins);
      const msg = e.response?.data?.detail || "Ошибка покупки";
      toast(typeof msg === "string" ? msg : "Ошибка покупки", "error");
      haptic("error");
    } finally {
      setBusy(false);
    }
  };

  const handleSleep = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await toggleSleep(pet.id);
      setSleeping(res.is_sleeping);
      setPet(res.pet);
      toast(res.is_sleeping ? "🌙 Спокойной ночи! Энергия восстанавливается." : "☀️ Доброе утро!", "info");
      haptic("light");
    } catch {
      toast("Ошибка", "error");
      haptic("error");
    } finally {
      setBusy(false);
    }
  };

  const handleGameStart = async () => {
    const res = await requestGameStart(pet.id);
    if (res.ok) {
      // Refresh pet to get updated energy
      const { fetchPet } = usePetStore.getState();
      await fetchPet(pet.id);
      onGameOpen();
    } else {
      toast(res.message ?? "Не удалось начать игру", "error");
      haptic("error");
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm("Удалить питомца? Это действие нельзя отменить!");
    if (!confirmed) return;
    setBusy(true);
    try {
      await deletePet(pet.id);
      toast("Питомец удалён", "info");
      onPetDeleted();
    } catch {
      toast("Не удалось удалить", "error");
      haptic("error");
    } finally {
      setBusy(false);
    }
  };

  const isCreator = currentUserId !== null &&
    pet.owners.some(o => o.user_id === currentUserId && o.is_creator);

  const canPlay = pet.energy >= 15 && !pet.is_sleeping;

  switch (cat) {
    case "feed":
      return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {FOODS.map((f, i) => (
            <ShopTile key={i} emoji={f.emoji} cost={f.cost} effectIcon="🍎" effectVal={f.sat}
              afford={coins >= f.cost} onClick={() => handleBuy("food", i, f.emoji)} />
          ))}
        </div>
      );

    case "play":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
          {/* Energy warning */}
          {!canPlay && (
            <div style={{
              width: "100%", maxWidth: 320, padding: "12px 16px", borderRadius: 16,
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)",
              fontSize: 12, color: "rgba(180,60,60,0.80)", textAlign: "center", lineHeight: 1.5,
            }}>
              {pet.is_sleeping
                ? "💤 Питомец спит — разбуди, чтобы играть"
                : `⚡ Мало энергии (${Math.round(pet.energy)}/15). Дай отдохнуть или используй энергетик!`}
            </div>
          )}

          <button onClick={canPlay ? handleGameStart : undefined} style={{
            width: "100%", maxWidth: 320, padding: "20px", borderRadius: 22,
            background: canPlay
              ? "linear-gradient(135deg, rgba(124,92,252,0.12), rgba(244,114,182,0.12))"
              : "rgba(0,0,0,0.03)",
            border: canPlay ? "1px solid rgba(255,255,255,0.65)" : "1px dashed rgba(0,0,0,0.10)",
            boxShadow: canPlay ? "0 4px 20px rgba(124,92,252,0.10)" : "none",
            cursor: canPlay ? "pointer" : "not-allowed",
            fontFamily: "inherit", outline: "none",
            display: "flex", alignItems: "center", gap: 16,
            opacity: canPlay ? 1 : 0.5,
            transition: "transform 0.12s ease, opacity 0.2s", ...NOTAP,
          }}
            onPointerDown={e => { if (canPlay) (e.currentTarget as HTMLElement).style.transform = "scale(0.97)"; }}
            onPointerUp={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
            onPointerLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: 14, flexShrink: 0,
              background: canPlay ? "linear-gradient(135deg, #7c5cfc, #f472b6)" : "rgba(0,0,0,0.08)",
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2,
              padding: 8, alignContent: "center",
            }}>
              {[1,1,0, 0,1,0, 0,1,1].map((f, i) => (
                <div key={i} style={{
                  borderRadius: 2, aspectRatio: "1",
                  background: f
                    ? (canPlay ? "rgba(255,255,255,0.80)" : "rgba(0,0,0,0.15)")
                    : (canPlay ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.04)"),
                }} />
              ))}
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: canPlay ? "rgba(0,0,0,0.70)" : "rgba(0,0,0,0.30)" }}>Block Blast</div>
              <div style={{ fontSize: 11, color: "rgba(0,0,0,0.40)", marginTop: 2 }}>Заполняй линии, зарабатывай монеты</div>
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 3,
                  padding: "3px 8px", borderRadius: 999,
                  background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.25)",
                }}>
                  <span style={{ fontSize: 9 }}>🪙</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(180,140,20,0.80)" }}>1 за 2 линии</span>
                </div>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 3,
                  padding: "3px 8px", borderRadius: 999,
                  background: "rgba(124,92,252,0.10)", border: "1px solid rgba(124,92,252,0.20)",
                }}>
                  <span style={{ fontSize: 9 }}>⚡</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(100,80,200,0.70)" }}>-8 энергии</span>
                </div>
              </div>
            </div>
          </button>

          {/* Energy items inline */}
          <div style={{ width: "100%", maxWidth: 320 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(0,0,0,0.40)", marginBottom: 8 }}>⚡ Энергетики</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {ENERGY_ITEMS.map((e, i) => (
                <ShopTile key={i} emoji={e.emoji} cost={e.cost} effectIcon="⚡" effectVal={e.energy}
                  afford={coins >= e.cost} onClick={() => handleBuy("energy", i, e.emoji)} />
              ))}
            </div>
          </div>

          <p style={{ fontSize: 12, color: "rgba(0,0,0,0.30)", textAlign: "center", margin: 0 }}>
            Больше игр скоро появятся!
          </p>
        </div>
      );

    case "shop":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(0,0,0,0.40)", marginBottom: 8 }}>⚡ Энергетики</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {ENERGY_ITEMS.map((e, i) => (
                <ShopTile key={i} emoji={e.emoji} cost={e.cost} effectIcon="⚡" effectVal={e.energy}
                  afford={coins >= e.cost} onClick={() => handleBuy("energy", i, e.emoji)} />
              ))}
            </div>
          </div>
          <p style={{ fontSize: 12, color: "rgba(0,0,0,0.30)", textAlign: "center", margin: 0 }}>
            Больше товаров скоро!
          </p>
        </div>
      );

    case "wash":
      return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {WASH_ITEMS.map((w, i) => (
            <ShopTile key={i} emoji={w.emoji} cost={w.cost} effectIcon="🛁" effectVal={w.clean}
              afford={coins >= w.cost} onClick={() => handleBuy("wash", i, w.emoji)} />
          ))}
        </div>
      );

    case "sleep":
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          {/* Energy regen hint */}
          <div style={{
            padding: "10px 16px", borderRadius: 14,
            background: sleeping ? "rgba(110,231,183,0.10)" : "rgba(124,92,252,0.06)",
            border: sleeping ? "1px solid rgba(110,231,183,0.25)" : "1px solid rgba(124,92,252,0.12)",
            fontSize: 11, color: "rgba(0,0,0,0.45)", textAlign: "center", lineHeight: 1.5,
            width: "100%", maxWidth: 320,
          }}>
            {sleeping
              ? `💤 Питомец спит — энергия восстанавливается (+25/час). Сейчас: ⚡${Math.round(pet.energy)}`
              : `🌙 Во сне энергия восстанавливается в 25/час, а параметры падают в 4× медленнее`}
          </div>

          <button onClick={handleSleep} disabled={busy} style={{
            width: "100%", height: "100%", minHeight: 160, maxWidth: 400,
            borderRadius: 24, border: "none",
            background: sleeping
              ? "linear-gradient(135deg, rgba(255,240,180,0.25), rgba(255,250,220,0.15))"
              : "linear-gradient(135deg, #2d2654, #1a1440 40%, #0f0d2a)",
            cursor: busy ? "wait" : "pointer", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 12,
            fontFamily: "inherit", outline: "none", transition: "all 0.4s ease",
            boxShadow: sleeping
              ? "0 4px 20px rgba(200,180,100,0.15), inset 0 1px 0 rgba(255,255,255,0.3)"
              : "0 8px 40px rgba(30,20,60,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
            position: "relative", overflow: "hidden", ...NOTAP,
          }}
            onPointerDown={e => { if (!busy) (e.currentTarget as HTMLElement).style.transform = "scale(0.97)"; }}
            onPointerUp={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
            onPointerLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
          >
            <div style={{
              position: "absolute", top: "15%", left: "50%", transform: "translateX(-50%)",
              width: 120, height: 120, borderRadius: "50%",
              background: sleeping
                ? "radial-gradient(circle, rgba(255,220,100,0.15), transparent 70%)"
                : "radial-gradient(circle, rgba(255,230,150,0.12), transparent 70%)",
              pointerEvents: "none",
            }} />
            <span style={{
              fontSize: 56, lineHeight: 1, position: "relative",
              filter: `drop-shadow(0 0 20px ${sleeping ? "rgba(255,220,100,0.3)" : "rgba(255,230,150,0.3)"})`,
            }}>{sleeping ? "💡" : "🌙"}</span>
            <span style={{
              fontSize: 16, fontWeight: 700, position: "relative",
              color: sleeping ? "rgba(0,0,0,0.50)" : "rgba(200,190,255,0.85)",
              letterSpacing: "0.02em",
            }}>{sleeping ? "Включить свет" : "Выключить свет"}</span>
          </button>
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
            <StatRow label="Энергия ⚡" value={pet.energy} color="#a78bfa" />
          </div>
          {isCreator && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
              <button onClick={handleDelete} disabled={busy} style={dangerBtn}>Сбросить питомца 🗑</button>
            </div>
          )}
        </div>
      );

    default: return null;
  }
}

/* ════════════════════════════════════════════
   MenuPanel
   ════════════════════════════════════════════ */
interface Props {
  menuH: string;
  pet: Pet;
  sleepVal: number;
  onGameOpen?: () => void;
  onPetDeleted?: () => void;
}

export function MenuPanel({ menuH, pet, sleepVal, onGameOpen, onPetDeleted }: Props) {
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
    } else { setSlideDir(0); }
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
            <MenuContent
              cat={openMenu as MenuCategory}
              pet={pet}
              sleepVal={sleepVal}
              onGameOpen={() => onGameOpen?.()}
              onPetDeleted={() => onPetDeleted?.()}
            />
          </div>
        </div>
      )}
    </div>
  );
}