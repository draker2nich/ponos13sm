// mini-app/src/pages/HomePage.tsx
import { useEffect, useCallback, useState, useRef, useMemo } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { usePetStore } from "../store/usePetStore";
import { useMenuStore, MENU_ORDER, type MenuCategory } from "../store/useMenuStore";
import { useCoinStore } from "../store/useCoinStore";
import { useSleepStore } from "../store/useSleepStore";
import { PetSVG } from "../components/PetSVG";
import { BottomBlock, cdActive } from "../components/BottomBlock";
import { IC } from "../components/icons";
import { NOTAP, type TabId } from "../components/NavCarousel";
import type { ActionType } from "../api/types";
import { BlockBlastGame } from "../components/BlockBlastGame";

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

/* ── Sleep overlay on scene ── */
function SleepOverlay() {
  const sleeping = useSleepStore(s => s.sleeping);
  return (
    <>
      <div style={{
        position: "absolute", inset: 0, zIndex: 15,
        background: sleeping
          ? "radial-gradient(ellipse at 50% 55%, rgba(15,12,40,0.82) 0%, rgba(5,3,20,0.94) 100%)"
          : "transparent",
        pointerEvents: "none",
        transition: "background 0.8s ease",
      }} />
      {sleeping && (
        <div style={{ position: "absolute", inset: 0, zIndex: 16, pointerEvents: "none", overflow: "hidden" }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={`star-${i}`} style={{
              position: "absolute",
              left: `${8 + ((i * 17 + 7) % 84)}%`,
              top: `${5 + ((i * 23 + 11) % 70)}%`,
              fontSize: 6 + (i % 4) * 3,
              color: `rgba(255,255,220,${0.15 + (i % 3) * 0.12})`,
              animation: `star-twinkle ${1.2 + (i % 5) * 0.5}s ease-in-out infinite alternate`,
              animationDelay: `${(i * 0.25) % 2}s`,
            }}>✦</span>
          ))}
          <div style={{
            position: "absolute", top: "8%", right: "12%",
            fontSize: 32,
            filter: "drop-shadow(0 0 18px rgba(255,230,150,0.35))",
            animation: "sleep-moon-glow 4s ease-in-out infinite alternate",
          }}>🌙</div>
        </div>
      )}
    </>
  );
}

function SleepZzz() {
  const sleeping = useSleepStore(s => s.sleeping);
  if (!sleeping) return null;
  return (
    <div style={{
      position: "absolute", top: "-10%", right: "-20%",
      zIndex: 18, pointerEvents: "none", width: 80, height: 120,
    }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          position: "absolute", left: `${i * 22}%`, bottom: 0,
          fontSize: 16 + i * 8, fontWeight: 900, fontStyle: "italic",
          color: `rgba(200,190,255,${0.4 + i * 0.15})`,
          textShadow: `0 0 8px rgba(180,170,240,${0.2 + i * 0.1})`,
          animation: `zzz-float ${2.2 + i * 0.5}s ease-in-out infinite`,
          animationDelay: `${i * 0.6}s`,
        }}>Z</span>
      ))}
    </div>
  );
}

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
  const sleeping = useSleepStore(s => s.sleeping);
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
      drag={!anchored && !sleeping}
      dragConstraints={constraintsRef}
      dragElastic={0.08}
      dragMomentum={false}
      style={{
        cursor: anchored || sleeping ? "default" : "grab",
        touchAction: "none", display: "inline-block",
        x: springX, y: springY, willChange: "transform",
        ...NOTAP,
      }}
    >
      {children}
    </motion.div>
  );
}

interface Props { petId: number }

