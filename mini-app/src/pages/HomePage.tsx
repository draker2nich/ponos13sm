// mini-app/src/pages/HomePage.tsx
import { useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePetStore } from "../store/usePetStore";
import { PetSVG } from "../components/PetSVG";
import { FeedMiniGame } from "../components/FeedMiniGame";
import { PlayMiniGame } from "../components/PlayMiniGame";
import { StatBar } from "../components/StatBar";
import { StreakBadge } from "../components/StreakBadge";
import { createInvite } from "../api/pets";

const tg = window.Telegram?.WebApp;

// ─── helpers ─────────────────────────────────────────────────────────────────

const MOOD_META: Record<string, { label: string; color: string; emoji: string }> = {
  happy:   { label: "Счастлив",  color: "#ffd700", emoji: "😄" },
  content: { label: "Доволен",   color: "#52c78e", emoji: "😊" },
  sad:     { label: "Грустит",   color: "#6a9fd8", emoji: "😔" },
  hungry:  { label: "Голодный",  color: "#f4a261", emoji: "😋" },
  sleepy:  { label: "Спит",      color: "#c5b8d8", emoji: "😴" },
};

const BG: Record<string, string> = {
  happy:   "radial-gradient(ellipse at 50% 110%, #1a2a1a 0%, #0a120a 70%, #06060f 100%)",
  content: "radial-gradient(ellipse at 50% 110%, #1a1a2e 0%, #0d0d1a 70%, #06060f 100%)",
  sad:     "radial-gradient(ellipse at 50% 110%, #161628 0%, #0d0d18 70%, #06060f 100%)",
  hungry:  "radial-gradient(ellipse at 50% 110%, #2a1a10 0%, #160d08 70%, #06060f 100%)",
  sleepy:  "radial-gradient(ellipse at 50% 110%, #1a1228 0%, #100a1e 70%, #06060f 100%)",
};

function fmtCd(isoOrNull: string | null): string {
  if (!isoOrNull) return "";
  const sec = Math.max(0, Math.ceil((new Date(isoOrNull).getTime() - Date.now()) / 1000));
  if (sec <= 0) return "";
  if (sec > 3600) return `${Math.floor(sec / 3600)}ч`;
  if (sec > 60)   return `${Math.floor(sec / 60)}м`;
  return `${sec}с`;
}

// ─── sub-components ──────────────────────────────────────────────────────────

function XPBar({ level, experience }: { level: number; experience: number }) {
  const needed = level * 100;
  const pct = Math.min(100, (experience / needed) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", whiteSpace: "nowrap" }}>Ур.{level}</span>
      <div style={{ flex: 1, height: 4, borderRadius: 4, background: "rgba(255,255,255,0.08)" }}>
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6 }}
          style={{ height: "100%", borderRadius: 4, background: "linear-gradient(90deg,#667eea,#764ba2)" }}
        />
      </div>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", whiteSpace: "nowrap" }}>{experience}/{needed}</span>
    </div>
  );
}

function ActionBtn({
  emoji, label, color, disabled, cdLabel, onClick,
}: {
  emoji: string; label: string; color: string;
  disabled: boolean; cdLabel: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={disabled ? {} : { scale: 0.9, rotate: [-4, 4, 0] }}
      onClick={disabled ? undefined : onClick}
      style={{
        flex: 1, padding: "14px 6px", borderRadius: 22,
        border: `1.5px solid ${disabled ? "rgba(255,255,255,0.06)" : color + "44"}`,
        background: disabled ? "rgba(255,255,255,0.03)" : `linear-gradient(135deg,${color}22,${color}0a)`,
        color: disabled ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.9)",
        fontWeight: 700, fontSize: 12, cursor: disabled ? "not-allowed" : "pointer",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
        backdropFilter: "blur(8px)",
        boxShadow: disabled ? "none" : `0 4px 20px ${color}22`,
        transition: "all 0.2s",
      }}
    >
      <span style={{ fontSize: 28, filter: disabled ? "grayscale(1) opacity(0.4)" : "none" }}>{emoji}</span>
      <span style={{ lineHeight: 1 }}>{disabled && cdLabel ? cdLabel : label}</span>
    </motion.button>
  );
}

