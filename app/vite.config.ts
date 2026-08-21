import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? "/",
  plugins: [react()],
  // Deployment-safe generated artifacts live at the repo root (public/generated/),
  // produced by the pipeline; the app serves and ships them as static assets.
  publicDir: fileURLToPath(new URL("../public", import.meta.url)),
  build: {
    // Vite 8 ships Lightning CSS; keep the fast, standards-aware minifier explicit.
    cssMinify: "lightningcss",
  },
});