export function HomePage({ petId }: Props) {
  const { pet, fetchPet, performAction, loading } = usePetStore();
  const { openMenu, setMenu, closeMenu } = useMenuStore();
  const coins = useCoinStore(s => s.coins);
  const fetchCoins = useCoinStore(s => s.fetchCoins);
  const sleeping = useSleepStore(s => s.sleeping);

  const [activeTab, setActiveTab] = useState<TabId | null>(null);
  const [floatText, setFloatText] = useState("");
  const [floatShow, setFloatShow] = useState(false);
  const [isStroking, setIsStroking] = useState(false);
  const [hearts, setHearts] = useState<HeartFx[]>([]);
  const nextHeart = useRef(0);

  const [gameOpen, setGameOpen] = useState(false);

  // Petting debounce: track stroking duration
  const strokeStart = useRef<number | null>(null);
  const petTriggered = useRef(false);

  const petZoneRef = useRef<HTMLDivElement>(null);
  const petDomRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const navRowRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const menuIsOpen = openMenu !== null;

  const refresh = useCallback(() => fetchPet(petId), [petId, fetchPet]);
  useEffect(() => { refresh(); fetchCoins(); }, [petId]);
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

  // Petting → pet action after 2s of stroking
  const handleStroking = useCallback((v: boolean) => {
    setIsStroking(v);
    if (v && !strokeStart.current) {
      strokeStart.current = Date.now();
      petTriggered.current = false;
    }
    if (v && strokeStart.current && !petTriggered.current) {
      const elapsed = Date.now() - strokeStart.current;
      if (elapsed >= 2000) {
        petTriggered.current = true;
        performAction("pet");
        showFloat("+15 🤍");
        try {
          (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred?.("medium");
        } catch { /* noop */ }
      }
    }
    if (!v) {
      strokeStart.current = null;
      petTriggered.current = false;
    }
  }, [performAction]);

  // Keep checking while stroking
  useEffect(() => {
    if (!isStroking) return;
    const id = setInterval(() => {
      if (strokeStart.current && !petTriggered.current) {
        const elapsed = Date.now() - strokeStart.current;
        if (elapsed >= 2000) {
          petTriggered.current = true;
          performAction("pet");
          showFloat("+15 🤍");
          try {
            (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred?.("medium");
          } catch { /* noop */ }
        }
      }
    }, 200);
    return () => clearInterval(id);
  }, [isStroking, performAction]);

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
    try {
      (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred?.("medium");
    } catch { /* noop */ }
  };
  const handleClose = () => closeMenu();
  const handleTab = (tab: TabId) => {
    if (MENU_TABS.has(tab)) {
      if (activeTab === tab && menuIsOpen) { handleClose(); return; }
      setActiveTab(tab);
      setMenu(tab as MenuCategory);
      if (tab === "feed") doAction("feed", "+30 🍎");
      if (tab === "play") doAction("play", "+25 🎾");
      return;
    }
    setActiveTab(tab); closeMenu();
  };

  const effectiveMood = sleeping ? "sleepy" as const : (isStroking ? "happy" as const : pet.mood);

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
      {/* Blobs */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-12%", left: "-18%", width: "55%", paddingBottom: "55%", borderRadius: "50%", background: "radial-gradient(circle,rgba(196,181,253,0.22) 0%,transparent 70%)" }} />
        <div style={{ position: "absolute", top: "15%", right: "-20%", width: "52%", paddingBottom: "52%", borderRadius: "50%", background: "radial-gradient(circle,rgba(251,207,232,0.22) 0%,transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "8%", left: "8%", width: "46%", paddingBottom: "46%", borderRadius: "50%", background: "radial-gradient(circle,rgba(167,243,208,0.18) 0%,transparent 70%)" }} />
      </div>

      <SleepOverlay />

      <div ref={petZoneRef} style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", zIndex: 5, overflow: "hidden", minHeight: 0 }}>

        <header
          ref={headerRef}
          style={{
            padding: "clamp(12px,3.5vw,20px) clamp(12px,4vw,18px) 6px",
            zIndex: 20, position: "relative",
            display: "flex", alignItems: "flex-start", gap: 8, flexShrink: 0,
            opacity: sleeping ? 0.3 : 1, transition: "opacity 0.6s ease",
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

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0, gap: 4 }}>
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
              backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.70)",
              boxShadow: "0 2px 10px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.9)",
              borderRadius: 999, padding: "4px 10px", minWidth: 52, justifyContent: "center",
            }}>
              <span style={{ fontSize: 11, lineHeight: 1 }}>🪙</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: "rgba(180,140,20,0.85)" }}>{coins}</span>
            </div>
          </div>
        </header>

        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "relative" }}>
            <FloatAnim show={floatShow} text={floatText} />
            <SleepZzz />

            <DraggablePet
              constraintsRef={petZoneRef} isStroking={isStroking}
              onHeartAt={spawnHeart} petDomRef={petDomRef}
              anchored={menuIsOpen} headerRef={headerRef}
              navRowRef={navRowRef} containerRef={containerRef}
            >
              <div ref={petDomRef} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <PetSVG
                  mood={effectiveMood} petType={pet.pet_type}
                  evolution={evo} isReacting={floatShow || isStroking}
                  size="clamp(120px,32vw,180px)"
                />
                <div style={{
                  width: "clamp(44px,12vw,68px)", height: 6,
                  background: sleeping ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.07)",
                  filter: "blur(5px)", borderRadius: "50%", marginTop: -2, pointerEvents: "none",
                  transition: "background 0.6s ease",
                }} />
              </div>
            </DraggablePet>
          </div>

          <div style={{
            position: "absolute", bottom: 10, left: 0, right: 0,
            display: "flex", justifyContent: "center", zIndex: 20, pointerEvents: "none",
            opacity: menuIsOpen || sleeping ? 0 : 1, transition: "opacity 0.15s ease",
          }}>
            <div style={{ pointerEvents: menuIsOpen || sleeping ? "none" : "auto" }}>
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

      <BottomBlock
        pet={pet} evo={evo} sleepVal={sleepVal}
        activeTab={activeTab} isCd={isCd} getCd={getCd}
        onTab={handleTab} onClose={handleClose}
        petRef={petDomRef} onStroking={handleStroking} isStroking={isStroking}
        navRowRef={navRowRef}
        onGameOpen={() => setGameOpen(true)}
      />

      <div style={{
        position: "absolute", bottom: "clamp(5px,1.5vw,8px)", left: "50%", transform: "translateX(-50%)",
        width: 100, height: 4, background: "rgba(0,0,0,0.10)", borderRadius: 4,
        zIndex: 20, pointerEvents: "none",
      }} />

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

      {gameOpen && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 999,
          background: "linear-gradient(150deg,#eef2ff 0%,#fce7f3 45%,#ecfdf5 100%)",
          display: "flex", flexDirection: "column",
        }}>
          <BlockBlastGame onBack={() => setGameOpen(false)} />
        </div>
      )}
    </div>
  );
}