function PartnerCard({ owners }: { owners: { user_id: number; is_creator: boolean; last_active_at: string | null }[] }) {
  const partner = owners.find(o => !o.is_creator) ?? owners[1];
  if (!partner) return null;

  const minsAgo = partner.last_active_at
    ? Math.floor((Date.now() - new Date(partner.last_active_at).getTime()) / 60_000)
    : null;

  const status =
    minsAgo === null ? "Не заходил"
    : minsAgo < 5   ? "🟢 Онлайн"
    : minsAgo < 60  ? `🟡 ${minsAgo} мин назад`
    : `⚪ ${Math.floor(minsAgo / 60)} ч назад`;

  return (
    <div style={{
      padding: "12px 16px", borderRadius: 18,
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.07)",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
        background: "linear-gradient(135deg,#667eea,#764ba2)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
      }}>👤</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>Партнёр</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)" }}>{status}</div>
      </div>
      <div style={{ marginLeft: "auto", fontSize: 18 }}>🤝</div>
    </div>
  );
}

function FloatAnim({ show, text }: { show: boolean; text: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: -48 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          style={{
            position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
            fontSize: 20, fontWeight: 800, color: "#ffd700",
            pointerEvents: "none", whiteSpace: "nowrap", zIndex: 20,
          }}
        >{text}</motion.div>
      )}
    </AnimatePresence>
  );
}

