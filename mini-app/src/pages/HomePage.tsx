// mini-app/src/pages/HomePage.tsx
import { useEffect, useCallback, useState, useRef, useMemo, useLayoutEffect } from "react";
import { motion, AnimatePresence, useDragControls, useMotionValue, useSpring, useTransform } from "framer-motion";
import { usePetStore } from "../store/usePetStore";
import { useMenuStore, MENU_ORDER, type MenuCategory } from "../store/useMenuStore";
import { PetSVG } from "../components/PetSVG";
import { BottomBlock, cdActive, HALF_H, WIDGET_H, GLOVE_GAP } from "../components/BottomBlock";
import { IC } from "../components/icons";
import { NOTAP, type TabId } from "../components/NavCarousel";
import type { ActionType } from "../api/types";

const tg = window.Telegram?.WebApp;
type CSSProps = React.CSSProperties;

/* ── Design tokens ── */
const G = {
  heavy: {
    background: "rgba(255,255,255,0.55)", backdropFilter: "blur(32px) saturate(180%)",
    WebkitBackdropFilter: "blur(32px) saturate(180%)", border: "1px solid rgba(255,255,255,0.70)",
    boxShadow: "0 6px 24px rgba(0,0,0,0.07), inset 0 1.5px 0 rgba(255,255,255,0.9)",
  } as CSSProps,
  pill: {
    background: "rgba(255,255,255,0.38)", backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,0.55)",
    boxShadow: "0 2px 10px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.7)",
  } as CSSProps,
};

const PILL_H    = 50;
const RING_SIZE = 34;
const MENU_TABS = new Set<string>(MENU_ORDER);

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
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
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
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -60 }}
          transition={{ duration: 0.85, ease: "easeOut" }}
          style={{
            position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
            fontSize: 20, fontWeight: 800, color: "rgba(0,0,0,0.60)",
            textShadow: "0 2px 8px rgba(255,255,255,0.6)", pointerEvents: "none",
            whiteSpace: "nowrap", zIndex: 20,
          }}
        >{text}</motion.div>
      )}
    </AnimatePresence>
  );
}

interface HeartFx { id: number; x: number; y: number; angle: number; dist: number }

/* ── Anchor calculation ── */
interface AnchorPoint { x: number; y: number }

function calcAnchor(
  headerRef: React.RefObject<HTMLElement | null>,
  navRef: React.RefObject<HTMLElement | null>,
  containerRef: React.RefObject<HTMLElement | null>,
): AnchorPoint | null {
  const header = headerRef.current;
  const nav = navRef.current;
  const container = containerRef.current;
  if (!header || !nav || !container) return null;

  const containerRect = container.getBoundingClientRect();
  const headerRect = header.getBoundingClientRect();
  const navRect = nav.getBoundingClientRect();

  // Верхняя граница = низ хедера
  const topY = headerRect.bottom;
  // Нижняя граница = верх навигации (50% от высоты меню + виджет карусели)
  // При открытом меню навигация поднимается, navRect.top даёт актуальную позицию
  const bottomY = navRect.top;

  // Центр по X = ширина контейнера / 2
  const centerX = containerRect.left + containerRect.width / 2;
  // Центр по Y = середина между хедером и навигацией
  const centerY = topY + (bottomY - topY) / 2;

  return {
    x: centerX - containerRect.left,
    y: centerY - containerRect.top,
  };
}

