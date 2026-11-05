import { Coins, Flame, HeartPulse, Smile, Snowflake, Utensils } from "lucide-react";
import type { Pet } from "../api";
import { useCoinStore } from "../store/useCoinStore";
import { PresenceDots } from "./PresenceDots";
import { StatusRing } from "./StatusRing";
import "./PetHeader.css";

export function PetHeader({ pet }: { pet: Pet }) {
  const coins = useCoinStore((s) => s.coins);
  const xp = Math.min(100, (pet.experience / (pet.level * 100)) * 100);

  return (
    <header className="hdr">
      <div className="hdr__card hdr__id">
        <div className="hdr__name">{pet.name}</div>
        <div className="hdr__meta">
          <span className="num">Ур. {pet.level}</span>
          <span className="hdr__xp" aria-label={`Опыт ${pet.experience} из ${pet.level * 100}`}>
            <span style={{ width: `${xp}%` }} />
          </span>
        </div>
        <div className="hdr__streak" title="Общий стрик: дни, когда заходили вы оба">
          <Flame size={14} strokeWidth={1.75} />
          <span className="num">{pet.streak}</span>
          <PresenceDots owners={pet.owners} />
          {pet.streak_freezes > 0 && (
            <span className="hdr__freeze num" title="Заморозки стрика">
              <Snowflake size={12} strokeWidth={1.75} />
              {pet.streak_freezes}
            </span>
          )}
        </div>
      </div>

      <div className="hdr__right">
        <div className="hdr__card hdr__rings">
          <StatusRing value={pet.hunger} icon={Utensils} label="Сытость" />
          <StatusRing value={pet.happiness} icon={Smile} label="Настроение" />
          <StatusRing value={pet.health} icon={HeartPulse} label="Здоровье" />
        </div>
        <div className="hdr__coins num" aria-label="Монеты">
          <Coins size={14} strokeWidth={1.75} />
          {coins}
        </div>
      </div>
    </header>
  );
}
