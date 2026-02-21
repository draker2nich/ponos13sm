// mini-app/src/pages/HomePage.tsx
import { useEffect, useCallback, useState, useRef } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { usePetStore } from "../store/usePetStore";
import { PetSVG } from "../components/PetSVG";
import { createInvite } from "../api/pets";
import type { ActionType } from "../api/types";

const tg = window.Telegram?.WebApp;

type CSSProps = React.CSSProperties;

const G = {
  base: {
    background:           "rgba(255, 255, 255, 0.06)",
    backdropFilter:       "blur(20px) saturate(160%)",
    WebkitBackdropFilter: "blur(20px) saturate(160%)",
    border:               "1px solid rgba(255, 255, 255, 0.10)",
    boxShadow:            "inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.12)",
  } as CSSProps,
  heavy: {
    background:           "rgba(255, 255, 255, 0.075)",
    backdropFilter:       "blur(40px) saturate(200%)",
    WebkitBackdropFilter: "blur(40px) saturate(200%)",
    border:               "1px solid rgba(255, 255, 255, 0.12)",
    boxShadow:            "inset 0 1.5px 0 rgba(255,255,255,0.16), inset 0 -1px 0 rgba(0,0,0,0.18), 0 16px 48px rgba(0,0,0,0.5)",
  } as CSSProps,
  active: {
    background:           "rgba(255, 255, 255, 0.15)",
    backdropFilter:       "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border:               "1px solid rgba(255, 255, 255, 0.24)",
    boxShadow:            "inset 0 1px 0 rgba(255,255,255,0.24), 0 4px 16px rgba(0,0,0,0.2)",
  } as CSSProps,
  tag: {
    background:           "rgba(255, 255, 255, 0.05)",
    backdropFilter:       "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border:               "1px solid rgba(255, 255, 255, 0.09)",
    boxShadow:            "inset 0 1px 0 rgba(255,255,255,0.10)",
  } as CSSProps,
} as const;