/* ── DraggablePet with anchor support ── */
function DraggablePet({ children, constraintsRef, isStroking, onHeartAt, petDomRef, disabled, anchorPoint }: {
  children: React.ReactNode;
  constraintsRef: React.RefObject<HTMLElement | null>;
  isStroking: boolean;
  onHeartAt: (x: number, y: number) => void;
  petDomRef: React.RefObject<HTMLDivElement | null>;
  disabled: boolean;
  anchorPoint: AnchorPoint | null;
}) {
  const controls = useDragControls();
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Свободный drag
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);

  // Анимируемая позиция (используется и для якоря, и для возврата)
  const springCfg = { stiffness: 300, damping: 30, mass: 0.8 };
  const animX = useSpring(0, springCfg);
  const animY = useSpring(0, springCfg);

  const naturalCenter = useRef<{ x: number; y: number } | null>(null);
  const prevDisabled = useRef(false);
  const savedDragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Измерить natural center (без учёта текущего transform-смещения)
  const measureNatural = useCallback(() => {
    const el = petDomRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Вычитаем текущее смещение, чтобы получить «чистый» центр
    const curX = animX.get();
    const curY = animY.get();
    naturalCenter.current = {
      x: r.left + r.width / 2 - curX,
      y: r.top + r.height / 2 - curY,
    };
  }, [petDomRef, animX, animY]);

  useEffect(() => {
    const becameAnchored = disabled && anchorPoint && !prevDisabled.current;
    const becameFree = !disabled && prevDisabled.current;

    if (becameAnchored) {
      // Сохраняем текущий drag-offset перед переходом в anchored
      savedDragOffset.current = { x: dragX.get(), y: dragY.get() };

      // Измеряем natural center с учётом текущего drag-смещения
      measureNatural();
      const nc = naturalCenter.current;
      const container = constraintsRef.current;
      if (nc && container && anchorPoint) {
        const cr = container.getBoundingClientRect();
        const targetX = cr.left + anchorPoint.x;
        const targetY = cr.top + anchorPoint.y;
        // Смещение от natural center до якоря
        const offsetX = targetX - nc.x;
        const offsetY = targetY - nc.y;
        // Стартуем spring с текущего drag-offset, анимируем к якорю
        animX.jump(savedDragOffset.current.x);
        animY.jump(savedDragOffset.current.y);
        animX.set(offsetX);
        animY.set(offsetY);
      }
    }

    if (becameFree) {
      // Возвращаемся из якоря — анимируем spring к (0,0) = исходный центр
      // dragX/dragY тоже сбрасываем
      dragX.jump(0);
      dragY.jump(0);
      animX.set(0);
      animY.set(0);
    }

    prevDisabled.current = disabled;
  }, [disabled, anchorPoint, measureNatural, constraintsRef, animX, animY, dragX, dragY]);

  const getPetCenter = useCallback(() => {
    const el = petDomRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, [petDomRef]);

  useEffect(() => {
    if (isStroking && !disabled) {
      if (!tickRef.current) {
        tickRef.current = setInterval(() => {
          const c = getPetCenter();
          const a = Math.random() * Math.PI * 2;
          onHeartAt(c.x + Math.cos(a) * 50, c.y + Math.sin(a) * 50);
        }, 140);
      }
    } else {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    }
    return () => { if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; } };
  }, [isStroking, disabled, getPetCenter, onHeartAt]);

  // В anchored-режиме используем spring, в свободном — drag
  const finalX = useTransform(() => disabled ? animX.get() : dragX.get());
  const finalY = useTransform(() => disabled ? animY.get() : dragY.get());

  return (
    <motion.div
      drag={!disabled}
      dragControls={controls}
      dragConstraints={constraintsRef}
      dragElastic={0.10}
      dragMomentum={false}
      whileDrag={disabled ? {} : { scale: 1.06 }}
      style={{
        cursor: disabled ? "default" : "grab",
        touchAction: "none",
        display: "inline-block",
        x: finalX,
        y: finalY,
        ...NOTAP,
      }}
      onPointerDown={e => { if (!disabled) controls.start(e); }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        {children}
      </div>
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

  const [activeTab, setActiveTab] = useState<TabId | null>(null);
  const [floatText, setFloatText] = useState("");
  const [floatShow, setFloatShow] = useState(false);
  const [isStroking, setIsStroking] = useState(false);
  const [hearts, setHearts] = useState<HeartFx[]>([]);
  const [anchorPoint, setAnchorPoint] = useState<AnchorPoint | null>(null);
  const nextHeart = useRef(0);

  const petZoneRef = useRef<HTMLDivElement>(null);
  const petDomRef  = useRef<HTMLDivElement>(null);
  const headerRef  = useRef<HTMLElement>(null);
  const navRowRef  = useRef<HTMLDivElement>(null);
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

  // Рассчитываем anchor point при открытии/закрытии меню
  useEffect(() => {
    if (menuIsOpen) {
      // Даём время на анимацию открытия меню (spring ~200ms), потом считаем
      const timer = setTimeout(() => {
        const anchor = calcAnchor(headerRef, navRowRef, containerRef);
        setAnchorPoint(anchor);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setAnchorPoint(null);
    }
  }, [menuIsOpen]);

  // Пересчитываем anchor при resize
  useEffect(() => {
    if (!menuIsOpen) return;
    const onResize = () => {
      const anchor = calcAnchor(headerRef, navRowRef, containerRef);
      setAnchorPoint(anchor);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [menuIsOpen]);

  const handleStroking = useCallback((v: boolean) => setIsStroking(v), []);
  const spawnHeart = useCallback((x: number, y: number) => {
    const id = nextHeart.current++;
    const angle = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 30;
    setHearts(h => [...h.slice(-12), { id, x, y, angle, dist }]);
    setTimeout(() => setHearts(h => h.filter(hh => hh.id !== id)), 900);
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
  const isCd  = (a: string) => cdActive(getCd(a));

  const showFloat = (t: string) => {
    setFloatText(t); setFloatShow(true);
    setTimeout(() => setFloatShow(false), 1400);
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
      if (tab === "feed") doAction("feed", "+30 🍎");
      if (tab === "play") doAction("play", "+25 🎾");
      return;
    }
    setActiveTab(tab);
    closeMenu();
  };

  const handleInviteFromMenu = async () => {
    try {
      const { createInvite } = await import("../api/pets");
      const inv = await createInvite(pet.id);
      tg?.showAlert?.(`Ссылка:\n${inv.link}`);
    } catch {
      tg?.showAlert?.("Не удалось создать ссылку");
    }
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
      {/* Blobs */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-12%", left: "-18%", width: "55%", paddingBottom: "55%", borderRadius: "50%", background: "radial-gradient(circle,rgba(196,181,253,0.22) 0%,transparent 70%)" }} />
        <div style={{ position: "absolute", top: "15%", right: "-20%", width: "52%", paddingBottom: "52%", borderRadius: "50%", background: "radial-gradient(circle,rgba(251,207,232,0.22) 0%,transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "8%", left: "8%", width: "46%", paddingBottom: "46%", borderRadius: "50%", background: "radial-gradient(circle,rgba(167,243,208,0.18) 0%,transparent 70%)" }} />
      </div>

      {/* ══ Pet zone ══ */}
      <div ref={petZoneRef} style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", zIndex: 5, overflow: "hidden", minHeight: 0 }}>

        {/* ── Header ── */}
        <header
          ref={headerRef}
          style={{
            padding: "clamp(12px,3.5vw,20px) clamp(12px,4vw,18px) 6px",
            zIndex: 10, position: "relative",
            display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
          }}
        >
          {/* Name + level + streak pill */}
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
                  <motion.div animate={{ width: `${xpPct}%` }} transition={{ duration: 0.6 }}
                    style={{ height: "100%", background: "rgba(0,0,0,0.32)", borderRadius: 2 }} />
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

          {/* Status rings */}
          <div style={{
            ...G.heavy, borderRadius: 999, height: PILL_H, padding: "0 10px",
            display: "flex", gap: 4, alignItems: "center", flexShrink: 0,
          }}>
            <StatusRing value={pet.hunger}    icon={IC.food} />
            <StatusRing value={pet.happiness} icon={IC.game} />
            <StatusRing value={sleepVal}      icon={IC.moon} />
            <StatusRing value={pet.health}    icon={IC.wash} />
          </div>
        </header>

        {/* ── Pet centered ── */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "relative" }}>
            <FloatAnim show={floatShow} text={floatText} />
            <DraggablePet
              constraintsRef={petZoneRef}
              isStroking={isStroking}
              onHeartAt={spawnHeart}
              petDomRef={petDomRef}
              disabled={menuIsOpen}
              anchorPoint={menuIsOpen ? anchorPoint : null}
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

          {/* Partner badge */}
          <AnimatePresence>
            {!menuIsOpen && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: "absolute", bottom: 10, left: 0, right: 0,
                  display: "flex", justifyContent: "center", zIndex: 6, pointerEvents: "none",
                }}
              >
                <div style={{ pointerEvents: "auto" }}>
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
                        {pMins === null
                          ? "Партнёр не заходил"
                          : pMins < 5 ? "Партнёр онлайн"
                          : pMins < 60 ? `Партнёр ${pMins} мин назад`
                          : `Партнёр ${Math.floor(pMins / 60)} ч назад`}
                      </span>
                    </div>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.96 }}
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

      {/* Hearts */}
      {hearts.map(h => (
        <motion.div key={h.id}
          initial={{ opacity: 1, scale: 0.5, x: h.x - 9, y: h.y - 9 }}
          animate={{ opacity: 0, scale: 1.1, x: h.x - 9 + Math.cos(h.angle) * h.dist, y: h.y - 9 + Math.sin(h.angle) * h.dist }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{
            position: "fixed", top: 0, left: 0, fontSize: 18, pointerEvents: "none",
            zIndex: 1000, color: "#f9a8d4", filter: "drop-shadow(0 1px 4px rgba(249,168,212,0.5))",
          }}
        >🩷</motion.div>
      ))}
    </div>
  );
}