function InfoChip({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div style={{
      flex: 1, padding: "12px 8px", borderRadius: 18,
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.06)",
      textAlign: "center",
    }}>
      <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{value}</div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{label}</div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type GameScreen = null | "feed" | "play";

interface Props { petId: number }

export function HomePage({ petId }: Props) {
  const { pet, fetchPet, performAction, loading } = usePetStore();
  const [game, setGame] = useState<GameScreen>(null);
  const [floatText, setFloatText] = useState("");
  const [floatShow, setFloatShow] = useState(false);

  const refresh = useCallback(() => fetchPet(petId), [petId, fetchPet]);

  useEffect(() => { refresh(); }, [petId]);
  useEffect(() => {
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [refresh]);
  useEffect(() => {
    const h = () => { if (!document.hidden) refresh(); };
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  }, [refresh]);

  if (loading && !pet) return (
    <div className="splash"><div className="splash-paw">🐾</div></div>
  );
  if (!pet) return null;

  const mood    = pet.mood;
  const mm      = MOOD_META[mood] ?? MOOD_META.content;
  const evo     = Math.min(7, Math.floor(pet.level / 2) + 1);

  const getCd  = (a: string) => pet.cooldowns.find(c => c.action === a)?.available_at ?? null;
  const isCd   = (a: string) => { const v = getCd(a); return !!v && new Date(v).getTime() > Date.now(); };

  const showFloat = (text: string) => {
    setFloatText(text);
    setFloatShow(true);
    setTimeout(() => setFloatShow(false), 1200);
  };

  // "Покормить" opens mini-game
  const handleFeed = () => {
    if (isCd("feed")) return;
    setGame("feed");
  };

  // After drag-drop success → real API call
  const handleFedSuccess = async () => {
    setGame(null);
    await performAction("feed");
    showFloat("+30 🍖");
  };

  const handlePlay = () => {
    if (isCd("play")) return;
    setGame("play");
  };

  const handlePlaySuccess = async () => {
    setGame(null);
    await performAction("play");
    showFloat("+25 💚");
  };

  const handlePet = async () => {
    if (isCd("pet")) return;
    await performAction("pet");
    showFloat("+15 🤍");
  };

  const handleInvite = async () => {
    try {
      const inv = await createInvite(pet.id);
      tg?.showAlert?.(`Ссылка для друга:\n${inv.link}`);
    } catch {
      tg?.showAlert?.("Не удалось создать ссылку");
    }
  };

  return (
    <div style={{
      maxWidth: 420, margin: "0 auto",
      minHeight: "100vh",
      background: BG[mood] ?? BG.content,
      fontFamily: "'Inter', system-ui, sans-serif",
      position: "relative", overflow: "hidden",
      transition: "background 1.2s ease",
    }}>
      {/* ambient particles */}
      {[...Array(5)].map((_, i) => (
        <motion.div key={i} style={{
          position: "absolute", width: 3, height: 3, borderRadius: "50%",
          background: mm.color, opacity: 0.2,
          left: `${12 + i * 19}%`, top: `${20 + (i % 3) * 18}%`,
          pointerEvents: "none",
        }}
          animate={{ y: [-5, 5, -5], opacity: [0.1, 0.3, 0.1] }}
          transition={{ repeat: Infinity, duration: 2.5 + i * 0.4, delay: i * 0.3 }}
        />
      ))}

      <div style={{ position: "relative", zIndex: 1, padding: "16px 16px 40px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>
              {pet.name}
            </h2>
            <XPBar level={pet.level} experience={pet.experience} />
          </div>
          <StreakBadge streak={pet.streak} />
        </div>

        {/* Mood chip */}
        <motion.div
          animate={{ opacity: [0.75, 1, 0.75] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            background: `${mm.color}18`,
            border: `1px solid ${mm.color}44`,
            borderRadius: 20, padding: "4px 12px",
            fontSize: 12, fontWeight: 600, color: mm.color,
            marginBottom: 4,
          }}
        >
          {mm.emoji} {mm.label}
        </motion.div>

        {/* Avatar */}
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 4px", position: "relative" }}>
          <FloatAnim show={floatShow} text={floatText} />
          <PetSVG mood={mood} petType={pet.pet_type} evolution={evo} isReacting={floatShow} size={150} />
        </div>

        {/* Stats */}
        <motion.div style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 22, padding: "16px 18px",
          backdropFilter: "blur(12px)", marginBottom: 12,
        }}>
          <StatBar label="Голод"    value={pet.hunger}    color="#f4a261" icon="🍖" />
          <StatBar label="Счастье"  value={pet.happiness} color="#52c78e" icon="💚" />
          <StatBar label="Здоровье" value={pet.health}    color="#5ba4d4" icon="💙" />
        </motion.div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <ActionBtn emoji="🍖" label="Покормить" color="#f4a261"
            disabled={isCd("feed")} cdLabel={fmtCd(getCd("feed"))}
            onClick={handleFeed} />
          <ActionBtn emoji="🎾" label="Поиграть"  color="#52c78e"
            disabled={isCd("play")} cdLabel={fmtCd(getCd("play"))}
            onClick={handlePlay} />
          <ActionBtn emoji="🤍" label="Погладить" color="#c5b8d8"
            disabled={isCd("pet")} cdLabel={fmtCd(getCd("pet"))}
            onClick={handlePet} />
        </div>

        {/* Partner / Invite */}
        <div style={{ marginBottom: 12 }}>
          {pet.owners.length < 2 ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleInvite}
              style={{
                width: "100%", padding: "14px", borderRadius: 20,
                border: "1.5px dashed rgba(100,255,150,0.25)",
                background: "rgba(100,255,150,0.04)",
                color: "rgba(100,255,150,0.7)",
                fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}
            >
              👥 Пригласить друга растить вместе
            </motion.button>
          ) : (
            <PartnerCard owners={pet.owners} />
          )}
        </div>

        {/* Info chips */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <InfoChip icon="📅" label="Возраст"  value={`${pet.age_days}д`} />
          <InfoChip icon="⭐" label="Уровень"  value={pet.level} />
          <InfoChip icon="👑" label="Эволюция" value={`${evo}/7`} />
        </div>
      </div>

      {/* Mini-games */}
      <AnimatePresence>
        {game === "feed" && (
          <FeedMiniGame
            key="feed"
            petType={pet.pet_type}
            onSuccess={handleFedSuccess}
            onClose={() => setGame(null)}
          />
        )}
        {game === "play" && (
          <PlayMiniGame
            key="play"
            petType={pet.pet_type}
            onSuccess={handlePlaySuccess}
            onClose={() => setGame(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}