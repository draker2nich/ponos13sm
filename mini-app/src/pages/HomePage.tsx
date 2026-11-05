import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../api";
import { Dock } from "../components/Dock";
import { PetHeader } from "../components/PetHeader";
import { PetStage } from "../components/PetStage";
import { BlockBlast } from "../game/BlockBlast";
import { useAct } from "../hooks/useAct";
import { formatDuration, secondsUntil } from "../lib/format";
import { useCoinStore } from "../store/useCoinStore";
import { useFxStore } from "../store/useFxStore";
import { useMenuStore } from "../store/useMenuStore";
import { cooldownOf, usePetStore } from "../store/usePetStore";
import { toast } from "../store/useToastStore";
import "./HomePage.css";

const STROKE_TO_PET_MS = 2000;
const REFRESH_MS = 60_000;

interface Props {
  petId: number;
  onPetGone: () => void;
}

export function HomePage({ petId, onPetGone }: Props) {
  const pet = usePetStore((s) => s.pet);
  const load = usePetStore((s) => s.load);
  const loadCoins = useCoinStore((s) => s.load);
  const { open, setOpen } = useMenuStore();
  const burst = useFxStore((s) => s.burst);
  const act = useAct();

  const [gameOpen, setGameOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const stroking = useStroking(() => {
    const cd = pet && cooldownOf(pet, "pet");
    if (cd && secondsUntil(cd)) toast(`Погладить снова можно через ${formatDuration(secondsUntil(cd))}`);
    else void act("pet");
  });
  const petRef = useRef<HTMLDivElement>(null);

  // Keep stats fresh: on open, every minute, and when the app comes back to the foreground
  useEffect(() => {
    const refresh = () =>
      load(petId).then(
        () => setFailed(false),
        (e) => (e instanceof ApiError && e.status === 404 ? onPetGone() : setFailed(true)),
      );
    const onVisible = () => !document.hidden && refresh();
    refresh();
    loadCoins();
    const timer = window.setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [petId, load, loadCoins, onPetGone]);

  if (!pet) return <div className="splash">{failed ? "Нет связи с сервером. Попробуй открыть заново" : "Загрузка"}</div>;

  return (
    <main className={`home${pet.is_sleeping ? " home--night" : ""}`}>
      <div className="home__night" aria-hidden />
      <PetHeader pet={pet} />
      <PetStage
        pet={pet}
        menuOpen={open !== null}
        stroking={stroking.active}
        burst={burst}
        petRef={petRef}
        onInvite={() => setOpen("partner")}
      />
      <Dock
        pet={pet}
        petRef={petRef}
        stroking={stroking.active}
        onStroking={stroking.set}
        onOpenGame={() => setGameOpen(true)}
        onDeleted={() => {
          setOpen(null);
          onPetGone();
        }}
      />
      {gameOpen && <BlockBlast onClose={() => setGameOpen(false)} />}
    </main>
  );
}

/** Tracks stroking with the glove and fires `onPet` once it lasts long enough */
function useStroking(onPet: () => void) {
  const [active, setActive] = useState(false);
  const since = useRef<number | null>(null);
  const fired = useRef(false);
  const onPetRef = useRef(onPet);
  onPetRef.current = onPet;

  const set = useCallback((v: boolean) => {
    setActive(v);
    if (!v) {
      since.current = null;
      fired.current = false;
    } else if (since.current === null) {
      since.current = Date.now();
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => {
      if (since.current && !fired.current && Date.now() - since.current >= STROKE_TO_PET_MS) {
        fired.current = true;
        onPetRef.current();
      }
    }, 200);
    return () => window.clearInterval(timer);
  }, [active]);

  return { active, set };
}