const IC: Record<string, React.ReactNode> = {
  paw:   <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path d="M12 2C9.8 2 8 3.8 8 6s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm-5 5C5.3 7 4 8.3 4 10s1.3 3 3 3 3-1.3 3-3-1.3-3-3-3zm10 0c-1.7 0-3 1.3-3 3s1.3 3 3 3 3-1.3 3-3-1.3-3-3-3zM5 14c-1.7 0-3 1.3-3 3s1.3 3 3 3 3-1.3 3-3-1.3-3-3-3zm14 0c-1.7 0-3 1.3-3 3s1.3 3 3 3 3-1.3 3-3-1.3-3-3-3zm-7 1c-3.3 0-6 1.6-6 3.5V20h12v-1.5c0-1.9-2.7-3.5-6-3.5z"/></svg>,
  fire:  <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path d="M12.8 21.8C16 21.2 20 18.9 20 13.1c0-5.3-3.9-8.8-6.7-10.4-.6-.4-1.3.1-1.3.8V5.3c0 1.4-.6 4-2.3 5.1-.9.6-1.8-.3-1.9-1.3l-.1-.8c-.1-1-.9-1.5-1.7-1-1.4 1.1-2.9 3-2.9 5.7 0 7.1 5.3 8.9 7.9 8.9.2 0 .4 0 .6-.01-1.3-.12-3.4-.92-3.4-3.53 0-2.05 1.5-3.44 2.6-4.11.3-.18.66.05.66.4v.59c0 .45.17 1.15.58 1.64.47.55 1.16-.02 1.22-.7.02-.22.24-.37.44-.25.64.38 1.46 1.18 1.46 2.46 0 2.05-1.13 2.98-2.17 3.35z"/></svg>,
  star:  <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  food:  <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path d="M18.06 22.99h1.66c.84 0 1.53-.64 1.63-1.46L23 5.05h-5V1h-1.97v4.05h-4.97l.3 2.34c1.71.47 3.31 1.32 4.27 2.26 1.44 1.42 2.43 2.89 2.43 5.29v8.05zM1 21.99V21h15.03v.99c0 .55-.45 1-1.01 1H2.01c-.56 0-1.01-.45-1.01-1zm15.03-7c0-8-15.03-8-15.03 0h15.03zM1.02 17h15v2h-15z"/></svg>,
  game:  <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path d="M15 7.5V2H9v5.5l3 3 3-3zM7.5 9H2v6h5.5l3-3-3-3zM9 16.5V22h6v-5.5l-3-3-3 3zM16.5 9l-3 3 3 3H22V9h-5.5z"/></svg>,
  moon:  <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/></svg>,
  wash:  <svg viewBox="0 0 1024 1024" fill="currentColor" width="100%" height="100%"><path d="M899.1 869.6l-53-305.6H864c14.4 0 26-11.6 26-26V346c0-14.4-11.6-26-26-26H618V138c0-14.4-11.6-26-26-26H432c-14.4 0-26 11.6-26 26v182H160c-14.4 0-26 11.6-26 26v192c0 14.4 11.6 26 26 26h17.9l-53 305.6c-0.3 1.5-0.4 3-0.4 4.4 0 14.4 11.6 26 26 26h723c1.5 0 3-0.1 4.4-0.4 14.2-2.4 23.7-15.9 21.2-30zM204 390h272V182h72v208h272v104H204V390z m468 440V674c0-4.4-3.6-8-8-8h-48c-4.4 0-8 3.6-8 8v156H416V674c0-4.4-3.6-8-8-8h-48c-4.4 0-8 3.6-8 8v156H202.8l45.1-260H776l45.1 260H672z"/></svg>,
  shop:  <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96C5 16.1 6.1 17 7 17h11v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63H17c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 21.46 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>,
  users: <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>,
  settings: <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>,
  petIcon: <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path d="M19.0803 15.7203C18.4903 12.1903 15.1003 9.32031 11.5203 9.32031C7.63028 9.32031 4.21028 12.4703 3.88028 16.3503C3.75028 17.8503 4.23028 19.2703 5.22028 20.3403C6.20028 21.4103 7.58028 22.0003 9.08028 22.0003H13.7603C15.4503 22.0003 16.9303 21.3403 17.9403 20.1503C18.9503 18.9603 19.3503 17.3803 19.0803 15.7203Z"/><path d="M10.2796 7.86C11.8978 7.86 13.2096 6.54819 13.2096 4.93C13.2096 3.31181 11.8978 2 10.2796 2C8.66141 2 7.34961 3.31181 7.34961 4.93C7.34961 6.54819 8.66141 7.86 10.2796 7.86Z"/><path d="M16.94 9.02844C18.2876 9.02844 19.38 7.93601 19.38 6.58844C19.38 5.24086 18.2876 4.14844 16.94 4.14844C15.5924 4.14844 14.5 5.24086 14.5 6.58844C14.5 7.93601 15.5924 9.02844 16.94 9.02844Z"/><path d="M20.5496 12.9313C21.6266 12.9313 22.4996 12.0582 22.4996 10.9812C22.4996 9.90429 21.6266 9.03125 20.5496 9.03125C19.4727 9.03125 18.5996 9.90429 18.5996 10.9812C18.5996 12.0582 19.4727 12.9313 20.5496 12.9313Z"/><path d="M3.94 10.9816C5.28757 10.9816 6.38 9.88914 6.38 8.54156C6.38 7.19399 5.28757 6.10156 3.94 6.10156C2.59243 6.10156 1.5 7.19399 1.5 8.54156C1.5 9.88914 2.59243 10.9816 3.94 10.9816Z"/></svg>,
  dot:   <svg viewBox="0 0 8 8" fill="currentColor" width="100%" height="100%"><circle cx="4" cy="4" r="4"/></svg>,
};

function fmtCd(iso: string | null): string {
  if (!iso) return "";
  const s = Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000));
  if (!s) return "";
  if (s > 3600) return `${Math.floor(s / 3600)}ч`;
  if (s > 60)   return `${Math.floor(s / 60)}м`;
  return `${s}с`;
}
const cdActive = (iso: string | null) => !!iso && new Date(iso).getTime() > Date.now();

// ─── MiniStatBar — компактная горизонтальная полоска ─────────────────────────
function MiniStatBar({ value, color, icon }: { value: number; color: string; icon: React.ReactNode }) {
  const v = Math.max(0, Math.min(100, value));
  const low = v < 25;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, flex: 1 }}>
      <div style={{
        width: 12, height: 12, flexShrink: 0,
        color: low ? "rgba(255,100,100,0.85)" : "rgba(255,255,255,0.45)",
      }}>{icon}</div>
      <div style={{
        flex: 1, height: 3, borderRadius: 3,
        background: "rgba(255,255,255,0.07)", overflow: "hidden",
      }}>
        <motion.div
          animate={{ width: `${v}%` }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          style={{
            height: "100%", borderRadius: 3,
            background: low
              ? "linear-gradient(90deg,rgba(255,77,77,0.9),rgba(255,107,53,0.9))"
              : color,
            boxShadow: low ? "0 0 6px rgba(255,77,77,0.5)" : undefined,
          }}
        />
      </div>
    </div>
  );
}

