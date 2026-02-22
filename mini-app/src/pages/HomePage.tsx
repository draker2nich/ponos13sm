// mini-app/src/pages/HomePage.tsx
import { useEffect, useCallback, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence, useDragControls, useMotionValue, useSpring } from "framer-motion";
import { usePetStore } from "../store/usePetStore";
import { useMenuStore, MENU_ORDER, type MenuCategory } from "../store/useMenuStore";
import { PetSVG } from "../components/PetSVG";
import { createInvite } from "../api/pets";
import type { ActionType } from "../api/types";

const tg = window.Telegram?.WebApp;
type CSSProps = React.CSSProperties;

const NOTAP: CSSProps = {
  WebkitTapHighlightColor: "transparent",
  WebkitTouchCallout: "none",
  WebkitUserSelect: "none",
  userSelect: "none",
};

/* ── Design tokens ─────────────────────────────────────────────────────────── */
const GLASS: CSSProps = {
  background: "rgba(255,255,255,0.60)",
  backdropFilter: "blur(32px) saturate(180%)",
  WebkitBackdropFilter: "blur(32px) saturate(180%)",
  border: "1px solid rgba(255,255,255,0.72)",
  boxShadow: "0 8px 32px rgba(100,100,140,0.13), 0 2px 8px rgba(100,100,140,0.08), inset 0 1.5px 0 rgba(255,255,255,0.95)",
};

const G = {
  heavy: {
    background:"rgba(255,255,255,0.55)", backdropFilter:"blur(32px) saturate(180%)",
    WebkitBackdropFilter:"blur(32px) saturate(180%)", border:"1px solid rgba(255,255,255,0.70)",
    boxShadow:"0 6px 24px rgba(0,0,0,0.07), inset 0 1.5px 0 rgba(255,255,255,0.9)",
  } as CSSProps,
  pill: {
    background:"rgba(255,255,255,0.38)", backdropFilter:"blur(14px)",
    WebkitBackdropFilter:"blur(14px)", border:"1px solid rgba(255,255,255,0.55)",
    boxShadow:"0 2px 10px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.7)",
  } as CSSProps,
} as const;

/* ── Icons ─────────────────────────────────────────────────────────────────── */
const IC: Record<string, React.ReactNode> = {
  petIcon: <svg viewBox="0 0 24 24" fill="none" width="100%" height="100%"><path d="M19.08 15.72C18.49 12.19 15.1 9.32 11.52 9.32C7.63 9.32 4.21 12.47 3.88 16.35C3.75 17.85 4.23 19.27 5.22 20.34C6.2 21.41 7.58 22 9.08 22H13.76C15.45 22 16.93 21.34 17.94 20.15C18.95 18.96 19.35 17.38 19.08 15.72Z" fill="currentColor"/><path d="M10.28 7.86C11.9 7.86 13.21 6.55 13.21 4.93C13.21 3.31 11.9 2 10.28 2C8.66 2 7.35 3.31 7.35 4.93C7.35 6.55 8.66 7.86 10.28 7.86Z" fill="currentColor"/><path d="M16.94 9.03C18.29 9.03 19.38 7.94 19.38 6.59C19.38 5.24 18.29 4.15 16.94 4.15C15.59 4.15 14.5 5.24 14.5 6.59C14.5 7.94 15.59 9.03 16.94 9.03Z" fill="currentColor"/><path d="M20.55 12.93C21.63 12.93 22.5 12.06 22.5 10.98C22.5 9.9 21.63 9.03 20.55 9.03C19.47 9.03 18.6 9.9 18.6 10.98C18.6 12.06 19.47 12.93 20.55 12.93Z" fill="currentColor"/><path d="M3.94 10.98C5.29 10.98 6.38 9.89 6.38 8.54C6.38 7.19 5.29 6.1 3.94 6.1C2.59 6.1 1.5 7.19 1.5 8.54C1.5 9.89 2.59 10.98 3.94 10.98Z" fill="currentColor"/></svg>,
  fire: <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path d="M12.8 21.8C16 21.2 20 18.9 20 13.1c0-5.3-3.9-8.8-6.7-10.4-.6-.4-1.3.1-1.3.8V5.3c0 1.4-.6 4-2.3 5.1-.9.6-1.8-.3-1.9-1.3l-.1-.8c-.1-1-.9-1.5-1.7-1-1.4 1.1-2.9 3-2.9 5.7 0 7.1 5.3 8.9 7.9 8.9.2 0 .4 0 .6-.01-1.3-.12-3.4-.92-3.4-3.53 0-2.05 1.5-3.44 2.6-4.11.3-.18.66.05.66.4v.59c0 .45.17 1.15.58 1.64.47.55 1.16-.02 1.22-.7.02-.22.24-.37.44-.25.64.38 1.46 1.18 1.46 2.46 0 2.05-1.13 2.98-2.17 3.35z"/></svg>,
  food: <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path d="M18.06 22.99h1.66c.84 0 1.53-.64 1.63-1.46L23 5.05h-5V1h-1.97v4.05h-4.97l.3 2.34c1.71.47 3.31 1.32 4.27 2.26 1.44 1.42 2.43 2.89 2.43 5.29v8.05zM1 21.99V21h15.03v.99c0 .55-.45 1-1.01 1H2.01c-.56 0-1.01-.45-1.01-1zm15.03-7c0-8-15.03-8-15.03 0h15.03zM1.02 17h15v2h-15z"/></svg>,
  game: <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path d="M15 7.5V2H9v5.5l3 3 3-3zM7.5 9H2v6h5.5l3-3-3-3zM9 16.5V22h6v-5.5l-3-3-3 3zM16.5 9l-3 3 3 3H22V9h-5.5z"/></svg>,
  moon: <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/></svg>,
  wash: <svg viewBox="0 0 1024 1024" fill="currentColor" width="100%" height="100%"><path d="M899.1 869.6l-53-305.6H864c14.4 0 26-11.6 26-26V346c0-14.4-11.6-26-26-26H618V138c0-14.4-11.6-26-26-26H432c-14.4 0-26 11.6-26 26v182H160c-14.4 0-26 11.6-26 26v192c0 14.4 11.6 26 26 26h17.9l-53 305.6c-0.3 1.5-0.4 3-0.4 4.4 0 14.4 11.6 26 26 26h723c1.5 0 3-0.1 4.4-0.4 14.2-2.4 23.7-15.9 21.2-30zM204 390h272V182h72v208h272v104H204V390z m468 440V674c0-4.4-3.6-8-8-8h-48c-4.4 0-8 3.6-8 8v156H416V674c0-4.4-3.6-8-8-8h-48c-4.4 0-8 3.6-8 8v156H202.8l45.1-260H776l45.1 260H672z"/></svg>,
  shop: <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96C5 16.1 6.1 17 7 17h11v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63H17c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 21.46 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>,
  users: <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>,
  settings: <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>,
  dot: <svg viewBox="0 0 8 8" fill="currentColor" width="100%" height="100%"><circle cx="4" cy="4" r="4"/></svg>,
  chevronDown: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="100%" height="100%"><polyline points="6 9 12 15 18 9"/></svg>,
};

