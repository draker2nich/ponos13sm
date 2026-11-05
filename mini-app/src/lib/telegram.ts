// Thin wrapper over the Telegram WebApp SDK (loaded in index.html).
// Every call is optional so the app still runs in a plain browser during development.

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: { start_param?: string };
  ready(): void;
  expand(): void;
  setHeaderColor?(color: string): void;
  setBackgroundColor?(color: string): void;
  showAlert?(message: string): void;
  showConfirm?(message: string, callback: (ok: boolean) => void): void;
  openTelegramLink?(url: string): void;
  HapticFeedback?: {
    impactOccurred(style: "light" | "medium" | "heavy"): void;
    notificationOccurred(type: "error" | "success" | "warning"): void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}

export const tg = window.Telegram?.WebApp;

export function initTelegram(background: string) {
  tg?.ready();
  tg?.expand();
  tg?.setHeaderColor?.(background);
  tg?.setBackgroundColor?.(background);
}

export const initData = () => tg?.initData ?? "";

export const startParam = () => tg?.initDataUnsafe.start_param ?? "";

type Haptic = "light" | "medium" | "heavy" | "success" | "error";

export function haptic(kind: Haptic) {
  const hf = tg?.HapticFeedback;
  if (!hf) return;
  if (kind === "success" || kind === "error") hf.notificationOccurred(kind);
  else hf.impactOccurred(kind);
}

export function confirm(message: string): Promise<boolean> {
  if (tg?.showConfirm) return new Promise((resolve) => tg.showConfirm!(message, resolve));
  return Promise.resolve(window.confirm(message));
}

export function shareLink(url: string, text: string) {
  const share = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  if (tg?.openTelegramLink) tg.openTelegramLink(share);
  else window.open(share, "_blank");
}
