interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  initData: string;
  initDataUnsafe: {
    user?: { id: number; first_name: string; username?: string };
    start_param?: string;
  };
  setHeaderColor?: (color: string) => void;
  showAlert?: (msg: string, cb?: () => void) => void;
  switchInlineQuery?: (query: string, choose_chat_types?: string[]) => void;
}

interface Window {
  Telegram?: { WebApp: TelegramWebApp };
}