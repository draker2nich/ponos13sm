// src/pages/HomePage.tsx
import { useEffect, useCallback } from "react";
import { usePetStore } from "../store/usePetStore";
import { PetAvatar } from "../components/PetAvatar";
import { StatBar } from "../components/StatBar";
import { ActionButton } from "../components/ActionButton";
import { FeedList } from "../components/FeedList";
import { StreakBadge } from "../components/StreakBadge";
import { createInvite } from "../api/pets";

const tg = window.Telegram?.WebApp;

const MOOD_LABELS: Record<string, string> = {
  happy:   "😄 Счастлив",
  content: "😊 Доволен",
  sad:     "😔 Грустит",
  hungry:  "😋 Голоден",
  sleepy:  "😴 Спит",
};

function MoodLabel({ mood }: { mood: string }) {
  return (
    <span style={{ fontSize: 13, color: "#888", fontWeight: 500 }}>
      {MOOD_LABELS[mood] ?? mood}
    </span>
  );
}

function PartnerStatus({ owners }: {
  owners: { user_id: number; last_active_at: string | null; is_creator: boolean }[]
}) {
  const partner = owners.find((o) => !o.is_creator) ?? owners[1];
  if (!partner) return null;

  const lastActive = partner.last_active_at
    ? Math.floor((Date.now() - new Date(partner.last_active_at).getTime()) / 60000)
    : null;

  const statusText =
    lastActive === null  ? "Ещё не заходил"
    : lastActive < 5    ? "🟢 Только что был"
    : lastActive < 60   ? `🟡 ${lastActive} мин назад`
    : `⚪ ${Math.floor(lastActive / 60)} ч назад`;

  return (
    <div style={{
      padding: "12px 16px", borderRadius: 16,
      background: "#f5f5f5", fontSize: 13, color: "#666",
      display: "flex", justifyContent: "space-between",
    }}>
      <span>👤 Партнёр</span>
      <span>{statusText}</span>
    </div>
  );
}

function Loader() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <span style={{ fontSize: 40 }}>🐾</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page:        { maxWidth: 420, margin: "0 auto", padding: "20px 16px 40px", display: "flex", flexDirection: "column", gap: 16, minHeight: "100vh", background: "#fafafa", fontFamily: "'Inter', system-ui, sans-serif" },
  header:      { display: "flex", justifyContent: "space-between", alignItems: "center" },
  petName:     { margin: 0, fontSize: 22, fontWeight: 700, color: "#333" },
  levelBadge:  { fontSize: 12, color: "#aaa" },
  avatarWrap:  { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "24px 0" },
  card:        { background: "#fff", borderRadius: 20, padding: "16px 18px", boxShadow: "0 2px 16px #0000000a" },
  actions:     { display: "flex", gap: 10 },
  inviteBtn:   { width: "100%", padding: "14px", borderRadius: 18, border: "2px dashed #c5e8c5", background: "transparent", color: "#5a9e5a", fontWeight: 600, fontSize: 14, cursor: "pointer" },
  sectionTitle:{ margin: "0 0 12px", fontSize: 14, color: "#888", fontWeight: 600 },
};

interface Props { petId: number }

export function HomePage({ petId }: Props) {
  const { pet, fetchPet, loading } = usePetStore();

  const refresh = useCallback(() => fetchPet(petId), [petId]);

  useEffect(() => { refresh(); }, [petId]);

  // Polling каждые 60 секунд
  useEffect(() => {
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  // ДОБАВЛЕНО: обновление при возврате в приложение (вкладка снова активна)
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [refresh]);

  if (loading && !pet) return <Loader />;
  if (!pet) return null;

  const handleInvite = async () => {
    try {
      const inv = await createInvite(pet.id);
      tg?.showAlert?.(`Ссылка: ${inv.link}`);
    } catch {
      tg?.showAlert?.("Не удалось создать ссылку");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.petName}>{pet.name}</h2>
          <span style={styles.levelBadge}>Ур. {pet.level} · {pet.age_days} дн.</span>
        </div>
        <StreakBadge streak={pet.streak} />
      </div>

      <div style={styles.avatarWrap}>
        <PetAvatar mood={pet.mood} petType={pet.pet_type} size={130} />
        <MoodLabel mood={pet.mood} />
      </div>

      <div style={styles.card}>
        <StatBar label="Голод"    value={pet.hunger}    color="#f4c97a" icon="🍎" />
        <StatBar label="Счастье"  value={pet.happiness} color="#a8d8a8" icon="😊" />
        <StatBar label="Здоровье" value={pet.health}    color="#b8c9e1" icon="💙" />
      </div>

      <div style={styles.actions}>
        <ActionButton action="feed" />
        <ActionButton action="play" />
        <ActionButton action="pet"  />
      </div>

      {pet.owners.length < 2
        ? <button onClick={handleInvite} style={styles.inviteBtn}>👥 Пригласить друга растить вместе</button>
        : <PartnerStatus owners={pet.owners} />
      }

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>Последние действия</h3>
        <FeedList />
      </div>
    </div>
  );
}