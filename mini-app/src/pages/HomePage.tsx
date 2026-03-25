// mini-app/src/pages/HomePage.tsx
// Perf rewrite: CSS animations everywhere, framer-motion only for drag
import { useEffect, useCallback, useState, useRef, useMemo } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { usePetStore } from "../store/usePetStore";
import { useMenuStore, MENU_ORDER, type MenuCategory } from "../store/useMenuStore";
import { useCoinStore } from "../store/useCoinStore";
import { PetSVG } from "../components/PetSVG";
import { BottomBlock, cdActive } from "../components/BottomBlock";
import { IC } from "../components/icons";
import { NOTAP, type TabId } from "../components/NavCarousel";
import type { ActionType } from "../api/types";

type CSSProps = React.CSSProperties;

const G = {
  heavy: {
    background: "rgba(255,255,255,0.55)",
    backdropFilter: "blur(24px) saturate(160%)",
    WebkitBackdropFilter: "blur(24px) saturate(160%)",
    border: "1px solid rgba(255,255,255,0.70)",
    boxShadow: "0 4px 20px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
  } as CSSProps,
  pill: {
    background: "rgba(255,255,255,0.38)",
    border: "1px solid rgba(255,255,255,0.55)",
    boxShadow: "0 2px 10px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.7)",
  } as CSSProps,
};

const PILL_H = 50, RING_SIZE = 34;
const MENU_TABS = new Set<string>(MENU_ORDER);
const SPRING_SMOOTH = { stiffness: 200, damping: 26, mass: 0.8 };

function toDeg(v: number) { return Math.round(Math.max(0, Math.min(100, v)) / 100 * 360); }

function StatusRing({ value, icon }: { value: number; icon: React.ReactNode }) {
  const deg = toDeg(value); const low = value < 25; const R = 13;
  const circ = 2 * Math.PI * R; const dash = deg / 360 * circ;
  const col = low ? "rgba(220,60,60,0.80)" : "rgba(80,80,100,0.50)";
  return (
    <div style={{ position: "relative", width: RING_SIZE, height: RING_SIZE, flexShrink: 0 }}>
      <svg width={RING_SIZE} height={RING_SIZE} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
        <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={R} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={2} />
        <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={R} fill="none" stroke={col} strokeWidth={2}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.5s ease" }} />
      </svg>
      <div style={{
        position: "absolute", inset: 5, borderRadius: "50%", background: "rgba(255,255,255,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 5,
        color: low ? "rgba(200,50,50,0.85)" : "rgba(60,60,80,0.55)",
      }}>{icon}</div>
    </div>
  );
}

// Pure CSS float animation — no framer-motion
function FloatAnim({ show, text }: { show: boolean; text: string }) {
  if (!show) return null;
  return (
    <div
      key={text + Date.now()}
      style={{
        position: "absolute", top: 0, left: "50%",
        fontSize: 20, fontWeight: 800, color: "rgba(0,0,0,0.60)",
        textShadow: "0 2px 8px rgba(255,255,255,0.6)", pointerEvents: "none",
        whiteSpace: "nowrap", zIndex: 20,
        animation: "float-up 0.8s ease-out forwards",
      }}
    >{text}</div>
  );
}

interface HeartFx { id: number; x: number; y: number; angle: number; dist: number }

/* ═══════════════════════════════════
   DraggablePet — framer-motion only for drag
   ═══════════════════════════════════ */
