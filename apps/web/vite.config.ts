import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function loadEnvFile(name: string, override: boolean) {
  const filePath = path.join(repoRoot, name);
  if (existsSync(filePath)) {
    dotenv.config({ path: filePath, override });
  }
}

/** `.env` defaults, then local files — env.local wins. */
loadEnvFile(".env", false);
loadEnvFile(".env.local", true);
loadEnvFile("env.local", true);

export default defineConfig({
  envDir: repoRoot,
  plugins: [react()],  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/uploads": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
