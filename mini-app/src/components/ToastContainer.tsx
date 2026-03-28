// mini-app/src/components/ToastContainer.tsx
import { useToastStore, type ToastType } from "../store/useToastStore";

const BG: Record<ToastType, string> = {
  success: "linear-gradient(135deg, rgba(34,197,94,0.92), rgba(22,163,74,0.92))",
  error:   "linear-gradient(135deg, rgba(239,68,68,0.92), rgba(220,38,38,0.92))",
  info:    "linear-gradient(135deg, rgba(99,102,241,0.92), rgba(79,70,229,0.92))",
};

export function ToastContainer() {
  const toasts = useToastStore(s => s.toasts);
  if (!toasts.length) return null;

  return (
    <div style={{
      position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
      zIndex: 100000, display: "flex", flexDirection: "column", gap: 8,
      pointerEvents: "none", width: "90%", maxWidth: 360,
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: "10px 18px", borderRadius: 14,
          background: BG[t.type],
          backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
          color: "#fff", fontSize: 13, fontWeight: 600,
          textAlign: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          animation: "toast-in 0.25s ease-out",
        }}>
          {t.text}
        </div>
      ))}
    </div>
  );
}