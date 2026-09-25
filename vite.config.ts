import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Set by `tauri dev` when developing on a device (mobile); unused on desktop.
const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative asset URLs: the same build works inside Tauri, on GitHub Pages sub-paths and on itch.io.
  base: "./",
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  // one screen, one chunk: ~540 kB minified / ~170 kB gzipped (React + Base UI + the core) is fine for a desktop
  // app and a static site, so don't warn about it
  build: { chunkSizeWarningLimit: 700 },
});
