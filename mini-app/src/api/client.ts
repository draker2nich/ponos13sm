import axios from "axios";

const tg = window.Telegram?.WebApp;

// Пустой baseURL = запросы идут на тот же домен где открыт фронт.
// На Heroku фронт и API на одном домене (demon-and-android.me),
// поэтому /pets/... будет резолвиться в https://demon-and-android.me/pets/...
const BASE_URL = "";

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