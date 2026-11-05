import { useState } from "react";
import { api, type Pet, type PetType } from "../api";
import { PetSprite } from "../components/PetSprite";
import { toast } from "../store/useToastStore";
import "./CreatePetPage.css";

const TYPES: { type: PetType; label: string }[] = [
  { type: "cat", label: "Кот" },
  { type: "dog", label: "Собака" },
  { type: "bunny", label: "Кролик" },
  { type: "bear", label: "Медведь" },
];

export function CreatePetPage({ onCreated }: { onCreated: (pet: Pet) => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<PetType>("cat");
  const [busy, setBusy] = useState(false);
  const valid = name.trim().length > 0;

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    try {
      onCreated(await api.createPet(name.trim(), type));
    } catch {
      toast("Не получилось завести питомца", "error");
      setBusy(false);
    }
  };

  return (
    <form className="create" onSubmit={create}>
      <div className="create__intro">
        <h1>Заведи питомца</h1>
        <p>Потом позовёшь друга — растить его будете вдвоём</p>
      </div>

      <div className="create__preview">
        <PetSprite type={type} mood="happy" size="min(168px, 42vw)" />
        <div className="create__shadow" />
      </div>

      <div className="create__types" role="radiogroup" aria-label="Кто это будет">
        {TYPES.map((t) => (
          <button
            key={t.type}
            type="button"
            role="radio"
            aria-checked={type === t.type}
            className={type === t.type ? "is-active" : ""}
            onClick={() => setType(t.type)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <input
        className="create__input"
        placeholder="Имя"
        value={name}
        maxLength={32}
        onChange={(e) => setName(e.target.value)}
        autoComplete="off"
      />

      <button type="submit" className="btn btn--primary btn--block" disabled={!valid || busy}>
        {busy ? "Заводим" : "Завести питомца"}
      </button>
    </form>
  );
}
