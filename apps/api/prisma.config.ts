import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

const envFile = "../../.env";
if (existsSync(envFile)) process.loadEnvFile(envFile);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env["DATABASE_URL"] },
});
