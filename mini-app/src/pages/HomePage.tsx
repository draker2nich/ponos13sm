// mini-app/src/pages/HomePage.tsx
import { useEffect, useCallback, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePetStore } from "../store/usePetStore";
import { PetSVG } from "../components/PetSVG";
import { createInvite } from "../api/pets";
import type { ActionType } from "../api/types";

const tg = window.Telegram?.WebApp;

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtCd(isoOrNull: string | null): string {
  if (!isoOrNull) return "";
  const sec = Math.max(0, Math.ceil((new Date(isoOrNull).getTime() - Date.now()) / 1000));
  if (sec <= 0) return "";
  if (sec > 3600) return `${Math.floor(sec / 3600)}ч`;
  if (sec > 60)   return `${Math.floor(sec / 60)}м`;
  return `${sec}с`;
}

function isCdActive(iso: string | null): boolean {
  return !!iso && new Date(iso).getTime() > Date.now();
}

const toDeg = (v: number) => Math.round((Math.max(0, Math.min(100, v)) / 100) * 360);

// ─── StatusRing ─────────────────────────────────────────────────────────────

function StatusRing({ value, icon, label }: { value: number; icon: string; label: string }) {
  const deg = toDeg(value);
  const low = value < 25;
  const fill = low ? "rgba(255,100,100,0.85)" : "rgba(255,255,255,0.75)";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{
        width: 52, height: 52, borderRadius: "50%",
        background: `conic-gradient(${fill} 0deg ${deg}deg, rgba(255,255,255,0.12) ${deg}deg 360deg)`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: "50%",
          background: "#0a0a0f",
          boxShadow: "inset 0 2px 5px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18,
        }}>{icon}</div>
      </div>
      <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: "0.05em" }}>
        {label}
      </span>
    </div>
  );
}

// ─── Carousel ───────────────────────────────────────────────────────────────

function Carousel({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const down = useRef(false);
  const startX = useRef(0);
  const scrollL = useRef(0);
  const dragged = useRef(false);

  const onDown = (e: React.MouseEvent) => {
    down.current = true; dragged.current = false;
    startX.current = e.pageX - ref.current!.offsetLeft;
    scrollL.current = ref.current!.scrollLeft;
    ref.current!.style.cursor = "grabbing";
  };
  const onUp = (e: React.MouseEvent) => {
    down.current = false;
    if (ref.current) ref.current.style.cursor = "grab";
    if (dragged.current) e.stopPropagation();
  };
  const onMove = (e: React.MouseEvent) => {
    if (!down.current) return;
    dragged.current = true;
    ref.current!.scrollLeft = scrollL.current - (e.pageX - ref.current!.offsetLeft - startX.current) * 1.2;
  };

  return (
    <div ref={ref}
      onMouseDown={onDown} onMouseUp={onUp} onMouseLeave={onUp} onMouseMove={onMove}
      style={{
        display: "flex", gap: 6, overflowX: "auto",
        cursor: "grab", scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
        padding: "2px 4px", userSelect: "none",
      }}
    >{children}</div>
  );
}

// ─── CarouselBtn ────────────────────────────────────────────────────────────

type TabId = ActionType | "shop" | "sleep" | "partner" | "settings";

interface CarouselBtnProps {
  icon: string; label: string;
  active?: boolean; disabled?: boolean; cdLabel?: string;
  onClick?: () => void;
}

function CarouselBtn({ icon, label, active, disabled, cdLabel, onClick }: CarouselBtnProps) {
  return (
    <motion.button
      whileTap={disabled ? {} : { scale: 0.88 }}
      onClick={disabled ? undefined : onClick}
      style={{
        flexShrink: 0, width: 70, padding: "8px 4px 6px",
        borderRadius: 999,
        border: active ? "1px solid rgba(255,255,255,0.4)" : "1px solid transparent",
        background: active ? "rgba(255,255,255,0.18)" : "transparent",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
        transition: "background 0.15s, border 0.15s",
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        background: active ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.05)",
        border: active ? "none" : "1px solid rgba(255,255,255,0.1)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22,
        filter: disabled ? "grayscale(1) opacity(0.35)" : "none",
        boxShadow: active ? "0 4px 16px rgba(255,255,255,0.15)" : "none",
        transition: "all 0.2s",
      }}>{icon}</div>
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", lineHeight: 1,
        color: active ? "rgba(255,255,255,0.95)"
          : disabled ? "rgba(255,255,255,0.22)"
          : "rgba(255,255,255,0.45)",
      }}>
        {disabled && cdLabel ? cdLabel : label}
      </span>
    </motion.button>
  );
}

