import process from "node:process";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");

  // Container environment beats .env files: the compose stack proxies to the
  // internal api service (http://api:4000) instead of the host mapping.
  const apiProxyTarget =
    process.env.API_PROXY_TARGET
    ?? env.API_PROXY_TARGET
    ?? "http://localhost:8000";

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
