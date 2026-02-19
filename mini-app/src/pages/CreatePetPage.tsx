// mini-app/src/pages/CreatePetPage.tsx
import { useState } from "react";
import { motion } from "framer-motion";
import { createPet } from "../api/pets";
import { usePetStore } from "../store/usePetStore";
import { PetSVG } from "../components/PetSVG";
import type { PetType } from "../api/types";

const PET_OPTIONS: { type: PetType; label: string }[] = [
  { type: "cat",   label: "Кот"     },
  { type: "dog",   label: "Собака"  },
  { type: "bunny", label: "Кролик"  },
  { type: "bear",  label: "Медведь" },
];

interface Props { onCreated: (petId: number) => void }

export function CreatePetPage({ onCreated }: Props) {
  const [name,    setName]    = useState("");
  const [type,    setType]    = useState<PetType>("cat");
  const [loading, setLoading] = useState(false);
  const setPet = usePetStore(s => s.setPet);

  const handleCreate = async () => {
    if (!name.trim() || loading) return;
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
    <div style={{
      maxWidth: 420, margin: "0 auto",
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 50% 110%, #1a1a2e, #06060f)",
      fontFamily: "'Inter', system-ui, sans-serif",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 24, padding: "32px 20px",
    }}>
      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        style={{ color: "#fff", fontSize: 24, fontWeight: 800, margin: 0, textAlign: "center" }}
      >
        Заведи питомца 🐾
      </motion.h2>

      {/* Preview */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <PetSVG mood="happy" petType={type} size={140} />
      </motion.div>

      {/* Type selector */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        style={{ display: "flex", gap: 10 }}
      >
        {PET_OPTIONS.map(o => (
          <motion.button
            key={o.type}
            whileTap={{ scale: 0.93 }}
            onClick={() => setType(o.type)}
            style={{
              padding: "10px 14px", borderRadius: 18,
              border: `1.5px solid ${type === o.type ? "#667eea" : "rgba(255,255,255,0.08)"}`,
              background: type === o.type ? "rgba(102,126,234,0.15)" : "rgba(255,255,255,0.03)",
              color: type === o.type ? "#a0b4ff" : "rgba(255,255,255,0.4)",
              fontWeight: 600, fontSize: 12,
              cursor: "pointer", minWidth: 64,
              transition: "all 0.15s",
            }}
          >
            {o.label}
          </motion.button>
        ))}
      </motion.div>

      {/* Name input */}
      <motion.input
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
        placeholder="Имя питомца"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
        maxLength={32}
        style={{
          width: "100%", padding: "14px 18px",
          borderRadius: 18,
          border: "1.5px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.05)",
          color: "#fff", fontSize: 16, outline: "none",
          caretColor: "#667eea",
        }}
      />

      {/* Create button */}
      <motion.button
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleCreate}
        disabled={!name.trim() || loading}
        style={{
          width: "100%", padding: "16px",
          borderRadius: 20, border: "none",
          background: !name.trim() || loading
            ? "rgba(255,255,255,0.06)"
            : "linear-gradient(135deg,#667eea,#764ba2)",
          color: !name.trim() || loading ? "rgba(255,255,255,0.25)" : "#fff",
          fontWeight: 700, fontSize: 16,
          cursor: !name.trim() || loading ? "not-allowed" : "pointer",
          transition: "all 0.2s",
        }}
      >
        {loading ? "Создаём..." : "Создать питомца 🐾"}
      </motion.button>
    </div>
  );
}