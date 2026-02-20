// mini-app/src/pages/HomePage.tsx
import { useEffect, useCallback, useState, useRef } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { usePetStore } from "../store/usePetStore";
import { PetSVG } from "../components/PetSVG";
import { createInvite } from "../api/pets";
import type { ActionType } from "../api/types";

const tg = window.Telegram?.WebApp;

// ─── SVG icons ──────────────────────────────────────────────────────────────

const Icons = {
  paw: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
      <path d="M12 2C9.8 2 8 3.8 8 6s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm-5 5C5.3 7 4 8.3 4 10s1.3 3 3 3 3-1.3 3-3-1.3-3-3-3zm10 0c-1.7 0-3 1.3-3 3s1.3 3 3 3 3-1.3 3-3-1.3-3-3-3zM5 14c-1.7 0-3 1.3-3 3s1.3 3 3 3 3-1.3 3-3-1.3-3-3-3zm14 0c-1.7 0-3 1.3-3 3s1.3 3 3 3 3-1.3 3-3-1.3-3-3-3zm-7 1c-3.3 0-6 1.6-6 3.5V20h12v-1.5c0-1.9-2.7-3.5-6-3.5z"/>
    </svg>
  ),
  fire: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
      <path d="M12.8 21.8C16 21.2 20 18.9 20 13.1c0-5.3-3.9-8.8-6.7-10.4-.6-.4-1.3.1-1.3.8V5.3c0 1.4-.6 4-2.3 5.1-.9.6-1.8-.3-1.9-1.3l-.1-.8c-.1-1-.9-1.5-1.7-1-1.4 1.1-2.9 3-2.9 5.7 0 7.1 5.3 8.9 7.9 8.9.2 0 .4 0 .6-.01-1.3-.12-3.4-.92-3.4-3.53 0-2.05 1.5-3.44 2.6-4.11.3-.18.66.05.66.4v.59c0 .45.17 1.15.58 1.64.47.55 1.16-.02 1.22-.7.02-.22.24-.37.44-.25.64.38 1.46 1.18 1.46 2.46 0 2.05-1.13 2.98-2.17 3.35z"/>
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  ),
  food: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
      <path d="M18.06 22.99h1.66c.84 0 1.53-.64 1.63-1.46L23 5.05h-5V1h-1.97v4.05h-4.97l.3 2.34c1.71.47 3.31 1.32 4.27 2.26 1.44 1.42 2.43 2.89 2.43 5.29v8.05zM1 21.99V21h15.03v.99c0 .55-.45 1-1.01 1H2.01c-.56 0-1.01-.45-1.01-1zm15.03-7c0-8-15.03-8-15.03 0h15.03zM1.02 17h15v2h-15z"/>
    </svg>
  ),
  game: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
      <path d="M15 7.5V2H9v5.5l3 3 3-3zM7.5 9H2v6h5.5l3-3-3-3zM9 16.5V22h6v-5.5l-3-3-3 3zM16.5 9l-3 3 3 3H22V9h-5.5z"/>
    </svg>
  ),
  moon: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
      <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>
    </svg>
  ),
  wash: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
      <path d="M9 11H7c0-2.76 2.24-5 5-5v2c-1.65 0-3 1.35-3 3zm4-3v2c1.65 0 3 1.35 3 3h2c0-2.76-2.24-5-5-5zm-8 9h14v-2H5v2zM21 3H3C1.9 3 1 3.9 1 5v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z"/>
    </svg>
  ),
  shop: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
      <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96C5 16.1 6.1 17 7 17h11v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63H17c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 21.46 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
    </svg>
  ),
  pet: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
      <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>
    </svg>
  ),
  dot: (
    <svg viewBox="0 0 8 8" fill="currentColor" width="100%" height="100%">
      <circle cx="4" cy="4" r="4"/>
    </svg>
  ),
};

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtCd(iso: string | null): string {
  if (!iso) return "";
  const sec = Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000));
  if (!sec) return "";
  if (sec > 3600) return `${Math.floor(sec / 3600)}ч`;
  if (sec > 60)   return `${Math.floor(sec / 60)}м`;
  return `${sec}с`;
}
const isCdActive = (iso: string | null) => !!iso && new Date(iso).getTime() > Date.now();
const toDeg = (v: number) => Math.round((Math.max(0, Math.min(100, v)) / 100) * 360);

