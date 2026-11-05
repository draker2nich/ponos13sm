import { useCallback, useEffect, useState } from "react";
import { api, type Pet } from "./api";
import { Toasts } from "./components/Toasts";
import { initTelegram, startParam } from "./lib/telegram";
import { CreatePetPage } from "./pages/CreatePetPage";
import { HomePage } from "./pages/HomePage";
import { usePetStore } from "./store/usePetStore";
import { toast } from "./store/useToastStore";

type Screen = { kind: "loading" } | { kind: "error" } | { kind: "create" } | { kind: "home"; petId: number };

/** Invite token from the bot button (?invite=) or a t.me/<bot>/app?startapp=inv_ link */
function inviteToken(params: URLSearchParams): string | null {
  const start = startParam();
  return params.get("invite") ?? (start.startsWith("inv_") ? start.slice(4) : null);
}

async function resolveStartPet(): Promise<number | null> {
  const params = new URLSearchParams(window.location.search);

  const token = inviteToken(params);
  if (token) {
    try {
      return (await api.acceptInvite(token)).pet_id;
    } catch {
      toast("Приглашение уже использовано или устарело", "error");
    }
  }

  const pets = await api.myPets();
  const wanted = Number(params.get("pet_id"));
  return (pets.find((p) => p.id === wanted) ?? pets[0])?.id ?? null;
}

export function App() {
  const [screen, setScreen] = useState<Screen>({ kind: "loading" });
  const setPet = usePetStore((s) => s.setPet);

  useEffect(() => {
    initTelegram("#f6f1e8");
    resolveStartPet().then(
      (petId) => setScreen(petId ? { kind: "home", petId } : { kind: "create" }),
      () => setScreen({ kind: "error" }),
    );
  }, []);

  const onCreated = useCallback(
    (pet: Pet) => {
      setPet(pet);
      setScreen({ kind: "home", petId: pet.id });
    },
    [setPet],
  );
  const onPetGone = useCallback(() => setScreen({ kind: "create" }), []);

  return (
    <>
      <Toasts />
      {screen.kind === "loading" && <div className="splash">Загрузка</div>}
      {screen.kind === "error" && (
        <div className="splash">Не получилось связаться с сервером. Закрой и открой приложение ещё раз</div>
      )}
      {screen.kind === "create" && <CreatePetPage onCreated={onCreated} />}
      {screen.kind === "home" && <HomePage petId={screen.petId} onPetGone={onPetGone} />}
    </>
  );
}