/* ── Menu content ─────────────────────────────────────────────────────────── */
const MENU_CONTENT: Record<MenuCategory, React.ReactNode> = {
  feed: (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <p style={{ fontSize:13, color:"rgba(0,0,0,0.45)", textAlign:"center", margin:0 }}>Выбери угощение для питомца</p>
      <div style={{ display:"flex", flexWrap:"wrap", gap:10, justifyContent:"center" }}>
        {["🍎 Яблоко","🍗 Курица","🥕 Морковь","🐟 Рыба","🧁 Кекс","🍖 Мясо"].map(f => (
          <button key={f} style={{ padding:"10px 16px", borderRadius:18, background:"rgba(255,255,255,0.55)", border:"1px solid rgba(255,255,255,0.75)", fontSize:13, fontWeight:600, color:"rgba(0,0,0,0.65)", cursor:"pointer", fontFamily:"inherit", outline:"none", ...NOTAP }}>{f}</button>
        ))}
      </div>
    </div>
  ),
  play: (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <p style={{ fontSize:13, color:"rgba(0,0,0,0.45)", textAlign:"center", margin:0 }}>Выбери игру</p>
      <div style={{ display:"flex", flexWrap:"wrap", gap:10, justifyContent:"center" }}>
        {["🎾 Мяч","🧸 Игрушка","🎈 Шарик","🏀 Баскетбол","🎮 Игра"].map(g => (
          <button key={g} style={{ padding:"10px 16px", borderRadius:18, background:"rgba(255,255,255,0.55)", border:"1px solid rgba(255,255,255,0.75)", fontSize:13, fontWeight:600, color:"rgba(0,0,0,0.65)", cursor:"pointer", fontFamily:"inherit", outline:"none", ...NOTAP }}>{g}</button>
        ))}
      </div>
    </div>
  ),
  sleep: (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
      <span style={{ fontSize:48 }}>😴</span>
      <p style={{ fontSize:14, color:"rgba(0,0,0,0.50)", textAlign:"center", margin:0, lineHeight:1.5 }}>Питомец хочет отдохнуть.<br/>Уложи его спать, чтобы восстановить силы.</p>
      <button style={{ padding:"12px 32px", borderRadius:999, background:"linear-gradient(135deg,#c5b8d8,#a89cc8)", border:"none", fontSize:14, fontWeight:700, color:"#fff", cursor:"pointer", fontFamily:"inherit", outline:"none", ...NOTAP }}>Спокойной ночи 🌙</button>
    </div>
  ),
  shop: (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <p style={{ fontSize:13, color:"rgba(0,0,0,0.45)", textAlign:"center", margin:0 }}>Магазин — скоро откроется!</p>
      <div style={{ display:"flex", flexWrap:"wrap", gap:10, justifyContent:"center" }}>
        {["🎀 Бант","👑 Корона","🛁 Ванна","🏠 Домик","💎 Кристалл"].map(i => (
          <button key={i} style={{ padding:"10px 16px", borderRadius:18, background:"rgba(255,255,255,0.35)", border:"1px dashed rgba(0,0,0,0.12)", fontSize:13, fontWeight:600, color:"rgba(0,0,0,0.35)", cursor:"not-allowed", fontFamily:"inherit", outline:"none", ...NOTAP }}>{i}</button>
        ))}
      </div>
    </div>
  ),
};

/* ── Helpers ────────────────────────────────────────────────────────────────── */
function fmtCd(iso: string | null): string {
  if (!iso) return "";
  const s = Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000));
  if (!s) return "";
  if (s > 3600) return `${Math.floor(s/3600)}ч`;
  if (s > 60)   return `${Math.floor(s/60)}м`;
  return `${s}с`;
}
const cdActive = (iso: string | null) => !!iso && new Date(iso).getTime() > Date.now();
const toDeg = (v: number) => Math.round(Math.max(0, Math.min(100, v)) / 100 * 360);
const MENU_TABS = new Set<string>(["feed","play","sleep","shop"]);