// ─── Carousel ────────────────────────────────────────────────────────────────
const BTN_W   = 48;
const BTN_GAP = 5;
const VISIBLE = 5;
const VIEWPORT_W = VISIBLE * BTN_W + (VISIBLE - 1) * BTN_GAP;

function Carousel({ children }: { children: React.ReactNode }) {
  const ref  = useRef<HTMLDivElement>(null);
  const down = useRef(false);
  const sx   = useRef(0);
  const sl   = useRef(0);

  return (
    <div
      ref={ref}
      onMouseDown={e => {
        down.current = true;
        sx.current   = e.pageX - ref.current!.offsetLeft;
        sl.current   = ref.current!.scrollLeft;
        ref.current!.style.cursor = "grabbing";
      }}
      onMouseUp={()    => { down.current = false; if (ref.current) ref.current.style.cursor = "grab"; }}
      onMouseLeave={()  => { down.current = false; if (ref.current) ref.current.style.cursor = "grab"; }}
      onMouseMove={e => {
        if (!down.current) return;
        ref.current!.scrollLeft = sl.current - (e.pageX - ref.current!.offsetLeft - sx.current) * 1.2;
      }}
      style={{
        display: "flex", gap: BTN_GAP,
        width: VIEWPORT_W,
        overflowX: "auto",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
        cursor: "grab",
        userSelect: "none",
      }}
    >
      {children}
    </div>
  );
}

// ─── CarouselBtn ─────────────────────────────────────────────────────────────
type TabId = ActionType | "shop" | "sleep" | "partner" | "settings";

function CarouselBtn({ icon, active, disabled, cdLabel, onClick }: {
  icon: React.ReactNode;
  active?: boolean; disabled?: boolean; cdLabel?: string; onClick?: () => void;
}) {
  return (
    <motion.button
      whileTap={disabled ? {} : { scale: 0.86 }}
      onClick={disabled ? undefined : onClick}
      title={cdLabel}
      style={{
        flexShrink: 0, width: BTN_W, height: BTN_W,
        borderRadius: 18,
        ...(active
          ? G.active
          : { background: "transparent", border: "1px solid transparent", boxShadow: "none" }),
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background 0.15s",
        fontFamily: "inherit", padding: 0,
        position: "relative",
      }}
    >
      <div style={{
        width: 26, height: 26,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: disabled
          ? "rgba(255,255,255,0.18)"
          : active
            ? "rgba(255,255,255,0.95)"
            : "rgba(255,255,255,0.55)",
        filter: disabled ? "opacity(0.4)" : "none",
        transition: "color 0.18s",
      }}>{icon}</div>
      {disabled && cdLabel && (
        <div style={{
          position: "absolute", bottom: 3, left: "50%", transform: "translateX(-50%)",
          fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.3)",
          lineHeight: 1, whiteSpace: "nowrap",
        }}>{cdLabel}</div>
      )}
    </motion.button>
  );
}

