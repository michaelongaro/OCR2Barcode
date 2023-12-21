import path from "path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: "autoUpdate",
      // includeAssets: [
      //   "tesseract/worker.min.js",
      //   "tesseract/lang-data/eng.traineddata.gz",
      //   // "tesseract/core/tesseract-core-lstm.wasm.js",
      //   "tesseract/core/tesseract-core-simd-lstm.wasm.js",
      //   // "tesseract/core/tesseract-core-simd.wasm.js",
      //   // "tesseract/core/tesseract-core.wasm.js",
      // ],
      manifest: {
        name: "OCR2Barcode",
        short_name: "OCR2Barcode",
        start_url: "/",
        description:
          "Uses OCR to read text from images and generates barcodes from the text.",
        theme_color: "#ffffff",
        background_color: "#000000",
        icons: [
          {
            src: "android-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
      // workbox: {
      //   cleanupOutdatedCaches: true,
      //   maximumFileSizeToCacheInBytes: 5000000,
      //   runtimeCaching: [
      //     {
      //       urlPattern: ({ url }) => url.pathname.startsWith("/tesseract"),
      //       handler: "CacheFirst",
      //     },
      //   ],
      // },
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
