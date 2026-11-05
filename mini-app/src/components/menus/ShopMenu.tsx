import { useState } from "react";
import { Coins, Snowflake } from "lucide-react";
import { api, ApiError, type Pet } from "../../api";
import { useCatalog } from "../../hooks/useCatalog";
import { haptic } from "../../lib/telegram";
import { useCoinStore } from "../../store/useCoinStore";
import { usePetStore } from "../../store/usePetStore";
import { toast } from "../../store/useToastStore";

export function ShopMenu({ pet }: { pet: Pet }) {
  const catalog = useCatalog();
  const coins = useCoinStore((s) => s.coins);
  const setCoins = useCoinStore((s) => s.setCoins);
  const setPet = usePetStore((s) => s.setPet);
  const [busy, setBusy] = useState(false);

  if (!catalog) return null;
  const { cost, max } = catalog.streak_freeze;
  const full = pet.streak_freezes >= max;

  const buy = async () => {
    setBusy(true);
    try {
      const res = await api.buyStreakFreeze(pet.id);
      setCoins(res.coins);
      setPet(res.pet);
      haptic("success");
    } catch (e) {
      haptic("error");
      toast(e instanceof ApiError && e.status === 402 ? "Не хватает монет" : "Не получилось купить", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="menu-card">
        <Snowflake size={28} strokeWidth={1.5} color="var(--text-2)" />
        <div className="menu-card__text">
          <span className="menu-card__title">Заморозка стрика</span>
          <span className="menu-card__sub num">
            Сохранит общий стрик, если вы пропустите день · есть {pet.streak_freezes} из {max}
          </span>
        </div>
        <button className="btn btn--secondary" onClick={buy} disabled={busy || full || coins < cost}>
          <Coins size={16} strokeWidth={1.75} color="var(--coin)" />
          <span className="num">{cost}</span>
        </button>
      </div>
      <p className="menu-card__sub">Аксессуары для питомца появятся здесь позже</p>
    </>
  );
}
