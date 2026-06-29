import path from "path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",

      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },

      manifest: {
        name: "BCG",
        short_name: "BCG",
        id: "/",
        start_url: "/",
        scope: "/",
        display: "standalone",
        description: "Generate DPCI/Location barcodes with no ads.",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        icons: [
          {
            src: "/web-app-manifest-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/web-app-manifest-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
        screenshots: [
          {
            src: "/screenshots/desktop-1280x720.png",
            sizes: "1280x720",
            type: "image/png",
            form_factor: "wide",
            label: "BCG desktop homepage",
          },
          {
            src: "/screenshots/mobile-390x844.png",
            sizes: "390x844",
            type: "image/png",
            form_factor: "narrow",
            label: "BCG mobile homepage",
          },
        ],
      },

      devOptions: {
        enabled: false,
      },
    }),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    port: 3000,
  },

  optimizeDeps: {
    exclude: ["oh-vue-icons/icons"],
  },
});
