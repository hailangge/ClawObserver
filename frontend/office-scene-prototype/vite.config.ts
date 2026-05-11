import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  base: "/assets/prototype/",
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  build: {
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        prototype: path.resolve(__dirname, "index.html"),
        realtimeSceneEmbed: path.resolve(__dirname, "src/realtimeSceneEmbed.tsx"),
      },
      output: {
        entryFileNames: (chunkInfo) =>
          chunkInfo.name === "realtimeSceneEmbed" ? "assets/realtime-scene-embed.js" : "assets/[name]-[hash].js",
        assetFileNames: (assetInfo) =>
          assetInfo.name?.endsWith(".css") ? "assets/realtime-scene.css" : "assets/[name]-[hash][extname]",
      },
    },
    outDir: path.resolve(__dirname, "../../clawobserver/static/prototype"),
    emptyOutDir: true,
    sourcemap: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});