// ─── StatusRing ─────────────────────────────────────────────────────────────

function StatusRing({ value, icon, label }: { value: number; icon: React.ReactNode; label: string }) {
  const deg = toDeg(value);
  const low = value < 25;
  const fill = low ? "rgba(255,90,90,0.9)" : "rgba(255,255,255,0.75)";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "clamp(2px,0.8vw,5px)" }}>
      <div style={{
        width: "clamp(44px,12vw,56px)", height: "clamp(44px,12vw,56px)", borderRadius: "50%",
        background: `conic-gradient(${fill} 0deg ${deg}deg, rgba(255,255,255,0.1) ${deg}deg 360deg)`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <div style={{
          width: "clamp(32px,8.5vw,40px)", height: "clamp(32px,8.5vw,40px)", borderRadius: "50%",
          background: "#0a0a0f",
          boxShadow: "inset 0 2px 5px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.13)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "clamp(6px,2vw,9px)",
          color: low ? "rgba(255,120,120,0.9)" : "rgba(255,255,255,0.85)",
        }}>{icon}</div>
      </div>
      <span style={{
        fontSize: "clamp(8px,2.2vw,10px)", color: "rgba(255,255,255,0.38)",
        fontWeight: 700, letterSpacing: "0.06em",
      }}>{label}</span>
    </div>
  );
}

// ─── Carousel ───────────────────────────────────────────────────────────────

function Carousel({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const down = useRef(false);
  const startX = useRef(0);
  const scrollL = useRef(0);

  return (
    <div ref={ref}
      onMouseDown={e => { down.current = true; startX.current = e.pageX - ref.current!.offsetLeft; scrollL.current = ref.current!.scrollLeft; ref.current!.style.cursor = "grabbing"; }}
      onMouseUp={() => { down.current = false; if (ref.current) ref.current.style.cursor = "grab"; }}
      onMouseLeave={() => { down.current = false; if (ref.current) ref.current.style.cursor = "grab"; }}
      onMouseMove={e => { if (!down.current) return; ref.current!.scrollLeft = scrollL.current - (e.pageX - ref.current!.offsetLeft - startX.current) * 1.2; }}
      style={{
        display: "flex", gap: "clamp(4px,1.5vw,8px)", overflowX: "auto",
        cursor: "grab", scrollbarWidth: "none", WebkitOverflowScrolling: "touch",
        padding: "2px 2px", userSelect: "none",
      }}
    >{children}</div>
  );
}

// ─── CarouselBtn ────────────────────────────────────────────────────────────

type TabId = ActionType | "shop" | "sleep" | "partner" | "settings";

function CarouselBtn({ icon, label, active, disabled, cdLabel, onClick }: {
  icon: React.ReactNode; label: string; active?: boolean;
  disabled?: boolean; cdLabel?: string; onClick?: () => void;
}) {
  const btnSize = "clamp(42px,11vw,52px)";
  return (
    <motion.button
      whileTap={disabled ? {} : { scale: 0.88 }}
      onClick={disabled ? undefined : onClick}
      style={{
        flexShrink: 0, width: "clamp(60px,16vw,72px)",
        padding: "clamp(5px,1.5vw,8px) 2px clamp(4px,1.2vw,6px)",
        borderRadius: 999,
        border: active ? "1px solid rgba(255,255,255,0.38)" : "1px solid transparent",
        background: active ? "rgba(255,255,255,0.16)" : "transparent",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: "clamp(3px,1vw,5px)", transition: "background 0.15s, border 0.15s",
        fontFamily: "inherit",
      }}
    >
      <div style={{
        width: btnSize, height: btnSize, borderRadius: "50%",
        background: active ? "rgba(255,255,255,0.26)" : "rgba(255,255,255,0.05)",
        border: active ? "none" : "1px solid rgba(255,255,255,0.1)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "clamp(10px,2.8vw,13px)",
        filter: disabled ? "opacity(0.3)" : "none",
        boxShadow: active ? "0 4px 16px rgba(255,255,255,0.12)" : "none",
        color: active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.65)",
        transition: "all 0.2s",
      }}>{icon}</div>
      <span style={{
        fontSize: "clamp(8px,2.2vw,10px)", fontWeight: 700, letterSpacing: "0.05em", lineHeight: 1,
        color: active ? "rgba(255,255,255,0.95)" : disabled ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.42)",
      }}>{disabled && cdLabel ? cdLabel : label}</span>
    </motion.button>
  );
}

