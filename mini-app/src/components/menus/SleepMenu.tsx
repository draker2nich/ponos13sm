import { useState } from "react";
import { Lamp, LampFloor } from "lucide-react";
import { api, type Pet } from "../../api";
import { haptic } from "../../lib/telegram";
import { usePetStore } from "../../store/usePetStore";
import { toast } from "../../store/useToastStore";

export function SleepMenu({ pet }: { pet: Pet }) {
  const setPet = usePetStore((s) => s.setPet);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    try {
      setPet(await api.toggleSleep(pet.id));
      haptic("light");
    } catch {
      toast("Не получилось, попробуй ещё раз", "error");
    } finally {
      setBusy(false);
    }
  };

  const asleep = pet.is_sleeping;
  return (
    <button className={`lamp ${asleep ? "lamp--light" : "lamp--dark"}`} onClick={toggle} disabled={busy}>
      {asleep ? <Lamp size={32} strokeWidth={1.5} /> : <LampFloor size={32} strokeWidth={1.5} />}
      {asleep ? "Включить свет" : "Выключить свет"}
      <small>{asleep ? `${pet.name} спит, силы тратятся вчетверо медленнее` : "Во сне питомец меньше голодает"}</small>
    </button>
  );
}
