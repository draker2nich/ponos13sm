import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,  // разрешаем ngrok и любые хосты
  },
  build: {
    outDir: "dist",
  },
});