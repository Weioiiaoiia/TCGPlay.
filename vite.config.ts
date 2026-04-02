import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

const plugins = [react(), tailwindcss()];

export default defineConfig({
  server: {
    allowedHosts: true,
    proxy: {
      // Proxy /api/bsc-rpc to local Express server (handles chunking + rate limit)
      "/api/bsc-rpc": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      // Proxy /api/renaiss/* to the local express server on port 3001
      "/api/renaiss": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
});
