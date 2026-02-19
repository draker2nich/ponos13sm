import { useEffect, useState } from "react";
import { HomePage } from "./pages/HomePage";
import { CreatePetPage } from "./pages/CreatePetPage";
import { acceptInvite } from "./api/pets";

const tg = window.Telegram?.WebApp;

function Loader() {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      height: "100vh", gap: 12,
    }}>
      <span style={{ fontSize: 40 }}>🐾</span>
      <span style={{ fontSize: 14, color: "#aaa" }}>Загрузка...</span>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      height: "100vh", gap: 12, padding: 24,
    }}>
      <span style={{ fontSize: 40 }}>😔</span>
      <span style={{ fontSize: 14, color: "#888", textAlign: "center" }}>{message}</span>
    </div>
  );
}

export default function App() {
  const [petId, setPetId] = useState<number | null>(null);
  const [ready, setReady]   = useState(false);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    tg?.ready();
    tg?.expand();
    tg?.setHeaderColor?.("#ffffff");

    const params     = new URLSearchParams(window.location.search);
    const urlPetId   = params.get("pet_id");
    const startParam = tg?.initDataUnsafe?.start_param ?? "";
    const invToken   = startParam.startsWith("inv_")
      ? startParam.slice(4)
      : null;

    console.log("[App] urlPetId:", urlPetId, "| invToken:", invToken);
    console.log("[App] initData:", tg?.initData ? "present" : "MISSING");

    const init = async () => {
      try {
        if (invToken) {
          try {
            const res = await acceptInvite(invToken);
            console.log("[App] invite accepted, pet_id:", res.pet_id);
            setPetId(res.pet_id);
          } catch (e) {
            console.warn("[App] acceptInvite failed:", e);
            // инвайт не сработал — пробуем urlPetId
            if (urlPetId && Number(urlPetId) > 0) {
              setPetId(Number(urlPetId));
            }
            // иначе покажем CreatePetPage
          }
        } else if (urlPetId && Number(urlPetId) > 0) {
          console.log("[App] using urlPetId:", urlPetId);
          setPetId(Number(urlPetId));
        } else {
          console.log("[App] no pet_id found, showing CreatePetPage");
        }
      } catch (e) {
        console.error("[App] init error:", e);
        setError("Что-то пошло не так при запуске. Попробуй перезапустить.");
      } finally {
        setReady(true);
      }
    };

    init();
  }, []);

  if (!ready)   return <Loader />;
  if (error)    return <ErrorScreen message={error} />;
  if (!petId)   return <CreatePetPage onCreated={setPetId} />;
  return <HomePage petId={petId} />;
}