function DraggablePet({ children, constraintsRef, isStroking, onHeartAt, petDomRef, anchored, headerRef, navRowRef, containerRef }: {
  children: React.ReactNode;
  constraintsRef: React.RefObject<HTMLElement | null>;
  isStroking: boolean;
  onHeartAt: (x: number, y: number) => void;
  petDomRef: React.RefObject<HTMLDivElement | null>;
  anchored: boolean;
  headerRef: React.RefObject<HTMLElement | null>;
  navRowRef: React.RefObject<HTMLDivElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, SPRING_SMOOTH);
  const springY = useSpring(y, SPRING_SMOOTH);

  const calcAnchorOffset = useCallback(() => {
    const el = petDomRef.current;
    const header = headerRef.current;
    const nav = navRowRef.current;
    const cont = containerRef.current;
    if (!el || !header || !nav || !cont) return null;
    const contR = cont.getBoundingClientRect();
    const headerR = header.getBoundingClientRect();
    const navR = nav.getBoundingClientRect();
    const elR = el.getBoundingClientRect();
    const anchorX = contR.left + contR.width / 2;
    const anchorY = headerR.bottom + (navR.top - headerR.bottom) / 2;
    const curX = x.get(); const curY = y.get();
    const naturalCX = elR.left + elR.width / 2 - curX;
    const naturalCY = elR.top + elR.height / 2 - curY;
    return { x: anchorX - naturalCX, y: anchorY - naturalCY };
  }, [petDomRef, headerRef, navRowRef, containerRef, x, y]);

  useEffect(() => {
    if (anchored) {
      const timer = setTimeout(() => {
        const off = calcAnchorOffset();
        if (off) { x.set(off.x); y.set(off.y); }
      }, 40);
      return () => clearTimeout(timer);
    } else {
      x.set(0); y.set(0);
    }
  }, [anchored, calcAnchorOffset, x, y]);

  // Hearts via RAF
  const getPetCenter = useCallback(() => {
    const el = petDomRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, [petDomRef]);

  useEffect(() => {
    if (isStroking && !anchored) {
      let last = 0; let raf = 0;
      const tick = (now: number) => {
        if (now - last > 180) {
          last = now;
          const c = getPetCenter();
          const a = Math.random() * Math.PI * 2;
          onHeartAt(c.x + Math.cos(a) * 50, c.y + Math.sin(a) * 50);
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }
  }, [isStroking, anchored, getPetCenter, onHeartAt]);

  return (
    <motion.div
      drag={!anchored}
      dragConstraints={constraintsRef}
      dragElastic={0.08}
      dragMomentum={false}
      style={{
        cursor: anchored ? "default" : "grab",
        touchAction: "none",
        display: "inline-block",
        x: springX, y: springY,
        willChange: "transform",
        ...NOTAP,
      }}
    >
      {children}
    </motion.div>
  );
}

/* ════════════════════════════════════════════
   HomePage
   ════════════════════════════════════════════ */
interface Props { petId: number }

export function HomePage({ petId }: Props) {
  const { pet, fetchPet, performAction, loading } = usePetStore();
  const { openMenu, setMenu, closeMenu } = useMenuStore();
  const coins = useCoinStore(s => s.coins);

  const [activeTab, setActiveTab] = useState<TabId | null>(null);
  const [floatText, setFloatText] = useState("");
  const [floatShow, setFloatShow] = useState(false);
  const [isStroking, setIsStroking] = useState(false);
  const [hearts, setHearts] = useState<HeartFx[]>([]);
  const nextHeart = useRef(0);

  const petZoneRef = useRef<HTMLDivElement>(null);
  const petDomRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const navRowRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const menuIsOpen = openMenu !== null;

  const refresh = useCallback(() => fetchPet(petId), [petId, fetchPet]);
  useEffect(() => { refresh(); }, [petId]);
  useEffect(() => { const id = setInterval(refresh, 60_000); return () => clearInterval(id); }, [refresh]);
  useEffect(() => {
    const h = () => { if (!document.hidden) refresh(); };
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  }, [refresh]);

  useEffect(() => {
    if (openMenu !== null && MENU_TABS.has(openMenu)) setActiveTab(openMenu as TabId);
    if (openMenu === null) setActiveTab(null);
  }, [openMenu]);

  const handleStroking = useCallback((v: boolean) => setIsStroking(v), []);
  const spawnHeart = useCallback((hx: number, hy: number) => {
    const id = nextHeart.current++;
    const angle = Math.random() * Math.PI * 2;
    const dist = 35 + Math.random() * 25;
    setHearts(h => [...(h.length > 6 ? h.slice(-5) : h), { id, x: hx, y: hy, angle, dist }]);
    setTimeout(() => setHearts(h => h.filter(hh => hh.id !== id)), 800);
  }, []);

  const derived = useMemo(() => {
    if (!pet) return null;
    const evo = Math.min(7, Math.floor(pet.level / 2) + 1);
    const needed = pet.level * 100;
    const xpPct = Math.min(100, pet.experience / needed * 100);
    const partner = pet.owners.find(o => !o.is_creator) ?? pet.owners[1];
    const pMins = partner?.last_active_at
      ? Math.floor((Date.now() - new Date(partner.last_active_at).getTime()) / 60_000)
      : null;
    const pOnline = pMins !== null && pMins < 5;
    const sleepVal = pet.mood === "sleepy" ? 100 : 55;
    return { evo, xpPct, partner, pMins, pOnline, sleepVal };
  }, [pet]);

  if (loading && !pet) return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      height: "100dvh", background: "linear-gradient(135deg,#f0f4ff 0%,#fce4f0 50%,#e8f5f0 100%)",
    }}>
      <div style={{ width: 36, height: 36, color: "rgba(0,0,0,0.3)" }}>{IC.petIcon}</div>
      <div style={{ fontSize: 13, color: "rgba(0,0,0,0.3)", marginTop: 10 }}>Загрузка...</div>
    </div>
  );
  if (!pet || !derived) return null;

  const { evo, xpPct, partner, pMins, pOnline, sleepVal } = derived;
  const getCd = (a: string) => pet.cooldowns.find(c => c.action === a)?.available_at ?? null;
  const isCd = (a: string) => cdActive(getCd(a));

  const showFloat = (t: string) => {
    setFloatText(t); setFloatShow(true);
    setTimeout(() => setFloatShow(false), 1000);
  };
  const doAction = async (action: ActionType, msg: string) => {
    if (isCd(action)) return;
    await performAction(action);
    showFloat(msg);
  };
  const handleClose = () => closeMenu();
  const handleTab = (tab: TabId) => {
    if (MENU_TABS.has(tab)) {
      if (activeTab === tab && menuIsOpen) { handleClose(); return; }
      setActiveTab(tab);
      setMenu(tab as MenuCategory);
      return;
    }
    setActiveTab(tab); closeMenu();
  };

  return (
    <div
      ref={containerRef}
      style={{
        maxWidth: 480, margin: "0 auto", height: "100dvh", minHeight: 560,
        background: "linear-gradient(150deg,#eef2ff 0%,#fce7f3 45%,#ecfdf5 100%)",
        fontFamily: "'Inter',system-ui,sans-serif",
        position: "relative", overflow: "hidden",
        display: "flex", flexDirection: "column",
        color: "rgba(0,0,0,0.75)", ...NOTAP,
      }}
    >
      {/* Blobs — static, no animation needed */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-12%", left: "-18%", width: "55%", paddingBottom: "55%", borderRadius: "50%", background: "radial-gradient(circle,rgba(196,181,253,0.22) 0%,transparent 70%)" }} />
        <div style={{ position: "absolute", top: "15%", right: "-20%", width: "52%", paddingBottom: "52%", borderRadius: "50%", background: "radial-gradient(circle,rgba(251,207,232,0.22) 0%,transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "8%", left: "8%", width: "46%", paddingBottom: "46%", borderRadius: "50%", background: "radial-gradient(circle,rgba(167,243,208,0.18) 0%,transparent 70%)" }} />
      </div>

      {/* Pet zone */}
      <div ref={petZoneRef} style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", zIndex: 5, overflow: "hidden", minHeight: 0 }}>

        {/* Header — single backdrop-filter layer */}
        <header
          ref={headerRef}
          style={{
            padding: "clamp(12px,3.5vw,20px) clamp(12px,4vw,18px) 6px",
            zIndex: 10, position: "relative",
            display: "flex", alignItems: "flex-start", gap: 8, flexShrink: 0,
          }}
        >
          <div style={{
            display: "flex", alignItems: "center", gap: 7,
            ...G.heavy, borderRadius: 999, height: PILL_H, padding: "0 12px 0 7px",
            flexShrink: 0, ...NOTAP,
          }}>
            <div style={{
              width: RING_SIZE, height: RING_SIZE, borderRadius: "50%", flexShrink: 0,
              background: "rgba(255,255,255,0.55)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 6, color: "rgba(0,0,0,0.42)",
            }}>{IC.petIcon}</div>
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <div style={{
                fontSize: "clamp(11px,3vw,13px)", fontWeight: 700, color: "rgba(0,0,0,0.70)",
                lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                maxWidth: "clamp(60px,18vw,110px)",
              }}>{pet.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(0,0,0,0.28)", letterSpacing: "0.06em" }}>LV.{pet.level}</span>
                <div style={{ width: "clamp(24px,7vw,44px)", height: 2.5, background: "rgba(0,0,0,0.08)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "rgba(0,0,0,0.32)", borderRadius: 2, width: `${xpPct}%`, transition: "width 0.5s ease" }} />
                </div>
              </div>
            </div>
            {pet.streak > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: 3,
                background: "rgba(255,255,255,0.40)", border: "1px solid rgba(255,255,255,0.60)",
                borderRadius: 999, padding: "3px 8px", marginLeft: 1,
              }}>
                <div style={{ width: 11, height: 11, color: "rgba(220,80,30,0.80)" }}>{IC.fire}</div>
                <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(180,60,20,0.80)" }}>{pet.streak}</span>
              </div>
            )}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0, gap: 4,
          }}>
            <div style={{
              ...G.heavy, borderRadius: 999, height: PILL_H, padding: "0 10px",
              display: "flex", gap: 4, alignItems: "center",
            }}>
              <StatusRing value={pet.hunger} icon={IC.food} />
              <StatusRing value={pet.happiness} icon={IC.game} />
              <StatusRing value={sleepVal} icon={IC.moon} />
              <StatusRing value={pet.health} icon={IC.wash} />
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 3,
              background: "rgba(255,255,255,0.55)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.70)",
              boxShadow: "0 2px 10px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.9)",
              borderRadius: 999,
              padding: "4px 10px",
              minWidth: 52,
              justifyContent: "center",
            }}>
              <span style={{ fontSize: 11, lineHeight: 1 }}>🪙</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: "rgba(180,140,20,0.85)" }}>{coins}</span>
            </div>
          </div>
        </header>

        {/* Pet centered */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "relative" }}>
            <FloatAnim show={floatShow} text={floatText} />
            <DraggablePet
              constraintsRef={petZoneRef} isStroking={isStroking}
              onHeartAt={spawnHeart} petDomRef={petDomRef}
              anchored={menuIsOpen} headerRef={headerRef}
              navRowRef={navRowRef} containerRef={containerRef}
            >
              <div ref={petDomRef} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <PetSVG
                  mood={isStroking ? "happy" : pet.mood} petType={pet.pet_type}
                  evolution={evo} isReacting={floatShow || isStroking}
                  size="clamp(120px,32vw,180px)"
                />
                <div style={{
                  width: "clamp(44px,12vw,68px)", height: 6,
                  background: "rgba(0,0,0,0.07)", filter: "blur(5px)",
                  borderRadius: "50%", marginTop: -2, pointerEvents: "none",
                }} />
              </div>
            </DraggablePet>
          </div>

          {/* Partner badge — no AnimatePresence, CSS opacity */}
          <div style={{
            position: "absolute", bottom: 10, left: 0, right: 0,
            display: "flex", justifyContent: "center", zIndex: 6, pointerEvents: "none",
            opacity: menuIsOpen ? 0 : 1,
            transition: "opacity 0.15s ease",
          }}>
            <div style={{ pointerEvents: menuIsOpen ? "none" : "auto" }}>
              {partner ? (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  ...G.pill, borderRadius: 999, padding: "5px 14px", ...NOTAP,
                }}>
                  <div style={{
                    width: 6, height: 6, flexShrink: 0,
                    color: pOnline ? "#22c55e" : "rgba(0,0,0,0.20)",
                    filter: pOnline ? "drop-shadow(0 0 4px #22c55e)" : "none",
                  }}>{IC.dot}</div>
                  <span style={{ fontSize: "clamp(10px,2.8vw,12px)", color: "rgba(0,0,0,0.42)", fontWeight: 500 }}>
                    {pMins === null ? "Партнёр не заходил"
                      : pMins < 5 ? "Партнёр онлайн"
                      : pMins < 60 ? `Партнёр ${pMins} мин назад`
                      : `Партнёр ${Math.floor(pMins / 60)} ч назад`}
                  </span>
                </div>
              ) : (
                <button
                  onClick={() => handleTab("partner")}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    ...G.pill, border: "1px dashed rgba(0,0,0,0.13)",
                    borderRadius: 999, padding: "6px 16px",
                    cursor: "pointer", fontFamily: "inherit",
                    fontSize: "clamp(11px,3vw,12px)", color: "rgba(0,0,0,0.42)",
                    fontWeight: 600, outline: "none", ...NOTAP,
                  }}
                >
                  <div style={{ width: 13, height: 13, color: "rgba(0,0,0,0.32)" }}>{IC.users}</div>
                  Пригласить партнёра
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom block */}
      <BottomBlock
        pet={pet} evo={evo} sleepVal={sleepVal}
        activeTab={activeTab} isCd={isCd} getCd={getCd}
        onTab={handleTab} onClose={handleClose}
        petRef={petDomRef} onStroking={handleStroking} isStroking={isStroking}
        navRowRef={navRowRef}
      />

      {/* Home indicator */}
      <div style={{
        position: "absolute", bottom: "clamp(5px,1.5vw,8px)", left: "50%", transform: "translateX(-50%)",
        width: 100, height: 4, background: "rgba(0,0,0,0.10)", borderRadius: 4,
        zIndex: 20, pointerEvents: "none",
      }} />

      {/* Hearts — CSS keyframe, no framer-motion */}
      {hearts.map(h => (
        <div key={h.id}
          style={{
            position: "fixed", top: h.y - 9, left: h.x - 9,
            fontSize: 18, pointerEvents: "none",
            zIndex: 1000, color: "#f9a8d4",
            filter: "drop-shadow(0 1px 3px rgba(249,168,212,0.4))",
            animation: "heart-float 0.8s ease-out forwards",
            "--hx": `${Math.cos(h.angle) * h.dist}px`,
            "--hy": `${Math.sin(h.angle) * h.dist}px`,
          } as React.CSSProperties}
        >🩷</div>
      ))}
    </div>
  );
}