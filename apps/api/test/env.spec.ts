import { describe, expect, it } from "vitest";
import { parseEnv } from "../src/env.js";

const valid = {
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  REDIS_URL: "redis://localhost:6379",
  JWT_ACCESS_SECRET: "x".repeat(32),
  AWS_ACCESS_KEY_ID: "key",
  AWS_SECRET_ACCESS_KEY: "secret",
  AWS_S3_BUCKET: "bucket",
};

describe("parseEnv", () => {
  it("applies defaults and parses lists and booleans", () => {
    const env = parseEnv({
      ...valid,
      CORS_ORIGINS: "http://a.test, http://b.test",
      SWAGGER_ENABLED: "true",
      SENTRY_DSN: "",
    });
    expect(env.API_PORT).toBe(3001);
    expect(env.CORS_ORIGINS).toEqual(["http://a.test", "http://b.test"]);
    expect(env.SWAGGER_ENABLED).toBe(true);
    expect(env.SENTRY_DSN).toBeUndefined();
  });

  it("fails listing every missing or invalid variable", () => {
    expect(() => parseEnv({ REDIS_URL: "not-a-url" })).toThrow(
      /DATABASE_URL[\s\S]*REDIS_URL|REDIS_URL[\s\S]*DATABASE_URL/,
    );
  });
});
