import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: true,
    port: 8080,
    strictPort: false,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        // Use VITE_PROXY_TARGET (e.g. http://localhost:3000) to hit local API; otherwise Railway
        target: process.env.VITE_PROXY_TARGET || "https://api-production-de18.up.railway.app",
        changeOrigin: true,
        secure: process.env.VITE_PROXY_TARGET ? false : true,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
