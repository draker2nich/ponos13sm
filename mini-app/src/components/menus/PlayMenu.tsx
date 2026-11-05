import { ChevronRight } from "lucide-react";
import type { Pet } from "../../api";
import { useCoinStore } from "../../store/useCoinStore";
import { ActionCard } from "./ActionCard";

export function PlayMenu({ pet, onOpenGame }: { pet: Pet; onOpenGame: () => void }) {
  const best = useCoinStore((s) => s.bestScore);
  return (
    <>
      <ActionCard pet={pet} action="play" title="Поиграть с мячиком" reward="+25 к настроению" button="Играть" />
      <button className="menu-card" onClick={onOpenGame}>
        <BlocksMark />
        <span className="menu-card__text">
          <span className="menu-card__title">Block Blast</span>
          <span className="menu-card__sub num">Монета за каждые 2 линии{best ? ` · рекорд ${best}` : ""}</span>
        </span>
        <ChevronRight size={18} strokeWidth={1.75} color="var(--text-3)" />
      </button>
    </>
  );
}

function BlocksMark() {
  const filled = [1, 1, 0, 0, 1, 0, 0, 1, 1];
  return (
    <span className="blocks-mark" aria-hidden>
      {filled.map((f, i) => (
        <span key={i} style={{ background: f ? "var(--accent)" : "var(--raised)" }} />
      ))}
    </span>
  );
}
