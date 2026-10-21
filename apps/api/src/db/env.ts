import { existsSync } from "node:fs";
import { resolve } from "node:path";

const ENV_FILE_CANDIDATES = [
  resolve(process.cwd(), "apps/api/.env"),
  resolve(process.cwd(), ".env"),
];

export function loadEnv(): void {
  if (typeof process.loadEnvFile !== "function") {
    throw new Error(
      "Node >= 20.12 is required to load .env files. Current version: " +
        process.version,
    );
  }

  for (const envFile of ENV_FILE_CANDIDATES) {
    if (existsSync(envFile)) {
      process.loadEnvFile(envFile);
    }
  }
}
