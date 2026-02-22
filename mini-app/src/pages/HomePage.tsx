// mini-app/src/pages/HomePage.tsx
import { useEffect, useCallback, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence, useDragControls, useMotionValue, useSpring } from "framer-motion";
import { usePetStore } from "../store/usePetStore";
import { useMenuStore, MENU_ORDER, type MenuCategory } from "../store/useMenuStore";
import { PetSVG } from "../components/PetSVG";
import { CategoryMenu } from "../components/CategoryMenu";
import { createInvite } from "../api/pets";
import type { ActionType } from "../api/types";

const tg = window.Telegram?.WebApp;
type CSSProps = React.CSSProperties;

/* ── Design tokens ─────────────────────────────────────────────────────────── */
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
  carousel: {
    background:"rgba(255,255,255,0.60)", backdropFilter:"blur(32px) saturate(180%)",
    WebkitBackdropFilter:"blur(32px) saturate(180%)", border:"1px solid rgba(255,255,255,0.72)",
    boxShadow:"0 8px 32px rgba(100,100,140,0.13), 0 2px 8px rgba(100,100,140,0.08), inset 0 1.5px 0 rgba(255,255,255,0.95)",
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

const NAV_PAD   = 8;
const BTN_W     = 50;
const BTN_GAP   = 5;
// ✅ FIX 1+2: Visible = 3 buttons, viewport sized to exactly 3
const VISIBLE   = 3;
const VIEWPORT_W = VISIBLE * BTN_W + (VISIBLE - 1) * BTN_GAP;
const WIDGET_H  = NAV_PAD * 2 + BTN_W;
const PILL_H    = 50;
const RING_SIZE = 34;
const GLOVE_SZ  = WIDGET_H;
const GLOVE_FLY = 52;
const GLOVE_GAP = 10;
const SHADOW_BLEED = 12;

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

/* ── Carousel (scroll strip) ───────────────────────────────────────────────── */
function Carousel({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const down = useRef(false); const sx = useRef(0); const sl = useRef(0);
  return (
    <div style={{ width:VIEWPORT_W, overflow:"visible", position:"relative" }}>
      <div ref={ref}
        onMouseDown={e => { down.current=true; sx.current=e.pageX-ref.current!.offsetLeft; sl.current=ref.current!.scrollLeft; ref.current!.style.cursor="grabbing"; }}
        onMouseUp={() => { down.current=false; if(ref.current) ref.current.style.cursor="grab"; }}
        onMouseLeave={() => { down.current=false; if(ref.current) ref.current.style.cursor="grab"; }}
        onMouseMove={e => { if(!down.current) return; ref.current!.scrollLeft=sl.current-(e.pageX-ref.current!.offsetLeft-sx.current)*1.2; }}
        style={{
          display:"flex", gap:BTN_GAP,
          marginLeft:-SHADOW_BLEED, marginRight:-SHADOW_BLEED,
          paddingLeft:SHADOW_BLEED, paddingRight:SHADOW_BLEED,
          paddingTop:SHADOW_BLEED, paddingBottom:SHADOW_BLEED,
          marginTop:-SHADOW_BLEED, marginBottom:-SHADOW_BLEED,
          overflowX:"auto", scrollbarWidth:"none",
          WebkitOverflowScrolling:"touch", cursor:"grab", userSelect:"none",
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
    <div style={{
      flexShrink:0, width:BTN_W, height:BTN_W,
      filter: active
        ? "drop-shadow(0 4px 6px rgba(100,100,150,0.22)) drop-shadow(0 1px 3px rgba(100,100,150,0.12))"
        : "drop-shadow(0 2px 4px rgba(100,100,150,0.10))",
      transition:"filter 0.15s",
    }}>
      <motion.button whileTap={disabled ? {} : { scale:0.84 }} onClick={disabled ? undefined : onClick}
        style={{
          width:"100%", height:"100%", borderRadius:"50%",
          background: active ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.30)",
          backdropFilter: active ? "blur(16px)" : undefined,
          WebkitBackdropFilter: active ? "blur(16px)" : undefined,
          border: active ? "1.5px solid rgba(255,255,255,0.95)" : "1px solid rgba(255,255,255,0.50)",
          boxShadow:"none", cursor: disabled ? "not-allowed" : "pointer",
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
          gap:2, transition:"background 0.15s, border 0.15s", fontFamily:"inherit", padding:0,
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
    const el = petDomRef.current;
    if (!el) return { x:0, y:0 };
    const r = el.getBoundingClientRect();
    return { x:r.left+r.width/2, y:r.top+r.height/2 };
  }, [petDomRef]);

  useEffect(() => {
    if (isStroking && !disabled) {
      if (!tickRef.current) {
        tickRef.current = setInterval(() => {
          const c = getPetCenter();
          const angle = Math.random()*Math.PI*2;
          onHeartAt(c.x+Math.cos(angle)*50, c.y+Math.sin(angle)*50);
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
      style={{ cursor: disabled ? "default" : "grab", touchAction:"none", display:"inline-block", x:dragX, y:dragY }}
      onPointerDown={e => { if (!disabled) controls.start(e); }}
    >
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
        {children}
      </div>
    </motion.div>
  );
}

/* ── PettingGlove ──────────────────────────────────────────────────────────── */
/* ✅ FIX 4: Rewritten glove to use a persistent overlay approach.
   The overlay is always mounted (but invisible/non-interactive when not dragging)
   so there's no render-gap where pointer events get lost. */
function PettingGlove({ petRef, onStroking, isStroking }: {
  petRef: React.RefObject<HTMLDivElement|null>;
  onStroking: (v:boolean) => void;
  isStroking: boolean;
}) {
  const circleRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const draggingRef = useRef(false);
  const history = useRef<Array<{x:number;y:number;t:number}>>([]);
  const rawX = useMotionValue(-9999);
  const rawY = useMotionValue(-9999);
  const gX = useSpring(rawX, { stiffness:600, damping:30, mass:0.3 });
  const gY = useSpring(rawY, { stiffness:600, damping:30, mass:0.3 });
  const half = GLOVE_FLY / 2;

  // Persistent overlay ref — always in DOM
  const overlayRef = useRef<HTMLDivElement>(null);

  const isOverPet = useCallback((cx:number, cy:number) => {
    const el = petRef.current; if (!el) return false;
    const r = el.getBoundingClientRect(); const pad = 24;
    return cx>=r.left-pad && cx<=r.right+pad && cy>=r.top-pad && cy<=r.bottom+pad;
  }, [petRef]);

  const isMoving = useCallback(() => {
    const h = history.current; const now = Date.now();
    while (h.length>0 && now-h[0].t>200) h.shift();
    if (h.length<2) return false;
    let dist=0;
    for (let i=1;i<h.length;i++) dist+=Math.abs(h[i].x-h[i-1].x)+Math.abs(h[i].y-h[i-1].y);
    return dist>6;
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    draggingRef.current = true;
    history.current = [{x:e.clientX,y:e.clientY,t:Date.now()}];

    const el = circleRef.current;
    const sx = el ? el.getBoundingClientRect().left + el.getBoundingClientRect().width/2 - half : e.clientX - half;
    const sy = el ? el.getBoundingClientRect().top + el.getBoundingClientRect().height/2 - half : e.clientY - half;
    rawX.jump(sx); rawY.jump(sy); gX.jump(sx); gY.jump(sy);

    setIsDragging(true);
    onStroking(false);

    // Capture pointer on the overlay so all subsequent events go there
    if (overlayRef.current) {
      try { overlayRef.current.setPointerCapture(e.pointerId); } catch {}
    }
  }, [onStroking, rawX, rawY, gX, gY, half]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    e.preventDefault();
    const cx = e.clientX, cy = e.clientY;
    rawX.set(cx - half); rawY.set(cy - half);
    history.current.push({x:cx, y:cy, t:Date.now()});
    onStroking(isOverPet(cx, cy) && isMoving());
  }, [isOverPet, isMoving, onStroking, rawX, rawY, half]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    history.current = [];
    setIsDragging(false);
    onStroking(false);
    if (overlayRef.current) {
      try { overlayRef.current.releasePointerCapture(e.pointerId); } catch {}
    }
  }, [onStroking]);

  const gloveAnim = isStroking
    ? { rotate:[-15,15,-15], transition:{repeat:Infinity,duration:0.25,ease:"easeInOut" as const} }
    : { rotate:0 };

  return (
    <>
      {/* The visible button */}
      <div ref={circleRef}
        onPointerDown={handlePointerDown}
        style={{
          width:GLOVE_SZ, height:GLOVE_SZ, borderRadius:"50%", flexShrink:0,
          ...G.carousel,
          display:"flex", alignItems:"center", justifyContent:"center",
          cursor: isDragging ? "grabbing" : "grab",
          userSelect:"none", touchAction:"none",
        }}
      >
        <img src="/sprites/glove.svg" draggable={false}
          style={{ width:36, height:36, objectFit:"contain", pointerEvents:"none",
            opacity: isDragging ? 0.25 : 1, transition:"opacity 0.15s" }}/>
      </div>

      {/* Persistent overlay — always in DOM, pointer-events toggled */}
      <div
        ref={overlayRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position:"fixed", inset:0, zIndex:999,
          cursor: isDragging ? "grabbing" : "default",
          touchAction:"none",
          // Only intercept events when dragging
          pointerEvents: isDragging ? "auto" : "none",
          // Invisible
          background:"transparent",
        }}
      >
        {isDragging && (
          <motion.div animate={gloveAnim}
            style={{
              position:"fixed", top:0, left:0, width:GLOVE_FLY, height:GLOVE_FLY,
              x:gX, y:gY, pointerEvents:"none", transformOrigin:"center center", overflow:"visible",
            }}>
            <img src="/sprites/glove.svg" draggable={false}
              style={{
                width:"200%", height:"200%", objectFit:"contain", position:"absolute",
                top:"-50%", left:"-50%",
                filter: isStroking
                  ? "drop-shadow(0 4px 16px rgba(249,168,212,0.6))"
                  : "drop-shadow(0 4px 12px rgba(0,0,0,0.14))",
                transition:"filter 0.2s",
              }}/>
          </motion.div>
        )}
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   BottomBlock — carousel row + menu, animated as ONE unit
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

function BottomBlock({ pet, evo, activeTab, isCd, getCd, onTab, onClose, petRef, onStroking, isStroking }: BottomBlockProps) {
  const { openMenu } = useMenuStore();
  const menuIsOpen = openMenu !== null;

  const menuContentH = `calc(50dvh - ${WIDGET_H}px - env(safe-area-inset-bottom, 0px))`;
  const closedBottomPad = "clamp(24px,6.5vw,38px)";

  /* ✅ FIX 3: Unified container style for pill+glove — they share one visual
     background so there's no visible line between them. We wrap both in a
     single styled row with the carousel glass background. */

  return (
    <motion.div
      initial={false}
      animate={{ y: 0 }}
      style={{
        position:"relative", zIndex:10,
        display:"flex", flexDirection:"column",
        width:"100%",
      }}
    >
      {/* ── NAV ROW — pill + glove as one seamless unit ─────────────────── */}
      <div style={{
        padding: menuIsOpen
          ? `8px 16px 0`
          : `0 16px ${closedBottomPad}`,
        display:"flex", justifyContent:"center", alignItems:"center",
        gap:0, /* ✅ no gap — they sit flush */
        flexShrink:0,
      }}>
        {/* Unified glass container wrapping both pill and glove */}
        <div style={{
          ...G.carousel,
          borderRadius: menuIsOpen ? `999px 999px 0 0` : 999,
          borderBottom: menuIsOpen ? "none" : undefined,
          height: WIDGET_H,
          padding:`${NAV_PAD}px ${NAV_PAD+2}px`,
          display:"inline-flex", alignItems:"center",
          gap: GLOVE_GAP,
          overflow:"visible",
          transition:"border-radius 0.25s ease",
          boxSizing:"border-box",
        }}>
          <Carousel>
            <CarouselBtn icon={IC.food}  active={activeTab==="feed"}  disabled={isCd("feed")} cdLabel={fmtCd(getCd("feed"))} onClick={() => onTab("feed")}/>
            <CarouselBtn icon={IC.game}  active={activeTab==="play"}  disabled={isCd("play")} cdLabel={fmtCd(getCd("play"))} onClick={() => onTab("play")}/>
            <CarouselBtn icon={IC.shop}  active={activeTab==="shop"}  onClick={() => onTab("shop")}/>
            <CarouselBtn icon={IC.moon}  active={activeTab==="sleep"} onClick={() => onTab("sleep")}/>
            <CarouselBtn icon={IC.users} active={activeTab==="partner"} onClick={() => onTab("partner")}/>
            <CarouselBtn icon={IC.settings} active={activeTab==="settings"} onClick={() => onTab("settings")}/>
          </Carousel>

          {/* ✅ Separator line between carousel and glove — REMOVED.
              Glove/close button is now inside the same container. */}

          {/* Glove ↔ Down arrow */}
          <AnimatePresence mode="wait">
            {menuIsOpen ? (
              <motion.div key="close"
                initial={{ scale:0.7, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.7, opacity:0 }}
                transition={{ duration:0.15 }}
                onClick={onClose}
                style={{
                  width:BTN_W, height:BTN_W, borderRadius:"50%", flexShrink:0,
                  background:"rgba(255,255,255,0.45)",
                  border:"1px solid rgba(255,255,255,0.65)",
                  display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer",
                }}
              >
                <div style={{ width:22, height:22, color:"rgba(0,0,0,0.45)" }}>{IC.chevronDown}</div>
              </motion.div>
            ) : (
              <motion.div key="glove"
                initial={{ scale:0.7, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.7, opacity:0 }}
                transition={{ duration:0.15 }}>
                <PettingGlove petRef={petRef} onStroking={onStroking} isStroking={isStroking}/>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── MENU PANEL ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {menuIsOpen && (
          <motion.div
            key="menu-wrapper"
            initial={{ height: 0 }}
            animate={{ height: menuContentH }}
            exit={{ height: 0 }}
            transition={{ type:"spring", stiffness:380, damping:38, mass:0.85 }}
            style={{
              overflow:"hidden",
              width:"100vw",
              marginLeft:"calc(-50vw + 50%)",
              background:"rgba(255,255,255,0.60)",
              backdropFilter:"blur(32px) saturate(180%)",
              WebkitBackdropFilter:"blur(32px) saturate(180%)",
              borderTop:"1px solid rgba(255,255,255,0.72)",
              flexShrink:0,
            }}
          >
            <CategoryMenu screenW={0}/>
          </motion.div>
        )}
      </AnimatePresence>

      {!menuIsOpen && (
        <div style={{ height:4, marginBottom:"clamp(5px,1.5vw,8px)" }}/>
      )}
    </motion.div>
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
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  }, [refresh]);

  const handleStroking = useCallback((v:boolean) => setIsStroking(v), []);
  const spawnHeart = useCallback((x:number, y:number) => {
    const id = nextHeart.current++;
    const angle = Math.random()*Math.PI*2;
    const dist = 40+Math.random()*30;
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
    if (isCd(action)) return;
    await performAction(action); showFloat(msg);
  };

  const handleInvite = async () => {
    try { const inv = await createInvite(pet.id); tg?.showAlert?.(`Ссылка:\n${inv.link}`); }
    catch { tg?.showAlert?.("Не удалось создать ссылку"); }
  };

  const handleClose = () => { closeMenu(); setActiveTab(null); };

  const handleTab = (tab: TabId) => {
    if (MENU_TABS.has(tab)) {
      if (activeTab === tab) { handleClose(); return; }
      setActiveTab(tab);
      setMenu(tab as MenuCategory);
      if (tab === "feed") doAction("feed", "+30 🍎");
      if (tab === "play") doAction("play", "+25 🎾");
      return;
    }
    setActiveTab(tab);
    closeMenu();
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
      color:"rgba(0,0,0,0.75)",
    }}>
      {/* Blobs */}
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:0 }}>
        <div style={{ position:"absolute", top:"-12%", left:"-18%", width:"55%", paddingBottom:"55%", borderRadius:"50%", background:"radial-gradient(circle,rgba(196,181,253,0.22) 0%,transparent 70%)" }}/>
        <div style={{ position:"absolute", top:"15%", right:"-20%", width:"52%", paddingBottom:"52%", borderRadius:"50%", background:"radial-gradient(circle,rgba(251,207,232,0.22) 0%,transparent 70%)" }}/>
        <div style={{ position:"absolute", bottom:"8%", left:"8%", width:"46%", paddingBottom:"46%", borderRadius:"50%", background:"radial-gradient(circle,rgba(167,243,208,0.18) 0%,transparent 70%)" }}/>
      </div>

      {/* ══ PET ZONE ══════════════════════════════════════════════════════ */}
      <div ref={petZoneRef} style={{
        flex:1, display:"flex", flexDirection:"column",
        position:"relative", zIndex:5, overflow:"hidden",
        minHeight:0,
        maxHeight: menuIsOpen ? "50dvh" : undefined,
        transition:"max-height 0.35s cubic-bezier(0.32,0,0.67,0)",
      }}>
        {/* ── HEADER ── */}
        <header style={{ padding:"clamp(12px,3.5vw,20px) clamp(12px,4vw,18px) 6px",
          zIndex:10, position:"relative", display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, ...G.heavy,
            borderRadius:999, height:PILL_H, padding:"0 12px 0 7px", flexShrink:0 }}>
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
            <StatusRing value={pet.hunger} icon={IC.food}/>
            <StatusRing value={pet.happiness} icon={IC.game}/>
            <StatusRing value={sleepVal} icon={IC.moon}/>
            <StatusRing value={pet.health} icon={IC.wash}/>
          </div>
        </header>

        {/* ── PET CENTERED ── */}
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
                      ...G.pill, borderRadius:999, padding:"5px 14px" }}>
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
                        color:"rgba(0,0,0,0.42)", fontWeight:600 }}>
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

      {/* ══ BOTTOM BLOCK ════════════════════════════════════════════════════ */}
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