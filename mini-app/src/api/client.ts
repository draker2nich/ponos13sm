import axios from "axios";

const tg = window.Telegram?.WebApp;

// В dev-режиме (vite proxy) используем относительный путь,
// в проде — абсолютный URL из переменной окружения
const BASE_URL = import.meta.env.VITE_API_URL ?? "https://demon-and-android.me";

console.log("[API] baseURL:", BASE_URL);

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((cfg) => {
  const initData = tg?.initData ?? "";
  if (initData) {
    cfg.headers.Authorization = `Bearer ${initData}`;
  } else {
    console.warn("[API] initData is empty — auth will fail in production");
  }
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error(
      "[API] error:",
      err.config?.url,
      err.response?.status,
      err.response?.data,
    );
    return Promise.reject(err);
  },
);