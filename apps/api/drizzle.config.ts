import { fileURLToPath } from "node:url";

import { defineConfig } from "drizzle-kit";

import { loadEnv } from "./src/db/env.js";

loadEnv();

// Globs in drizzle-kit need posix separators, even on Windows.
const apiRoot = fileURLToPath(new URL(".", import.meta.url)).replace(/\\/g, "/");

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/orders_console";

export default defineConfig({
  schema: `${apiRoot}src/db/schema/*.ts`,
  out: `${apiRoot}drizzle`,
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
