import { useState } from "react";
import { createPet } from "../api/pets";
import { usePetStore } from "../store/usePetStore";
import type { PetType } from "../api/types";

const PET_OPTIONS: { type: PetType; emoji: string; label: string }[] = [
  { type: "cat",   emoji: "🐱", label: "Кот"     },
  { type: "dog",   emoji: "🐶", label: "Собака"  },
  { type: "bunny", emoji: "🐰", label: "Кролик"  },
  { type: "bear",  emoji: "🐻", label: "Медведь" },
];

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 420, margin: "0 auto", padding: "40px 16px",
    display: "flex", flexDirection: "column", gap: 24,
    minHeight: "100vh", background: "#fafafa",
    fontFamily: "'Inter', system-ui, sans-serif",
    justifyContent: "center",
  },
  input: {
    width: "100%", padding: "14px 16px", borderRadius: 16,
    border: "1.5px solid #e0e0e0", fontSize: 16, outline: "none",
    boxSizing: "border-box", background: "#fafafa",
  },
  typeBtn: {
    padding: "12px 14px", borderRadius: 16, border: "none",
    cursor: "pointer", display: "flex", flexDirection: "column",
    alignItems: "center", gap: 4, transition: "all 0.15s", minWidth: 68,
  },
  createBtn: {
    width: "100%", padding: "14px", borderRadius: 18,
    border: "none", background: "#a8d8a8",
    color: "#fff", fontWeight: 600, fontSize: 16, cursor: "pointer",
  },
};

interface Props { onCreated: (petId: number) => void }

export function CreatePetPage({ onCreated }: Props) {
  const [name, setName]       = useState("");
  const [type, setType]       = useState<PetType>("cat");
  const [loading, setLoading] = useState(false);
  // ИСПРАВЛЕНО: убрана явная типизация через any
  const setPet = usePetStore((s) => s.setPet);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const pet = await createPet(name.trim(), type);
      setPet(pet);
      onCreated(pet.id);
    } catch {
      window.Telegram?.WebApp?.showAlert?.("Не удалось создать питомца 😔");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <h2 style={{ textAlign: "center", color: "#444", margin: 0 }}>
        Заведи питомца 🐾
      </h2>

      <input
        placeholder="Имя питомца"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={32}
        style={styles.input}
      />

      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        {PET_OPTIONS.map((o) => (
          <button
            key={o.type}
            onClick={() => setType(o.type)}
            style={{
              ...styles.typeBtn,
              background: type === o.type ? "#a8d8a8" : "#f5f5f5",
              boxShadow: type === o.type ? "0 4px 12px #a8d8a833" : "none",
            }}
          >
            <span style={{ fontSize: 28 }}>{o.emoji}</span>
            <span style={{ fontSize: 12 }}>{o.label}</span>
          </button>
        ))}
      </div>

      <button
        onClick={handleCreate}
        disabled={!name.trim() || loading}
        style={{ ...styles.createBtn, opacity: !name.trim() || loading ? 0.5 : 1 }}
      >
        {loading ? "Создаём..." : "Создать питомца 🐾"}
      </button>
    </div>
  );
}