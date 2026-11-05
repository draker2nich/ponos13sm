import { useState } from "react";
import { Share2 } from "lucide-react";
import { api, type Pet } from "../../api";
import { describe } from "../../lib/activity";
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
        <p className="menu-text">
          Питомца растят вдвоём. Отправь другу приглашение — ссылка действует трое суток. Когда вы оба заходите
          в один день, растёт общий стрик, а на 3, 7, 14 и 30 день вы оба получаете монеты.
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
          <span className="menu-card__title num">Стрик {days(pet.streak)}</span>
          <span className="menu-card__sub">
            {partner.name ?? "Партнёр"} {partner.last_active_at ? `заходил(а) ${timeAgo(partner.last_active_at)}` : "ещё не заходил(а)"}
          </span>
        </div>
        <PresenceDots owners={pet.owners} />
      </div>

      {pet.recent.length > 0 && (
        <section className="feed" aria-label="Последние действия">
          <h3 className="feed__title">Последние действия</h3>
          <ul>
            {pet.recent.map((e, i) => (
              <li key={`${e.performed_at}-${i}`} className="feed__row">
                <span>{describe(e, pet)}</span>
                <span className="feed__time num">{timeAgo(e.performed_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
