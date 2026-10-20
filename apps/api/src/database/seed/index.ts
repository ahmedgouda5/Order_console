import { runSeed } from "./seed.js";

runSeed().catch((error) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
