import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

/** Monorepo root — env files live here (same as Vite `envDir`). */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

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
