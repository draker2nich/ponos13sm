import { useState } from "react";
import { Share2 } from "lucide-react";
import { api, type Pet } from "../../api";
import { days, timeAgo } from "../../lib/format";
import { shareLink } from "../../lib/telegram";
import { toast } from "../../store/useToastStore";
import { PresenceDots } from "../PresenceDots";

export function PartnerMenu({ pet }: { pet: Pet }) {
  const partner = pet.owners.find((o) => !o.is_me);
  const [busy, setBusy] = useState(false);

  const invite = async () => {
    setBusy(true);
    try {
      const { link } = await api.createInvite(pet.id);
      shareLink(link, `Давай растить ${pet.name} вместе`);
    } catch {
      toast("Не получилось создать приглашение", "error");
    } finally {
      setBusy(false);
    }
  };

  if (!partner) {
    return (
      <>
        <p className="menu-card__sub" style={{ fontSize: 15, color: "var(--text-2)" }}>
          Питомца растят вдвоём. Отправь другу приглашение — ссылка действует трое суток. Когда вы оба заходите
          в один день, растёт общий стрик.
        </p>
        <button className="btn btn--primary btn--block" onClick={invite} disabled={busy}>
          <Share2 size={18} strokeWidth={1.75} />
          Пригласить друга
        </button>
      </>
    );
  }

  return (
    <>
      <div className="menu-card">
        <div className="menu-card__text">
          <span className="menu-card__title">{partner.name ?? "Партнёр"}</span>
          <span className="menu-card__sub">
            {partner.last_active_at ? `Заходил ${timeAgo(partner.last_active_at)}` : "Ещё не заходил"}
          </span>
        </div>
      </div>
      <div className="menu-card">
        <div className="menu-card__text">
          <span className="menu-card__title num">Стрик {days(pet.streak)}</span>
          <span className="menu-card__sub">Точка заполняется, когда каждый из вас заглянул сегодня</span>
        </div>
        <PresenceDots owners={pet.owners} />
      </div>
    </>
  );
}