/* ── Layout constants ──────────────────────────────────────────────────────── */
const NAV_PAD   = 8;
const BTN_W     = 50;
const BTN_GAP   = 5;
const VISIBLE   = 3;
const SPAD      = 10;   // shadow padding in Carousel
const PILL_INNER_W = VISIBLE * BTN_W + (VISIBLE - 1) * BTN_GAP;   // 160
const WIDGET_H  = NAV_PAD * 2 + BTN_W;   // 66
const PILL_H    = 50;
const RING_SIZE = 34;
const GLOVE_SZ  = WIDGET_H;
const GLOVE_FLY = 52;
const GLOVE_GAP = 10;
const HALF_H    = WIDGET_H / 2;   // 33

/* ── StatusRing ────────────────────────────────────────────────────────────── */
function StatusRing({ value, icon }: { value: number; icon: React.ReactNode }) {
  const deg = toDeg(value); const low = value < 25; const R = 13;
  const circ = 2 * Math.PI * R; const dash = deg / 360 * circ;
  const col = low ? "rgba(220,60,60,0.80)" : "rgba(80,80,100,0.50)";
  return (
    <div style={{ position:"relative", width:RING_SIZE, height:RING_SIZE, flexShrink:0 }}>
      <svg width={RING_SIZE} height={RING_SIZE} style={{ position:"absolute", inset:0, transform:"rotate(-90deg)" }}>
        <circle cx={RING_SIZE/2} cy={RING_SIZE/2} r={R} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={2}/>
        <circle cx={RING_SIZE/2} cy={RING_SIZE/2} r={R} fill="none" stroke={col} strokeWidth={2}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>
      </svg>
      <div style={{ position:"absolute", inset:5, borderRadius:"50%", background:"rgba(255,255,255,0.5)",
        display:"flex", alignItems:"center", justifyContent:"center", padding:5,
        color: low ? "rgba(200,50,50,0.85)" : "rgba(60,60,80,0.55)" }}>{icon}</div>
    </div>
  );
}

/* ── Carousel ──────────────────────────────────────────────────────────────── */
// Vertical SPAD padding lets button shadows paint without being clipped.
// overflow:hidden on the outer wrapper clips at the padding-box edge (SPAD px outside content).
function Carousel({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const down = useRef(false); const sx = useRef(0); const sl = useRef(0);
  return (
    <div style={{
      width: PILL_INNER_W,
      overflow: "hidden",
      paddingBlock: SPAD,
      marginBlock: -SPAD,
    }}>
      <div
        ref={ref}
        onMouseDown={e => { down.current=true; sx.current=e.pageX; sl.current=ref.current!.scrollLeft; }}
        onMouseUp={()  => { down.current=false; }}
        onMouseLeave={()=> { down.current=false; }}
        onMouseMove={e => { if(!down.current) return; ref.current!.scrollLeft=sl.current-(e.pageX-sx.current)*1.2; }}
        style={{
          display:"flex", gap:BTN_GAP, alignItems:"center",
          overflowX:"auto",
          height: BTN_W + SPAD * 2,
          padding: `${SPAD}px 0`,
          scrollbarWidth:"none",
          WebkitOverflowScrolling:"touch",
          cursor:"grab",
          ...NOTAP,
        }}
      >{children}</div>
    </div>
  );
}

/* ── CarouselBtn ───────────────────────────────────────────────────────────── */
type TabId = ActionType | "shop" | "sleep" | "partner" | "settings";

function CarouselBtn({ icon, active, disabled, cdLabel, onClick }: {
  icon: React.ReactNode; active?: boolean; disabled?: boolean; cdLabel?: string; onClick?: () => void;
}) {
  return (
    <div style={{ flexShrink:0, width:BTN_W, height:BTN_W }}>
      <motion.button whileTap={disabled ? {} : { scale:0.84 }} onClick={disabled ? undefined : onClick}
        style={{
          width:"100%", height:"100%", borderRadius:"50%",
          background: active ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.30)",
          backdropFilter: active ? "blur(16px)" : undefined,
          WebkitBackdropFilter: active ? "blur(16px)" : undefined,
          border: active ? "1.5px solid rgba(255,255,255,0.95)" : "1px solid rgba(255,255,255,0.50)",
          boxShadow: active
            ? "0 4px 6px rgba(100,100,150,0.22), 0 1px 3px rgba(100,100,150,0.12)"
            : "0 2px 4px rgba(100,100,150,0.10)",
          cursor: disabled ? "not-allowed" : "pointer",
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
          gap:2, transition:"background 0.15s, border 0.15s, box-shadow 0.15s",
          fontFamily:"inherit", padding:0, outline:"none",
          ...NOTAP,
        }}
      >
        <div style={{
          width:22, height:22, display:"flex", alignItems:"center", justifyContent:"center",
          color: disabled ? "rgba(0,0,0,0.18)" : active ? "rgba(0,0,0,0.68)" : "rgba(0,0,0,0.38)",
          filter: disabled ? "opacity(0.35)" : "none", transition:"color 0.15s",
        }}>{icon}</div>
        {disabled && cdLabel && (
          <span style={{ fontSize:7, fontWeight:800, color:"rgba(0,0,0,0.30)", lineHeight:1 }}>{cdLabel}</span>
        )}
      </motion.button>
    </div>
  );
}

/* ── FloatAnim ─────────────────────────────────────────────────────────────── */
function FloatAnim({ show, text }: { show: boolean; text: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity:1, y:0 }} animate={{ opacity:0, y:-60 }}
          transition={{ duration:0.85, ease:"easeOut" }}
          style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)",
            fontSize:20, fontWeight:800, color:"rgba(0,0,0,0.60)",
            textShadow:"0 2px 8px rgba(255,255,255,0.6)", pointerEvents:"none",
            whiteSpace:"nowrap", zIndex:20 }}
        >{text}</motion.div>
      )}
    </AnimatePresence>
  );
}

