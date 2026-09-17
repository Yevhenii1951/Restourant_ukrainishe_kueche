import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import path from "node:path";

const envFile = path.join(process.cwd(), ".env.test.local");
if (existsSync(envFile)) {
  loadEnvFile(envFile);
}