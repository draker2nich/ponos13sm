import { useState } from "react";
import { Trash2 } from "lucide-react";
import { api, type Pet } from "../../api";
import { clampPercent, days } from "../../lib/format";
import { confirm } from "../../lib/telegram";
import { toast } from "../../store/useToastStore";

const LOW = 25;

export function SettingsMenu({ pet, onDeleted }: { pet: Pet; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  const isCreator = pet.owners.some((o) => o.is_me && o.is_creator);

  const remove = async () => {
    if (!(await confirm(`Удалить ${pet.name}? Это нельзя отменить.`))) return;
    setBusy(true);
    try {
      await api.deletePet(pet.id);
      onDeleted();
    } catch {
      toast("Не получилось удалить", "error");
      setBusy(false);
    }
  };

  return (
    <>
      <dl className="facts">
        <Fact label="Уровень" value={pet.level} />
        <Fact label="Опыт" value={`${pet.experience} из ${pet.level * 100}`} />
        <Fact label="Возраст" value={days(pet.age_days)} />
        <Fact label="Стрик" value={days(pet.streak)} />
      </dl>

      <div style={{ display: "grid", gap: 12 }}>
        <StatRow label="Сытость" value={pet.hunger} />
        <StatRow label="Настроение" value={pet.happiness} />
        <StatRow label="Здоровье" value={pet.health} />
      </div>

      {isCreator && (
        <button className="btn btn--danger btn--block" onClick={remove} disabled={busy}>
          <Trash2 size={18} strokeWidth={1.75} />
          Удалить питомца
        </button>
      )}
    </>
  );
}

function Fact({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className="num">{value}</dd>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  const v = clampPercent(value);
  return (
    <div className={`stat-row${v < LOW ? " stat-row--low" : ""}`}>
      <div className="stat-row__head">
        <span>{label}</span>
        <span className="num">{Math.round(v)}</span>
      </div>
      <div className="stat-row__bar">
        <span style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}
