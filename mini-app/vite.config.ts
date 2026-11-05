import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The mini app is served from /app/ next to the landing page (see vercel.json)
export default defineConfig({
  base: "/app/",
  plugins: [react()],
  build: {
    outDir: "../public/app",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: true, // tunnels like cloudflared / ngrok
    proxy: {
      "/api": process.env.API_URL ?? "http://localhost:8000",
    },
  },
});
