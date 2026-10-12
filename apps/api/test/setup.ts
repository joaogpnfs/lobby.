// Tests run against the dedicated test database, quietly.
try {
  process.loadEnvFile(new URL("../../../.env", import.meta.url));
} catch {
  // CI passes env vars directly
}
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;
