import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The API (server/index.ts) runs on 8787 in development; Vite proxies /api to it so the browser sees one origin.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": "http://127.0.0.1:8787" } },
  build: { target: "es2022", sourcemap: true },
});
