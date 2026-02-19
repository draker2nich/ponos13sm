import { useEffect, useState } from "react";
import { HomePage } from "./pages/HomePage";
import { CreatePetPage } from "./pages/CreatePetPage";
import { acceptInvite } from "./api/pets";

const tg = window.Telegram?.WebApp;

function Loader() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <span style={{ fontSize: 40 }}>🐾</span>
    </div>
  );
}

export default function App() {
  const [petId, setPetId] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    tg?.ready();
    tg?.expand();
    tg?.setHeaderColor?.("#ffffff");

    const params = new URLSearchParams(window.location.search);
    const urlPetId = params.get("pet_id");
    const invToken = tg?.initDataUnsafe?.start_param?.replace("inv_", "");

    const init = async () => {
      if (invToken) {
        try {
          const res = await acceptInvite(invToken);
          setPetId(res.pet_id);
        } catch {
          if (urlPetId) setPetId(Number(urlPetId));
        }
      } else if (urlPetId) {
        setPetId(Number(urlPetId));
      }
      setReady(true);
    };

    init();
  }, []);

  if (!ready) return <Loader />;
  if (!petId)  return <CreatePetPage onCreated={setPetId} />;
  return <HomePage petId={petId} />;
}

