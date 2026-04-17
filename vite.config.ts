import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 5432,
    allowedHosts: [".ngrok-free.app", "knudge-dev.finbyz.com", "localhost"],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8046',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://127.0.0.1:8046',
        ws: true,
      }
    }
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