interface HeartFx { id:number; x:number; y:number; angle:number; dist:number }

/* ── DraggablePet ──────────────────────────────────────────────────────────── */
function DraggablePet({ children, constraintsRef, isStroking, onHeartAt, petDomRef, disabled }: {
  children: React.ReactNode;
  constraintsRef: React.RefObject<HTMLElement | null>;
  isStroking: boolean;
  onHeartAt: (x:number, y:number) => void;
  petDomRef: React.RefObject<HTMLDivElement | null>;
  disabled: boolean;
}) {
  const controls = useDragControls();
  const tickRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);

  const getPetCenter = useCallback(() => {
    const el = petDomRef.current; if (!el) return { x:0, y:0 };
    const r = el.getBoundingClientRect();
    return { x: r.left+r.width/2, y: r.top+r.height/2 };
  }, [petDomRef]);

  useEffect(() => {
    if (isStroking && !disabled) {
      if (!tickRef.current) {
        tickRef.current = setInterval(() => {
          const c = getPetCenter();
          const a = Math.random()*Math.PI*2;
          onHeartAt(c.x+Math.cos(a)*50, c.y+Math.sin(a)*50);
        }, 140);
      }
    } else {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    }
    return () => { if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; } };
  }, [isStroking, disabled, getPetCenter, onHeartAt]);

  return (
    <motion.div
      drag={!disabled} dragControls={controls} dragConstraints={constraintsRef}
      dragElastic={0.10} dragMomentum={false} whileDrag={disabled ? {} : { scale:1.06 }}
      style={{ cursor: disabled ? "default" : "grab", touchAction:"none", display:"inline-block", x:dragX, y:dragY, ...NOTAP }}
      onPointerDown={e => { if (!disabled) controls.start(e); }}
    >
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
        {children}
      </div>
    </motion.div>
  );
}