// ─── FloatAnim ───────────────────────────────────────────────────────────────
function FloatAnim({ show, text }: { show: boolean; text: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -56 }}
          transition={{ duration: 0.85, ease: "easeOut" }}
          style={{
            position: "absolute", top: 0, left: "50%",
            transform: "translateX(-50%)",
            fontSize: 18, fontWeight: 800,
            color: "rgba(255,255,255,0.9)",
            textShadow: "0 2px 12px rgba(255,255,255,0.35)",
            pointerEvents: "none", whiteSpace: "nowrap", zIndex: 20,
          }}
        >{text}</motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── DraggablePet ────────────────────────────────────────────────────────────
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
      dragElastic={0.14}
      dragMomentum={false}
      whileDrag={{ scale: 1.04, filter: "drop-shadow(0 0 24px rgba(255,255,255,0.18))" }}
      style={{ cursor: "grab", touchAction: "none", display: "inline-block" }}
      onPointerDown={e => controls.start(e)}
    >
      {children}
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
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
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100dvh", background: "#080810" }}>
      <div style={{ width: 38, height: 38, color: "rgba(255,255,255,0.4)" }}>{IC.paw}</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", marginTop: 12 }}>Загрузка...</div>
    </div>
  );
  if (!pet) return null;

  const evo      = Math.min(7, Math.floor(pet.level / 2) + 1);
  const needed   = pet.level * 100;
  const xpPct    = Math.min(100, pet.experience / needed * 100);
  const getCd    = (a: string) => pet.cooldowns.find(c => c.action === a)?.available_at ?? null;
  const isCd     = (a: string) => cdActive(getCd(a));
  const partner  = pet.owners.find(o => !o.is_creator) ?? pet.owners[1];
  const pMins    = partner?.last_active_at
    ? Math.floor((Date.now() - new Date(partner.last_active_at).getTime()) / 60_000) : null;
  const pOnline  = pMins !== null && pMins < 5;
  const sleepVal = pet.mood === "sleepy" ? 100 : 55;

  const showFloat = (t: string) => {
    setFloatText(t); setFloatShow(true);
    setTimeout(() => setFloatShow(false), 1400);
  };

  const doAction = async (action: ActionType, msg: string) => {
    if (isCd(action)) return;
    setActiveTab(action);
    await performAction(action);
    showFloat(msg);
  };

  const handleInvite = async () => {
    try   { const inv = await createInvite(pet.id); tg?.showAlert?.(`Ссылка:\n${inv.link}`); }
    catch { tg?.showAlert?.("Не удалось создать ссылку"); }
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
      case "settings": tg?.showAlert?.(`${pet.name} · Ур.${pet.level}\nВозраст: ${pet.age_days} дн.\nЭволюция: ${evo}/7`); break;
    }
  };

  return (
    <div style={{
      maxWidth: 480,
      margin: "0 auto",
      height: "100dvh",
      minHeight: 500,
      background: "linear-gradient(160deg, #0d0d14 0%, #07070d 100%)",
      fontFamily: "'Inter', system-ui, sans-serif",
      position: "relative", overflow: "hidden",
      display: "flex", flexDirection: "column", color: "#fff",
    }}>

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <header style={{
        padding: "clamp(10px,3vw,20px) clamp(12px,4vw,16px) 4px",
        zIndex: 10, position: "relative",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>

          {/* Name pill + streak fire */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            ...G.heavy, borderRadius: 999,
            padding: "6px 12px 6px 6px",
            minWidth: 0, flexShrink: 1,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
              ...G.base,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 5, color: "rgba(255,255,255,0.65)",
            }}>{IC.paw}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: "clamp(12px,3.2vw,14px)", fontWeight: 700,
                color: "rgba(255,255,255,0.88)", lineHeight: 1.2,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                display: "flex", alignItems: "center", gap: 5,
              }}>
                {pet.name}
                {/* Streak fire badge inline with name */}
                {pet.streak > 0 && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 2,
                    fontSize: 10, fontWeight: 800,
                    color: "rgba(255,160,80,0.9)",
                  }}>
                    <span style={{ width: 11, height: 11, display: "inline-flex" }}>{IC.fire}</span>
                    {pet.streak}
                  </span>
                )}
              </div>
              {/* XP bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                <span style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em" }}>
                  LV.{pet.level}
                </span>
                <div style={{ width: "clamp(28px,7vw,48px)", height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
                  <motion.div animate={{ width: `${xpPct}%` }} transition={{ duration: 0.6 }}
                    style={{ height: "100%", background: "rgba(255,255,255,0.48)", borderRadius: 2 }}/>
                </div>
              </div>
            </div>
          </div>

          {/* Settings only */}
          <div style={{
            width: 36, height: 36, flexShrink: 0,
            ...G.heavy, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 9, color: "rgba(255,255,255,0.5)",
            cursor: "pointer",
          }} onClick={() => handleTab("settings")}>
            {IC.settings}
          </div>
        </div>

        {/* ── MINI STAT BARS — под хедером ────────────────────────── */}
        <div style={{
          display: "flex", gap: 10, marginTop: 8,
          padding: "0 2px",
        }}>
          <MiniStatBar value={pet.hunger}    color="rgba(255,255,255,0.5)" icon={IC.food} />
          <MiniStatBar value={pet.happiness} color="rgba(255,255,255,0.5)" icon={IC.game} />
          <MiniStatBar value={sleepVal}      color="rgba(255,255,255,0.5)" icon={IC.moon} />
          <MiniStatBar value={pet.health}    color="rgba(255,255,255,0.5)" icon={IC.wash} />
        </div>
      </header>

      {/* ── PET AREA ────────────────────────────────────────────────── */}
      <main ref={mainRef} style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden", zIndex: 5,
      }}>
        <div style={{ position: "relative" }}>
          <FloatAnim show={floatShow} text={floatText}/>
          <DraggablePet constraintsRef={mainRef}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <PetSVG
                mood={pet.mood} petType={pet.pet_type}
                evolution={evo} isReacting={floatShow}
                size="clamp(110px,32vw,180px)"
              />
              <div style={{
                width: "clamp(44px,13vw,68px)", height: 6,
                background: "rgba(0,0,0,0.28)", filter: "blur(6px)",
                borderRadius: "50%", marginTop: -3, pointerEvents: "none",
              }}/>
            </div>
          </DraggablePet>
        </div>
      </main>

      {/* ── BOTTOM BLOCK: partner + carousel ────────────────────────── */}
      <div style={{
        padding: "0 clamp(10px,3vw,16px) clamp(24px,6vw,36px)",
        zIndex: 10, position: "relative",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      }}>
        {/* Partner / invite strip */}
        <div>
          {partner ? (
            <div style={{
              display: "flex", alignItems: "center", gap: 7,
              ...G.tag, borderRadius: 999, padding: "5px 14px",
            }}>
              <div style={{
                width: 6, height: 6, flexShrink: 0,
                color: pOnline ? "#4ade80" : "rgba(255,255,255,0.22)",
                filter: pOnline ? "drop-shadow(0 0 4px #4ade80)" : "none",
              }}>{IC.dot}</div>
              <span style={{ fontSize: "clamp(10px,2.6vw,12px)", color: "rgba(255,255,255,0.42)", fontWeight: 500 }}>
                {pMins === null  ? "Партнёр не заходил"
                  : pMins < 5   ? "Партнёр онлайн"
                  : pMins < 60  ? `Партнёр ${pMins} мин назад`
                  : `Партнёр ${Math.floor(pMins / 60)} ч назад`}
              </span>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.96 }} onClick={handleInvite}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                ...G.tag,
                border: "1px dashed rgba(255,255,255,0.12)",
                borderRadius: 999, padding: "5px 14px",
                cursor: "pointer", fontFamily: "inherit",
                fontSize: "clamp(10px,2.8vw,12px)",
                color: "rgba(255,255,255,0.42)", fontWeight: 600,
              }}
            >
              <div style={{ width: 12, height: 12, color: "rgba(255,255,255,0.36)" }}>{IC.users}</div>
              Пригласить партнёра
            </motion.button>
          )}
        </div>

        {/* Carousel */}
        <div style={{ ...G.heavy, borderRadius: 26, padding: "5px 6px", display: "inline-flex" }}>
          <Carousel>
            <CarouselBtn icon={IC.food}    active={activeTab==="feed"}    disabled={isCd("feed")} cdLabel={fmtCd(getCd("feed"))} onClick={() => handleTab("feed")}/>
            <CarouselBtn icon={IC.game}    active={activeTab==="play"}    disabled={isCd("play")} cdLabel={fmtCd(getCd("play"))} onClick={() => handleTab("play")}/>
            <CarouselBtn icon={IC.petIcon} active={activeTab==="pet"}     disabled={isCd("pet")}  cdLabel={fmtCd(getCd("pet"))}  onClick={() => handleTab("pet")}/>
            <CarouselBtn icon={IC.shop}    active={activeTab==="shop"}    onClick={() => handleTab("shop")}/>
            <CarouselBtn icon={IC.moon}    active={activeTab==="sleep"}   onClick={() => handleTab("sleep")}/>
            <CarouselBtn icon={IC.users}   active={activeTab==="partner"} onClick={() => handleTab("partner")}/>
          </Carousel>
        </div>
      </div>

      {/* iOS home indicator */}
      <div style={{
        position: "absolute", bottom: "clamp(4px,1.5vw,8px)", left: "50%",
        transform: "translateX(-50%)",
        width: 100, height: 4,
        background: "rgba(255,255,255,0.10)", borderRadius: 4, zIndex: 20,
      }}/>
    </div>
  );
}