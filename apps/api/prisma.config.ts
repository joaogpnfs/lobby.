import { defineConfig } from "prisma/config";

// The repo keeps one .env at the root; CI and production pass real env vars instead.
try {
  process.loadEnvFile("../../.env");
} catch {
  // no .env file: rely on the environment
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env["DATABASE_URL"] },
});