// ─── FloatAnim ──────────────────────────────────────────────────────────────

function FloatAnim({ show, text }: { show: boolean; text: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: -60 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          style={{
            position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
            fontSize: 22, fontWeight: 900, color: "#ffd700",
            pointerEvents: "none", whiteSpace: "nowrap", zIndex: 20,
            textShadow: "0 2px 12px rgba(255,215,0,0.5)",
          }}
        >{text}</motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

interface Props { petId: number }

export function HomePage({ petId }: Props) {
  const { pet, fetchPet, performAction, loading } = usePetStore();
  const [activeTab, setActiveTab] = useState<TabId>("feed");
  const [floatText, setFloatText] = useState("");
  const [floatShow, setFloatShow] = useState(false);

  const refresh = useCallback(() => fetchPet(petId), [petId, fetchPet]);

  useEffect(() => { refresh(); }, [petId]);
  useEffect(() => { const id = setInterval(refresh, 60_000); return () => clearInterval(id); }, [refresh]);
  useEffect(() => {
    const h = () => { if (!document.hidden) refresh(); };
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  }, [refresh]);

  if (loading && !pet) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100vh", background:"#07070c" }}>
      <div style={{ fontSize:48 }}>🐾</div>
      <div style={{ fontSize:14, color:"rgba(255,255,255,0.4)", marginTop:12 }}>Загрузка...</div>
    </div>
  );
  if (!pet) return null;

  const evo     = Math.min(7, Math.floor(pet.level / 2) + 1);
  const needed  = pet.level * 100;
  const xpPct   = Math.min(100, (pet.experience / needed) * 100);
  const getCd   = (a: string) => pet.cooldowns.find(c => c.action === a)?.available_at ?? null;
  const isCd    = (a: string) => isCdActive(getCd(a));

  const partner = pet.owners.find(o => !o.is_creator) ?? pet.owners[1];
  const partnerMins = partner?.last_active_at
    ? Math.floor((Date.now() - new Date(partner.last_active_at).getTime()) / 60_000)
    : null;

  const showFloat = (text: string) => {
    setFloatText(text); setFloatShow(true);
    setTimeout(() => setFloatShow(false), 1400);
  };

  const doAction = async (action: ActionType, floatMsg: string) => {
    if (isCd(action)) return;
    setActiveTab(action);
    await performAction(action);
    showFloat(floatMsg);
  };

  const handleInvite = async () => {
    try {
      const inv = await createInvite(pet.id);
      tg?.showAlert?.(`Ссылка для друга:\n${inv.link}`);
    } catch {
      tg?.showAlert?.("Не удалось создать ссылку");
    }
  };

  const handleTabAction = (tab: TabId) => {
    setActiveTab(tab);
    switch (tab) {
      case "feed":    doAction("feed", "+30 🍖"); break;
      case "play":    doAction("play", "+25 💚"); break;
      case "pet":     doAction("pet",  "+15 🤍"); break;
      case "partner": handleInvite(); break;
      case "sleep":
        tg?.showAlert?.(`😴 ${pet.name} уже спит крепко!\nПусть отдыхает...`); break;
      case "shop":
        tg?.showAlert?.("🛒 Магазин — скоро!"); break;
      case "settings":
        tg?.showAlert?.(
          `🐾 ${pet.name} · Ур.${pet.level}\n` +
          `📅 Возраст: ${pet.age_days} дн.\n` +
          `👑 Эволюция: ${evo}/7\n` +
          `⭐ Опыт: ${pet.experience}/${needed}`
        ); break;
    }
  };

  // Mood → sleep ring value proxy
  const sleepVal = pet.mood === "sleepy" ? 100 : 60;

  return (
    <div style={{
      maxWidth: 430, margin: "0 auto",
      minHeight: "100vh", height: "100dvh",
      background: "linear-gradient(to bottom, #12121a, #07070c)",
      fontFamily: "'Inter', system-ui, sans-serif",
      position: "relative", overflow: "hidden",
      display: "flex", flexDirection: "column", color: "#fff",
    }}>

      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <header style={{ padding: "20px 16px 8px", zIndex: 20, position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>

          {/* Name + level pill */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999, padding: "8px 14px",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            }}>🐾</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "rgba(255,255,255,0.92)", lineHeight: 1.2 }}>
                {pet.name}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.06em" }}>
                  LV.{pet.level}
                </span>
                <div style={{ width: 56, height: 5, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <motion.div animate={{ width: `${xpPct}%` }} transition={{ duration: 0.6 }}
                    style={{ height: "100%", background: "rgba(255,255,255,0.45)", borderRadius: 4 }} />
                </div>
              </div>
            </div>
          </div>

          {/* Streak + XP */}
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { icon: "🔥", val: pet.streak },
              { icon: "⭐", val: pet.experience },
            ].map(({ icon, val }) => (
              <div key={icon} style={{
                display: "flex", alignItems: "center", gap: 5,
                background: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.18)", borderRadius: 999, padding: "6px 12px",
              }}>
                <span style={{ fontSize: 14 }}>{icon}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "rgba(255,255,255,0.9)" }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── STATUS RINGS ──────────────────────────────────────────────── */}
      <div style={{
        display: "flex", justifyContent: "center", gap: 14,
        padding: "6px 16px", zIndex: 20, position: "relative",
      }}>
        <StatusRing value={pet.hunger}    icon="🍖" label="ЕДА"      />
        <StatusRing value={pet.happiness} icon="🎾" label="ИГРА"     />
        <StatusRing value={sleepVal}      icon="🌙" label="СОН"      />
        <StatusRing value={pet.health}    icon="🫧" label="ЧИСТОТА"  />
      </div>

      {/* ── PET ───────────────────────────────────────────────────────── */}
      <main style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        position: "relative", padding: "0 16px",
      }}>
        <div style={{ position: "relative" }}>
          <FloatAnim show={floatShow} text={floatText} />
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            style={{ filter: "drop-shadow(0 0 20px rgba(255,255,255,0.15))", cursor: "pointer" }}
            whileTap={{ scale: 0.95 }}
          >
            <PetSVG mood={pet.mood} petType={pet.pet_type} evolution={evo} isReacting={floatShow} size={200} />
          </motion.div>
          {/* shadow */}
          <div style={{
            width: 90, height: 12, background: "rgba(0,0,0,0.45)",
            filter: "blur(8px)", borderRadius: "50%", margin: "-10px auto 0",
          }} />
        </div>

        {/* Partner / invite tag */}
        <div style={{ marginTop: 18 }}>
          {partner ? (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 999, padding: "5px 14px", backdropFilter: "blur(6px)",
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                background: partnerMins !== null && partnerMins < 5 ? "#4ade80" : "rgba(255,255,255,0.3)",
                boxShadow: partnerMins !== null && partnerMins < 5 ? "0 0 6px #4ade80" : "none",
              }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>
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
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.2)",
                borderRadius: 999, padding: "7px 18px",
                cursor: "pointer", fontSize: 12, color: "rgba(255,255,255,0.5)",
                fontWeight: 600, fontFamily: "inherit",
              }}
            >👥 Пригласить партнёра</motion.button>
          )}
        </div>
      </main>

      {/* ── CAROUSEL NAV ──────────────────────────────────────────────── */}
      <nav style={{ padding: "8px 12px 36px", zIndex: 30, position: "relative" }}>
        <div style={{
          background: "rgba(255,255,255,0.1)", backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.18)", borderRadius: 999, padding: "6px 8px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}>
          <Carousel>
            <CarouselBtn icon="🍖" label="КОРМИТЬ"
              active={activeTab === "feed"}
              disabled={isCd("feed")} cdLabel={fmtCd(getCd("feed"))}
              onClick={() => handleTabAction("feed")} />
            <CarouselBtn icon="🎾" label="ИГРАТЬ"
              active={activeTab === "play"}
              disabled={isCd("play")} cdLabel={fmtCd(getCd("play"))}
              onClick={() => handleTabAction("play")} />
            <CarouselBtn icon="🤍" label="ГЛАДИТЬ"
              active={activeTab === "pet"}
              disabled={isCd("pet")} cdLabel={fmtCd(getCd("pet"))}
              onClick={() => handleTabAction("pet")} />
            <CarouselBtn icon="🛒" label="МАГАЗИН"
              active={activeTab === "shop"}
              onClick={() => handleTabAction("shop")} />
            <CarouselBtn icon="🌙" label="СОН"
              active={activeTab === "sleep"}
              onClick={() => handleTabAction("sleep")} />
            <CarouselBtn icon="👥" label="ПАРТНЁР"
              active={activeTab === "partner"}
              onClick={() => handleTabAction("partner")} />
            <CarouselBtn icon="⚙️" label="НАСТРОЙКИ"
              active={activeTab === "settings"}
              onClick={() => handleTabAction("settings")} />
          </Carousel>
        </div>
      </nav>

      {/* iOS home indicator */}
      <div style={{
        position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)",
        width: 120, height: 4, background: "rgba(255,255,255,0.18)", borderRadius: 4, zIndex: 40,
      }} />
    </div>
  );
}