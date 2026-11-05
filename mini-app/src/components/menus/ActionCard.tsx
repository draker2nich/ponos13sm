import type { ActionType, Pet } from "../../api";
import { useCountdown } from "../../hooks/useCountdown";
import { formatDuration } from "../../lib/format";
import { cooldownOf } from "../../store/usePetStore";
import { useAct } from "../../hooks/useAct";

interface Props {
  pet: Pet;
  action: ActionType;
  title: string;
  reward: string;
  button: string;
}

/** A free action with its own cooldown, e.g. "feed once every 4 hours" */
export function ActionCard({ pet, action, title, reward, button }: Props) {
  const left = useCountdown(cooldownOf(pet, action));
  const act = useAct();

  return (
    <div className="menu-card">
      <div className="menu-card__text">
        <span className="menu-card__title">{title}</span>
        <span className="menu-card__sub num">{left ? `Снова через ${formatDuration(left)}` : reward}</span>
      </div>
      <button className="btn btn--primary" disabled={left > 0 || pet.is_sleeping} onClick={() => act(action)}>
        {button}
      </button>
    </div>
  );
}
