import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // Served at unsigned.gg/onboard/ (GitHub Pages compose, OPS-394).
  base: "/onboard/",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: false, // static public/manifest.json, CCP-style
      workbox: {
        // Never cache API responses or the OIDC callback.
        navigateFallbackDenylist: [/^\/api\//, /callback/],
      },
    }),
  ],
  server: {
    proxy: { "/api": "http://localhost:8080" },
  },
});
