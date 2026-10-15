import { z } from "zod";

// The repo keeps one .env at the root; CI and production pass real env vars instead.
try {
  process.loadEnvFile(new URL("../../../.env", import.meta.url));
} catch {
  // no .env file: rely on the environment
}

const emptyAsUndefined = (v: unknown) => (v === "" ? undefined : v);

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(3001),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000")
    .transform((s) =>
      s
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
    ),
  // Public URL of the web app, for links the API hands out (invitations).
  APP_URL: z.url().default("http://localhost:3000"),
  SWAGGER_ENABLED: z.stringbool().default(false),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  // Fastify trustProxy: which hops may set X-Forwarded-For (the Next rewrite locally, the ALB in production).
  // Rate limits and audit IPs depend on it, so never trust every hop.
  TRUST_PROXY: z.string().default("loopback"),
  JWT_ACCESS_SECRET: z.string().min(32, "Generate with: openssl rand -base64 48"),
  SENTRY_DSN: z.preprocess(emptyAsUndefined, z.url().optional()),
});

export type Env = z.infer<typeof schema>;

// Fails fast at boot with every problem listed, instead of crashing later on first use.
export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = schema.safeParse(source);
  if (!result.success) throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  return result.data;
}

export const env = parseEnv(process.env);
