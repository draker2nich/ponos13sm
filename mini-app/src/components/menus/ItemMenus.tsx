import { useState } from "react";
import { Coins } from "lucide-react";
import { api, ApiError, type CatalogItem, type ItemKind, type Pet } from "../../api";
import { useCatalog } from "../../hooks/useCatalog";
import { celebrateStreak } from "../../lib/activity";
import { haptic } from "../../lib/telegram";
import { useCoinStore } from "../../store/useCoinStore";
import { usePetStore } from "../../store/usePetStore";
import { toast } from "../../store/useToastStore";
import { ActionCard } from "./ActionCard";

export function FeedMenu({ pet }: { pet: Pet }) {
  return (
    <>
      <ActionCard pet={pet} action="feed" title="Обычная миска" reward="Бесплатно · +30 к сытости" button="Покормить" />
      <ItemGrid pet={pet} kind="food" />
    </>
  );
}

export function WashMenu({ pet }: { pet: Pet }) {
  return <ItemGrid pet={pet} kind="wash" />;
}

const EFFECT: Record<ItemKind, { stat: keyof CatalogItem; label: string }> = {
  food: { stat: "hunger", label: "сытость" },
  wash: { stat: "health", label: "здоровье" },
};

function ItemGrid({ pet, kind }: { pet: Pet; kind: ItemKind }) {
  const catalog = useCatalog();
  const coins = useCoinStore((s) => s.coins);
  const setCoins = useCoinStore((s) => s.setCoins);
  const setPet = usePetStore((s) => s.setPet);
  const [busy, setBusy] = useState(false);

  const buy = async (item: CatalogItem) => {
    if (busy) return;
    setBusy(true);
    setCoins(coins - item.cost);
    try {
      const res = await api.buy(pet.id, kind, item.id);
      setCoins(res.coins);
      setPet(res.pet);
      haptic("success");
      celebrateStreak(res.pet.streak, res.streak_reward);
    } catch (e) {
      setCoins(coins);
      haptic("error");
      toast(e instanceof ApiError && e.status === 402 ? "Не хватает монет" : "Не получилось купить", "error");
    } finally {
      setBusy(false);
    }
  };

  if (!catalog) return null;
  const { stat, label } = EFFECT[kind];

  return (
    <div className="items">
      {catalog[kind].map((item) => (
        <button key={item.id} className="item" disabled={coins < item.cost} onClick={() => buy(item)} aria-label={`${item.cost} монет, +${item[stat]} ${label}`}>
          <span className="item__art">{item.emoji}</span>
          <span className="item__price num">
            <Coins size={12} strokeWidth={2} />
            {item.cost}
          </span>
          <span className="item__effect num">
            +{item[stat]} {label}
          </span>
        </button>
      ))}
    </div>
  );
}