/* ── PettingGlove ──────────────────────────────────────────────────────────── */
function PettingGlove({ petRef, onStroking, isStroking }: {
  petRef: React.RefObject<HTMLDivElement|null>;
  onStroking: (v:boolean) => void;
  isStroking: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const activePointerId = useRef<number | null>(null);
  const historyRef = useRef<Array<{x:number;y:number;t:number}>>([]);
  const rawX = useMotionValue(-9999); const rawY = useMotionValue(-9999);
  const gX = useSpring(rawX, { stiffness:600, damping:30, mass:0.3 });
  const gY = useSpring(rawY, { stiffness:600, damping:30, mass:0.3 });
  const half = GLOVE_FLY / 2;

  const isOverPet = useCallback((cx:number, cy:number) => {
    const el = petRef.current; if (!el) return false;
    const r = el.getBoundingClientRect(); const pad = 28;
    return cx>=r.left-pad && cx<=r.right+pad && cy>=r.top-pad && cy<=r.bottom+pad;
  }, [petRef]);

  const isMoving = useCallback(() => {
    const h = historyRef.current; const now = Date.now();
    while (h.length>0 && now-h[0].t>200) h.shift();
    if (h.length<2) return false;
    let d=0; for (let i=1;i<h.length;i++) d+=Math.abs(h[i].x-h[i-1].x)+Math.abs(h[i].y-h[i-1].y);
    return d>6;
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    activePointerId.current = e.pointerId;
    historyRef.current = [{x:e.clientX, y:e.clientY, t:Date.now()}];
    rawX.jump(e.clientX - half); rawY.jump(e.clientY - half);
    gX.jump(e.clientX - half);   gY.jump(e.clientY - half);
    setIsDragging(true); onStroking(false);
  }, [rawX, rawY, gX, gY, half, onStroking]);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (activePointerId.current === null || e.pointerId !== activePointerId.current) return;
    e.preventDefault();
    rawX.set(e.clientX - half); rawY.set(e.clientY - half);
    historyRef.current.push({x:e.clientX, y:e.clientY, t:Date.now()});
    onStroking(isOverPet(e.clientX, e.clientY) && isMoving());
  }, [isOverPet, isMoving, onStroking, rawX, rawY, half]);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    if (activePointerId.current === null || e.pointerId !== activePointerId.current) return;
    activePointerId.current = null; historyRef.current = [];
    setIsDragging(false); onStroking(false);
  }, [onStroking]);

  useEffect(() => {
    if (!isDragging) return;
    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  const gloveAnim = isStroking
    ? { rotate:[-15,15,-15], transition:{repeat:Infinity,duration:0.25,ease:"easeInOut" as const} }
    : { rotate:0 };

  return (
    <>
      <div
        onPointerDown={handlePointerDown}
        style={{
          position:"absolute", inset:0, zIndex:2,
          display:"flex", alignItems:"center", justifyContent:"center",
          cursor: isDragging ? "grabbing" : "grab",
          touchAction:"none", ...NOTAP,
        }}
      >
        <img src="/sprites/glove.svg" draggable={false}
          style={{ width:64, height:64, objectFit:"contain", pointerEvents:"none",
            opacity: isDragging ? 0.25 : 1, transition:"opacity 0.15s" }}/>
      </div>
      {isDragging && (
        <div style={{ position:"fixed", inset:0, zIndex:999, pointerEvents:"none" }}>
          <motion.div animate={gloveAnim}
            style={{ position:"fixed", top:0, left:0, width:GLOVE_FLY, height:GLOVE_FLY,
              x:gX, y:gY, pointerEvents:"none", transformOrigin:"center center", overflow:"visible" }}>
            <img src="/sprites/glove.svg" draggable={false}
              style={{ width:"200%", height:"200%", objectFit:"contain", position:"absolute",
                top:"-50%", left:"-50%",
                filter: isStroking
                  ? "drop-shadow(0 4px 16px rgba(249,168,212,0.6))"
                  : "drop-shadow(0 4px 12px rgba(0,0,0,0.14))",
                transition:"filter 0.2s" }}/>
          </motion.div>
        </div>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MenuPanel — no own background, parent card provides the glass effect
══════════════════════════════════════════════════════════════════════════════ */
function MenuPanel({ menuH }: { menuH: string }) {
  const { openMenu, prevMenu, setMenu, closeMenu } = useMenuStore();
  const touchStart = useRef<{ x:number; y:number } | null>(null);

  const handleStart = useCallback((cx:number, cy:number) => { touchStart.current = { x:cx, y:cy }; }, []);
  const handleEnd   = useCallback((cx:number, cy:number) => {
    if (!touchStart.current || !openMenu) return;
    const dx = cx - touchStart.current.x;
    const dy = cy - touchStart.current.y;
    touchStart.current = null;
    if (dy > 40 && Math.abs(dy) > Math.abs(dx)*1.3) { closeMenu(); return; }
    if (Math.abs(dx) < 35 || Math.abs(dx) < Math.abs(dy)*0.7) return;
    const idx = MENU_ORDER.indexOf(openMenu);
    if (dx < 0 && idx < MENU_ORDER.length-1) setMenu(MENU_ORDER[idx+1]);
    if (dx > 0 && idx > 0)                   setMenu(MENU_ORDER[idx-1]);
  }, [openMenu, setMenu, closeMenu]);

  const dir = useMemo(() => {
    if (!prevMenu || !openMenu) return 0;
    const pi = MENU_ORDER.indexOf(prevMenu), ni = MENU_ORDER.indexOf(openMenu);
    if (pi === -1 || ni === -1) return 0;
    return ni > pi ? 1 : -1;
  }, [prevMenu, openMenu]);

  return (
    <div
      onTouchStart={e => { const t=e.touches[0]; handleStart(t.clientX,t.clientY); }}
      onTouchEnd={e   => { const t=e.changedTouches[0]; handleEnd(t.clientX,t.clientY); }}
      onMouseDown={e  => handleStart(e.clientX,e.clientY)}
      onMouseUp={e    => handleEnd(e.clientX,e.clientY)}
      style={{
        width:"100%", height:menuH,
        position:"relative", overflow:"hidden",
        touchAction:"pan-y pinch-zoom",
        ...NOTAP,
      }}
    >
      <AnimatePresence mode="popLayout" custom={dir}>
        {openMenu && (
          <motion.div
            key={openMenu}
            custom={dir}
            initial={{ x: dir!==0 ? `${dir*100}%` : 0, y: dir===0 ? "100%" : 0, opacity: dir!==0 ? 0.5 : 1 }}
            animate={{ x:0, y:0, opacity:1 }}
            exit={{ x: dir!==0 ? `${-dir*100}%` : 0, y: dir===0 ? "100%" : 0, opacity: dir!==0 ? 0.5 : 1 }}
            transition={{ type:"spring", stiffness:500, damping:40, mass:0.8 }}
            style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", overflow:"hidden" }}
          >
            <div style={{ flex:1, overflowY:"auto", padding:"16px 16px 24px", scrollbarWidth:"none" }}>
              {MENU_CONTENT[openMenu]}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   BottomBlock — unified glass card when menu is open
══════════════════════════════════════════════════════════════════════════════ */
interface BottomBlockProps {
  pet: NonNullable<ReturnType<typeof usePetStore.getState>["pet"]>;
  evo: number;
  activeTab: TabId | null;
  isCd: (a: string) => boolean;
  getCd: (a: string) => string | null;
  onTab: (t: TabId) => void;
  onClose: () => void;
  petRef: React.RefObject<HTMLDivElement | null>;
  onStroking: (v: boolean) => void;
  isStroking: boolean;
}

function BottomBlock({ pet, evo: _evo, activeTab, isCd, getCd, onTab, onClose, petRef, onStroking, isStroking }: BottomBlockProps) {
  const { openMenu } = useMenuStore();
  const menuIsOpen = openMenu !== null;
  const closedBottomPad = "clamp(24px,6.5vw,38px)";

  // Pill/glove get own GLASS style when menu is closed; become transparent when inside the card.
  const widgetStyle: CSSProps = menuIsOpen
    ? { background: "rgba(255,255,255,0.10)" }
    : { ...GLASS };

  return (
    <div style={{ position:"relative", zIndex:10, display:"flex", flexDirection:"column", width:"100%", ...NOTAP }}>

      {/* ── Full-width container that becomes the glass card when open ── */}
      <div style={{
        width:"100vw",
        marginLeft:"calc(-50vw + 50%)",
        display:"flex", flexDirection:"column", flexShrink:0,
        // Transparent (no pointer blocking) when closed, full card when open
        pointerEvents: menuIsOpen ? "auto" : "none",
        ...(menuIsOpen ? {
          ...GLASS,
          borderBottom: "none",
          borderRadius: `${HALF_H}px ${HALF_H}px 0 0`,
          overflow: "hidden",
        } : {}),
      }}>

        {/* ── Nav row ── */}
        <div style={{
          pointerEvents:"auto",
          padding: menuIsOpen ? `8px 16px 0` : `0 16px ${closedBottomPad}`,
          display:"flex", justifyContent:"center", alignItems:"flex-end",
          gap:GLOVE_GAP, flexShrink:0,
          transition:"padding 0.25s ease",
        }}>

          {/* Pill */}
          <div style={{
            ...widgetStyle,
            // Keep pill border only when closed; inside the card it's borderless
            ...(menuIsOpen ? {} : {}),
            borderRadius: `${HALF_H}px`,
            height: WIDGET_H,
            padding:`${NAV_PAD}px ${NAV_PAD+2}px`,
            display:"inline-flex", alignItems:"center",
            overflow:"visible",
            boxSizing:"border-box",
            transition:"background 0.25s, box-shadow 0.25s, border 0.25s",
          }}>
            <Carousel>
              <CarouselBtn icon={IC.food}  active={activeTab==="feed"}  disabled={isCd("feed")} cdLabel={fmtCd(getCd("feed"))} onClick={() => onTab("feed")}/>
              <CarouselBtn icon={IC.game}  active={activeTab==="play"}  disabled={isCd("play")} cdLabel={fmtCd(getCd("play"))} onClick={() => onTab("play")}/>
              <CarouselBtn icon={IC.shop}  active={activeTab==="shop"}  onClick={() => onTab("shop")}/>
              <CarouselBtn icon={IC.moon}  active={activeTab==="sleep"} onClick={() => onTab("sleep")}/>
              <CarouselBtn icon={IC.users} active={activeTab==="partner"} onClick={() => onTab("partner")}/>
              <CarouselBtn icon={IC.settings} active={activeTab==="settings"} onClick={() => onTab("settings")}/>
            </Carousel>
          </div>

          {/* Side button */}
          <div style={{
            width:GLOVE_SZ, height:GLOVE_SZ,
            borderRadius:`${GLOVE_SZ/2}px`,
            flexShrink:0,
            ...widgetStyle,
            position:"relative",
            overflow:"hidden",
            transition:"background 0.25s, box-shadow 0.25s, border 0.25s",
          }}>
            {/* Glove */}
            <div style={{
              position:"absolute", inset:0,
              opacity: menuIsOpen ? 0 : 1,
              pointerEvents: menuIsOpen ? "none" : "auto",
              transition:"opacity 0.15s",
            }}>
              <PettingGlove petRef={petRef} onStroking={onStroking} isStroking={isStroking}/>
            </div>
            {/* Chevron */}
            <div onClick={menuIsOpen ? onClose : undefined} style={{
              position:"absolute", inset:0,
              display:"flex", alignItems:"center", justifyContent:"center",
              cursor: menuIsOpen ? "pointer" : "default",
              opacity: menuIsOpen ? 1 : 0,
              pointerEvents: menuIsOpen ? "auto" : "none",
              transition:"opacity 0.15s",
              ...NOTAP,
            }}>
              <div style={{ width:26, height:26, color:"rgba(0,0,0,0.50)" }}>{IC.chevronDown}</div>
            </div>
          </div>
        </div>

        {/* ── Menu content (slides in below nav row, inside the same card) ── */}
        <AnimatePresence>
          {menuIsOpen && (
            <motion.div
              key="menu-slide"
              initial={{ height:0 }}
              animate={{ height:"50dvh" }}
              exit={{ height:0 }}
              transition={{ type:"spring", stiffness:480, damping:42, mass:0.75 }}
              style={{ overflow:"hidden", flexShrink:0 }}
            >
              <MenuPanel menuH="50dvh"/>
            </motion.div>
          )}
        </AnimatePresence>

        {!menuIsOpen && (
          <div style={{ pointerEvents:"auto", height:4, marginBottom:"clamp(5px,1.5vw,8px)" }}/>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   HomePage
══════════════════════════════════════════════════════════════════════════════ */
interface Props { petId: number }

export function HomePage({ petId }: Props) {
  const { pet, fetchPet, performAction, loading } = usePetStore();
  const { openMenu, setMenu, closeMenu } = useMenuStore();

  const [activeTab, setActiveTab] = useState<TabId | null>(null);
  const [floatText, setFloatText] = useState("");
  const [floatShow, setFloatShow] = useState(false);
  const [isStroking, setIsStroking] = useState(false);
  const [hearts, setHearts] = useState<HeartFx[]>([]);
  const nextHeart = useRef(0);

  const petZoneRef = useRef<HTMLDivElement>(null);
  const petDomRef  = useRef<HTMLDivElement>(null);

  const menuIsOpen = openMenu !== null;

  const refresh = useCallback(() => fetchPet(petId), [petId, fetchPet]);
  useEffect(() => { refresh(); }, [petId]);
  useEffect(() => { const id = setInterval(refresh, 60_000); return () => clearInterval(id); }, [refresh]);
  useEffect(() => {
    const h = () => { if (!document.hidden) refresh(); };
    document.addEventListener("visibilitychange", h); return () => document.removeEventListener("visibilitychange", h);
  }, [refresh]);

  // ── Sync carousel active highlight when menu category changes via swipe ──
  useEffect(() => {
    if (openMenu !== null && MENU_TABS.has(openMenu)) setActiveTab(openMenu as TabId);
    if (openMenu === null) setActiveTab(null);
  }, [openMenu]);

  const handleStroking = useCallback((v:boolean) => setIsStroking(v), []);
  const spawnHeart = useCallback((x:number, y:number) => {
    const id = nextHeart.current++;
    const angle = Math.random()*Math.PI*2; const dist = 40+Math.random()*30;
    setHearts(h => [...h.slice(-12), { id, x, y, angle, dist }]);
    setTimeout(() => setHearts(h => h.filter(hh => hh.id !== id)), 900);
  }, []);

  const derived = useMemo(() => {
    if (!pet) return null;
    const evo = Math.min(7, Math.floor(pet.level/2)+1);
    const needed = pet.level*100;
    const xpPct = Math.min(100, pet.experience/needed*100);
    const partner = pet.owners.find(o => !o.is_creator) ?? pet.owners[1];
    const pMins = partner?.last_active_at ? Math.floor((Date.now()-new Date(partner.last_active_at).getTime())/60_000) : null;
    const pOnline = pMins !== null && pMins < 5;
    const sleepVal = pet.mood==="sleepy" ? 100 : 55;
    return { evo, xpPct, partner, pMins, pOnline, sleepVal };
  }, [pet]);

  if (loading && !pet) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      height:"100dvh", background:"linear-gradient(135deg,#f0f4ff 0%,#fce4f0 50%,#e8f5f0 100%)" }}>
      <div style={{ width:36, height:36, color:"rgba(0,0,0,0.3)" }}>{IC.petIcon}</div>
      <div style={{ fontSize:13, color:"rgba(0,0,0,0.3)", marginTop:10 }}>Загрузка...</div>
    </div>
  );
  if (!pet || !derived) return null;

  const { evo, xpPct, partner, pMins, pOnline, sleepVal } = derived;
  const getCd = (a:string) => pet.cooldowns.find(c => c.action===a)?.available_at ?? null;
  const isCd  = (a:string) => cdActive(getCd(a));

  const showFloat = (t:string) => {
    setFloatText(t); setFloatShow(true);
    setTimeout(() => setFloatShow(false), 1400);
  };
  const doAction = async (action: ActionType, msg: string) => {
    if (isCd(action)) return; await performAction(action); showFloat(msg);
  };
  const handleInvite = async () => {
    try { const inv = await createInvite(pet.id); tg?.showAlert?.(`Ссылка:\n${inv.link}`); }
    catch { tg?.showAlert?.("Не удалось создать ссылку"); }
  };
  const handleClose = () => { closeMenu(); };

  const handleTab = (tab: TabId) => {
    if (MENU_TABS.has(tab)) {
      if (activeTab === tab) { handleClose(); return; }
      setActiveTab(tab);
      setMenu(tab as MenuCategory);
      if (tab === "feed") doAction("feed", "+30 🍎");
      if (tab === "play") doAction("play", "+25 🎾");
      return;
    }
    setActiveTab(tab); closeMenu();
    switch (tab) {
      case "pet":      doAction("pet", "+15 🤍"); break;
      case "partner":  handleInvite(); break;
      case "settings": tg?.showAlert?.(`${pet.name} · Ур.${pet.level}\nВозраст: ${pet.age_days} дн.\nЭволюция: ${evo}/7`); break;
    }
  };

  return (
    <div style={{
      maxWidth:480, margin:"0 auto", height:"100dvh", minHeight:560,
      background:"linear-gradient(150deg,#eef2ff 0%,#fce7f3 45%,#ecfdf5 100%)",
      fontFamily:"'Inter',system-ui,sans-serif",
      position:"relative", overflow:"hidden",
      display:"flex", flexDirection:"column",
      color:"rgba(0,0,0,0.75)", ...NOTAP,
    }}>
      {/* Blobs */}
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:0 }}>
        <div style={{ position:"absolute", top:"-12%", left:"-18%", width:"55%", paddingBottom:"55%", borderRadius:"50%", background:"radial-gradient(circle,rgba(196,181,253,0.22) 0%,transparent 70%)" }}/>
        <div style={{ position:"absolute", top:"15%", right:"-20%", width:"52%", paddingBottom:"52%", borderRadius:"50%", background:"radial-gradient(circle,rgba(251,207,232,0.22) 0%,transparent 70%)" }}/>
        <div style={{ position:"absolute", bottom:"8%", left:"8%", width:"46%", paddingBottom:"46%", borderRadius:"50%", background:"radial-gradient(circle,rgba(167,243,208,0.18) 0%,transparent 70%)" }}/>
      </div>

      {/* ══ PET ZONE ══ */}
      <div ref={petZoneRef} style={{ flex:1, display:"flex", flexDirection:"column", position:"relative", zIndex:5, overflow:"hidden", minHeight:0 }}>

        {/* ── Header ── */}
        <header style={{ padding:"clamp(12px,3.5vw,20px) clamp(12px,4vw,18px) 6px",
          zIndex:10, position:"relative", display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, ...G.heavy,
            borderRadius:999, height:PILL_H, padding:"0 12px 0 7px", flexShrink:0, ...NOTAP }}>
            <div style={{ width:RING_SIZE, height:RING_SIZE, borderRadius:"50%", flexShrink:0,
              background:"rgba(255,255,255,0.55)", display:"flex", alignItems:"center",
              justifyContent:"center", padding:6, color:"rgba(0,0,0,0.42)" }}>{IC.petIcon}</div>
            <div style={{ display:"flex", flexDirection:"column", minWidth:0 }}>
              <div style={{ fontSize:"clamp(11px,3vw,13px)", fontWeight:700, color:"rgba(0,0,0,0.70)",
                lineHeight:1.2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                maxWidth:"clamp(60px,18vw,110px)" }}>{pet.name}</div>
              <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:2 }}>
                <span style={{ fontSize:9, fontWeight:700, color:"rgba(0,0,0,0.28)", letterSpacing:"0.06em" }}>LV.{pet.level}</span>
                <div style={{ width:"clamp(24px,7vw,44px)", height:2.5, background:"rgba(0,0,0,0.08)", borderRadius:2, overflow:"hidden" }}>
                  <motion.div animate={{ width:`${xpPct}%` }} transition={{ duration:0.6 }}
                    style={{ height:"100%", background:"rgba(0,0,0,0.32)", borderRadius:2 }}/>
                </div>
              </div>
            </div>
            {pet.streak>0 && (
              <div style={{ display:"flex", alignItems:"center", gap:3,
                background:"rgba(255,255,255,0.40)", border:"1px solid rgba(255,255,255,0.60)",
                borderRadius:999, padding:"3px 8px", marginLeft:1 }}>
                <div style={{ width:11, height:11, color:"rgba(220,80,30,0.80)" }}>{IC.fire}</div>
                <span style={{ fontSize:11, fontWeight:800, color:"rgba(180,60,20,0.80)" }}>{pet.streak}</span>
              </div>
            )}
          </div>
          <div style={{ flex:1 }}/>
          <div style={{ ...G.heavy, borderRadius:999, height:PILL_H, padding:"0 10px",
            display:"flex", gap:4, alignItems:"center", flexShrink:0 }}>
            <StatusRing value={pet.hunger}    icon={IC.food}/>
            <StatusRing value={pet.happiness} icon={IC.game}/>
            <StatusRing value={sleepVal}      icon={IC.moon}/>
            <StatusRing value={pet.health}    icon={IC.wash}/>
          </div>
        </header>

        {/* ── Pet centered ── */}
        <div style={{ flex:1, display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center",
          position:"relative", overflow:"hidden" }}>
          <div style={{ position:"relative" }}>
            <FloatAnim show={floatShow} text={floatText}/>
            <DraggablePet constraintsRef={petZoneRef} isStroking={isStroking}
              onHeartAt={spawnHeart} petDomRef={petDomRef} disabled={menuIsOpen}>
              <div ref={petDomRef} style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
                <PetSVG mood={isStroking ? "happy" : pet.mood} petType={pet.pet_type} evolution={evo}
                  isReacting={floatShow||isStroking} size="clamp(120px,32vw,180px)"/>
                <div style={{ width:"clamp(44px,12vw,68px)", height:6,
                  background:"rgba(0,0,0,0.07)", filter:"blur(5px)",
                  borderRadius:"50%", marginTop:-2, pointerEvents:"none" }}/>
              </div>
            </DraggablePet>
          </div>

          {/* Partner badge */}
          <AnimatePresence>
            {!menuIsOpen && (
              <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                transition={{ duration:0.2 }}
                style={{ position:"absolute", bottom:10, left:0, right:0,
                  display:"flex", justifyContent:"center", zIndex:6, pointerEvents:"none" }}>
                <div style={{ pointerEvents:"auto" }}>
                  {partner ? (
                    <div style={{ display:"inline-flex", alignItems:"center", gap:6,
                      ...G.pill, borderRadius:999, padding:"5px 14px", ...NOTAP }}>
                      <div style={{ width:6, height:6, flexShrink:0,
                        color: pOnline ? "#22c55e" : "rgba(0,0,0,0.20)",
                        filter: pOnline ? "drop-shadow(0 0 4px #22c55e)" : "none" }}>{IC.dot}</div>
                      <span style={{ fontSize:"clamp(10px,2.8vw,12px)", color:"rgba(0,0,0,0.42)", fontWeight:500 }}>
                        {pMins===null ? "Партнёр не заходил" : pMins<5 ? "Партнёр онлайн" : pMins<60 ? `Партнёр ${pMins} мин назад` : `Партнёр ${Math.floor(pMins/60)} ч назад`}
                      </span>
                    </div>
                  ) : (
                    <motion.button whileTap={{ scale:0.96 }} onClick={handleInvite}
                      style={{ display:"inline-flex", alignItems:"center", gap:6, ...G.pill,
                        border:"1px dashed rgba(0,0,0,0.13)", borderRadius:999, padding:"6px 16px",
                        cursor:"pointer", fontFamily:"inherit", fontSize:"clamp(11px,3vw,12px)",
                        color:"rgba(0,0,0,0.42)", fontWeight:600, outline:"none", ...NOTAP }}>
                      <div style={{ width:13, height:13, color:"rgba(0,0,0,0.32)" }}>{IC.users}</div>
                      Пригласить партнёра
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ══ Bottom block ══ */}
      <BottomBlock
        pet={pet} evo={evo}
        activeTab={activeTab} isCd={isCd} getCd={getCd}
        onTab={handleTab} onClose={handleClose}
        petRef={petDomRef} onStroking={handleStroking} isStroking={isStroking}
      />

      {/* Home indicator */}
      <div style={{ position:"absolute", bottom:"clamp(5px,1.5vw,8px)", left:"50%", transform:"translateX(-50%)",
        width:100, height:4, background:"rgba(0,0,0,0.10)", borderRadius:4, zIndex:20, pointerEvents:"none" }}/>

      {/* Hearts */}
      {hearts.map(h => (
        <motion.div key={h.id}
          initial={{ opacity:1, scale:0.5, x:h.x-9, y:h.y-9 }}
          animate={{ opacity:0, scale:1.1, x:h.x-9+Math.cos(h.angle)*h.dist, y:h.y-9+Math.sin(h.angle)*h.dist }}
          transition={{ duration:0.8, ease:"easeOut" }}
          style={{ position:"fixed", top:0, left:0, fontSize:18, pointerEvents:"none",
            zIndex:1000, color:"#f9a8d4", filter:"drop-shadow(0 1px 4px rgba(249,168,212,0.5))" }}
        >🩷</motion.div>
      ))}
    </div>
  );
}