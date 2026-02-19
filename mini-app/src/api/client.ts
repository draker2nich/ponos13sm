import axios from "axios";

const tg = window.Telegram?.WebApp;

export const api = axios.create({
  baseURL: "https://demon-and-android.me",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((cfg) => {
  const initData = tg?.initData ?? "";
  if (initData) cfg.headers.Authorization = `Bearer ${initData}`;
  return cfg;
});