// ─── FloatAnim ──────────────────────────────────────────────────────────────

function FloatAnim({ show, text }: { show: boolean; text: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -64 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          style={{
            position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
            fontSize: "clamp(16px,4.5vw,22px)", fontWeight: 900, color: "#ffd700",
            pointerEvents: "none", whiteSpace: "nowrap", zIndex: 20,
            textShadow: "0 2px 12px rgba(255,215,0,0.5)",
          }}
        >{text}</motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── DraggablePet ───────────────────────────────────────────────────────────

function DraggablePet({ children, constraintsRef }: {
  children: React.ReactNode;
  constraintsRef: React.RefObject<HTMLElement | null>;
}) {
  const controls = useDragControls();
  return (
    <motion.div
      drag
      dragControls={controls}
      dragConstraints={constraintsRef}
      dragElastic={0.18}
      dragMomentum={false}
      whileDrag={{ scale: 1.06, filter: "drop-shadow(0 0 28px rgba(255,255,255,0.25))" }}
      animate={{ filter: "drop-shadow(0 0 18px rgba(255,255,255,0.13))" }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      style={{ cursor: "grab", touchAction: "none", position: "relative", zIndex: 5 }}
      onPointerDown={e => controls.start(e)}
    >
      {children}
    </motion.div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

interface Props { petId: number }

export function HomePage({ petId }: Props) {
  const { pet, fetchPet, performAction, loading } = usePetStore();
  const [activeTab, setActiveTab] = useState<TabId>("feed");
  const [floatText, setFloatText] = useState("");
  const [floatShow, setFloatShow] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => fetchPet(petId), [petId, fetchPet]);

  useEffect(() => { refresh(); }, [petId]);
  useEffect(() => { const id = setInterval(refresh, 60_000); return () => clearInterval(id); }, [refresh]);
  useEffect(() => {
    const h = () => { if (!document.hidden) refresh(); };
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  }, [refresh]);

  if (loading && !pet) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100dvh", background: "#07070c" }}>
      <div style={{ width: 48, height: 48, color: "rgba(255,255,255,0.6)" }}>{Icons.paw}</div>
      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", marginTop: 14 }}>Загрузка...</div>
    </div>
  );
  if (!pet) return null;

  const evo    = Math.min(7, Math.floor(pet.level / 2) + 1);
  const needed = pet.level * 100;
  const xpPct  = Math.min(100, (pet.experience / needed) * 100);
  const getCd  = (a: string) => pet.cooldowns.find(c => c.action === a)?.available_at ?? null;
  const isCd   = (a: string) => isCdActive(getCd(a));

  const partner = pet.owners.find(o => !o.is_creator) ?? pet.owners[1];
  const partnerMins = partner?.last_active_at
    ? Math.floor((Date.now() - new Date(partner.last_active_at).getTime()) / 60_000)
    : null;
  const partnerOnline = partnerMins !== null && partnerMins < 5;

  const showFloat = (text: string) => {
    setFloatText(text); setFloatShow(true);
    setTimeout(() => setFloatShow(false), 1400);
  };

  const doAction = async (action: ActionType, msg: string) => {
    if (isCd(action)) return;
    setActiveTab(action);
    await performAction(action);
    showFloat(msg);
  };

  const handleInvite = async () => {
    try {
      const inv = await createInvite(pet.id);
      tg?.showAlert?.(`Ссылка для друга:\n${inv.link}`);
    } catch { tg?.showAlert?.("Не удалось создать ссылку"); }
  };

  const handleTab = (tab: TabId) => {
    setActiveTab(tab);
    switch (tab) {
      case "feed":     doAction("feed", "+30"); break;
      case "play":     doAction("play", "+25"); break;
      case "pet":      doAction("pet",  "+15"); break;
      case "partner":  handleInvite(); break;
      case "sleep":    tg?.showAlert?.(`${pet.name} сладко спит!`); break;
      case "shop":     tg?.showAlert?.("Магазин — скоро!"); break;
      case "settings": tg?.showAlert?.(`${pet.name} · Ур.${pet.level}\nВозраст: ${pet.age_days} дн.\nЭволюция: ${evo}/7\nОпыт: ${pet.experience}/${needed}`); break;
    }
  };

  const petSize = "clamp(140px,42vw,200px)" as const;
  const sleepVal = pet.mood === "sleepy" ? 100 : 55;

  return (
    <div style={{
      maxWidth: 430, margin: "0 auto",
      height: "100dvh", minHeight: 580,
      background: "linear-gradient(to bottom, #12121a, #07070c)",
      fontFamily: "'Inter', system-ui, sans-serif",
      position: "relative", overflow: "hidden",
      display: "flex", flexDirection: "column", color: "#fff",
    }}>

      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <header style={{ padding: "clamp(14px,4vw,22px) clamp(12px,4vw,18px) 6px", zIndex: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>

          {/* Name pill */}
          <div style={{
            display: "flex", alignItems: "center", gap: "clamp(7px,2.5vw,12px)",
            background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999,
            padding: "clamp(6px,1.8vw,9px) clamp(10px,3vw,15px)",
            minWidth: 0, flexShrink: 1,
          }}>
            <div style={{
              width: "clamp(28px,8vw,36px)", height: "clamp(28px,8vw,36px)",
              borderRadius: "50%", background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.18)", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "clamp(6px,1.8vw,8px)", color: "rgba(255,255,255,0.75)",
            }}>{Icons.paw}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "clamp(12px,3.5vw,15px)", fontWeight: 800, color: "rgba(255,255,255,0.92)", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {pet.name}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                <span style={{ fontSize: "clamp(9px,2.4vw,11px)", fontWeight: 700, color: "rgba(255,255,255,0.42)", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                  LV.{pet.level}
                </span>
                <div style={{ width: "clamp(36px,10vw,56px)", height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
                  <motion.div animate={{ width: `${xpPct}%` }} transition={{ duration: 0.6 }}
                    style={{ height: "100%", background: "rgba(255,255,255,0.45)", borderRadius: 3 }} />
                </div>
              </div>
            </div>
          </div>

          {/* Streak + XP pills */}
          <div style={{ display: "flex", gap: "clamp(5px,1.5vw,8px)", flexShrink: 0 }}>
            {([
              { icon: Icons.fire, val: pet.streak },
              { icon: Icons.star, val: pet.experience },
            ] as { icon: React.ReactNode; val: number }[]).map(({ icon, val }, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: "clamp(3px,1vw,5px)",
                background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.16)", borderRadius: 999,
                padding: "clamp(5px,1.4vw,7px) clamp(9px,2.5vw,13px)",
              }}>
                <div style={{ width: "clamp(12px,3.5vw,16px)", height: "clamp(12px,3.5vw,16px)", color: "rgba(255,255,255,0.8)" }}>{icon}</div>
                <span style={{ fontSize: "clamp(12px,3.5vw,15px)", fontWeight: 800, color: "rgba(255,255,255,0.9)" }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── STATUS RINGS ──────────────────────────────────────────────── */}
      <div style={{
        display: "flex", justifyContent: "center", gap: "clamp(10px,3.5vw,18px)",
        padding: "clamp(4px,1.5vw,8px) 16px", zIndex: 20,
      }}>
        <StatusRing value={pet.hunger}    icon={Icons.food} label="ЕДА"     />
        <StatusRing value={pet.happiness} icon={Icons.game} label="ИГРА"    />
        <StatusRing value={sleepVal}      icon={Icons.moon} label="СОН"     />
        <StatusRing value={pet.health}    icon={Icons.wash} label="ЧИСТОТА" />
      </div>

      {/* ── PET AREA (draggable) ───────────────────────────────────────── */}
      <main
        ref={mainRef}
        style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          position: "relative", overflow: "hidden",
        }}
      >
        <div style={{ position: "relative" }}>
          <FloatAnim show={floatShow} text={floatText} />
          <DraggablePet constraintsRef={mainRef}>
            <PetSVG
              mood={pet.mood}
              petType={pet.pet_type}
              evolution={evo}
              isReacting={floatShow}
              size={petSize}
            />
            {/* тень внутри DraggablePet — следует вместе с питомцем */}
            <div style={{
              width: "clamp(55px,18vw,85px)", height: 9,
              background: "rgba(0,0,0,0.38)", filter: "blur(7px)",
              borderRadius: "50%", margin: "-6px auto 0", pointerEvents: "none",
            }} />
          </DraggablePet>
        </div>

        {/* Partner tag */}
        <div style={{ marginTop: "clamp(10px,3vw,18px)" }}>
          {partner ? (
            <div style={{
              display: "flex", alignItems: "center", gap: 7,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 999, padding: "5px 14px", backdropFilter: "blur(6px)",
            }}>
              <div style={{
                width: 7, height: 7, flexShrink: 0,
                color: partnerOnline ? "rgba(74,222,128,1)" : "rgba(255,255,255,0.3)",
              }}>{Icons.dot}</div>
              <span style={{ fontSize: "clamp(10px,2.8vw,12px)", color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>
                {partnerMins === null        ? "Партнёр не заходил"
                  : partnerMins < 5         ? "Партнёр онлайн"
                  : partnerMins < 60        ? `Партнёр ${partnerMins} мин назад`
                  : `Партнёр ${Math.floor(partnerMins / 60)} ч назад`}
              </span>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleInvite}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.2)",
                borderRadius: 999, padding: "7px 18px", cursor: "pointer",
                fontSize: "clamp(11px,3vw,13px)", color: "rgba(255,255,255,0.5)",
                fontWeight: 600, fontFamily: "inherit",
              }}
            >
              <div style={{ width: 14, height: 14, color: "rgba(255,255,255,0.45)" }}>{Icons.users}</div>
              Пригласить партнёра
            </motion.button>
          )}
        </div>
      </main>

      {/* ── CAROUSEL NAV ──────────────────────────────────────────────── */}
      <nav style={{ padding: "6px clamp(10px,3vw,14px) clamp(28px,8vw,40px)", zIndex: 30 }}>
        <div style={{
          background: "rgba(255,255,255,0.09)", backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.16)", borderRadius: 999,
          padding: "clamp(4px,1.2vw,7px) clamp(5px,1.5vw,8px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
        }}>
          <Carousel>
            <CarouselBtn icon={Icons.food}     label="КОРМИТЬ"   active={activeTab==="feed"}     disabled={isCd("feed")} cdLabel={fmtCd(getCd("feed"))} onClick={() => handleTab("feed")} />
            <CarouselBtn icon={Icons.game}     label="ИГРАТЬ"    active={activeTab==="play"}     disabled={isCd("play")} cdLabel={fmtCd(getCd("play"))} onClick={() => handleTab("play")} />
            <CarouselBtn icon={Icons.pet}      label="ГЛАДИТЬ"   active={activeTab==="pet"}      disabled={isCd("pet")}  cdLabel={fmtCd(getCd("pet"))}  onClick={() => handleTab("pet")} />
            <CarouselBtn icon={Icons.shop}     label="МАГАЗИН"   active={activeTab==="shop"}     onClick={() => handleTab("shop")} />
            <CarouselBtn icon={Icons.moon}     label="СОН"       active={activeTab==="sleep"}    onClick={() => handleTab("sleep")} />
            <CarouselBtn icon={Icons.users}    label="ПАРТНЁР"   active={activeTab==="partner"}  onClick={() => handleTab("partner")} />
            <CarouselBtn icon={Icons.settings} label="НАСТРОЙКИ" active={activeTab==="settings"} onClick={() => handleTab("settings")} />
          </Carousel>
        </div>
      </nav>

      {/* iOS indicator */}
      <div style={{
        position: "absolute", bottom: "clamp(6px,2vw,10px)", left: "50%", transform: "translateX(-50%)",
        width: "clamp(90px,28vw,120px)", height: 4,
        background: "rgba(255,255,255,0.16)", borderRadius: 4, zIndex: 40,
      }} />
    </div>
  );
}