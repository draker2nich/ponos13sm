// mini-app/src/App.tsx
import { useEffect, useState } from "react";
import { HomePage } from "./pages/HomePage";
import { CreatePetPage } from "./pages/CreatePetPage";
import { acceptInvite } from "./api/pets";
import "./index.css";

const tg = window.Telegram?.WebApp;

function Loader() {
  return (
    <div className="splash">
      <div className="splash-paw">🐾</div>
      <div className="splash-text">Загрузка...</div>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="splash">
      <div className="splash-paw">😔</div>
      <div className="splash-text">{message}</div>
    </div>
  );
}

export default function App() {
  const [petId, setPetId] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    tg?.ready();
    tg?.expand();
    tg?.setHeaderColor?.("#06060f");

    const params     = new URLSearchParams(window.location.search);
    const urlPetId   = params.get("pet_id");
    const startParam = tg?.initDataUnsafe?.start_param ?? "";
    const invToken   = startParam.startsWith("inv_") ? startParam.slice(4) : null;

    const init = async () => {
      try {
        if (invToken) {
          try {
            const res = await acceptInvite(invToken);
            setPetId(res.pet_id);
          } catch {
            if (urlPetId && Number(urlPetId) > 0) setPetId(Number(urlPetId));
          }
        } else if (urlPetId && Number(urlPetId) > 0) {
          setPetId(Number(urlPetId));
        }
      } catch {
        setError("Что-то пошло не так. Попробуй перезапустить.");
      } finally {
        setReady(true);
      }
    };

    init();
  }, []);

  if (!ready) return <Loader />;
  if (error)  return <ErrorScreen message={error} />;
  if (!petId) return <CreatePetPage onCreated={setPetId} />;
  return <HomePage petId={petId} />;
}