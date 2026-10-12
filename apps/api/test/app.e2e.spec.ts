import { Test } from "@nestjs/testing";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module.js";
import { configureApp, createAdapter } from "../src/app.setup.js";

describe("HTTP surface", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(createAdapter());
    await configureApp(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(() => app.close());

  it("GET /api/v1/health reports db and redis inside the success envelope", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/health").expect(200);
    expect(res.body).toEqual({ success: true, data: { status: "ok", db: "ok", redis: "ok" } });
  });

  it("unknown routes return the error envelope and echo the request id", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/nope").set("x-request-id", "test-123").expect(404);
    expect(res.headers["x-request-id"]).toBe("test-123");
    expect(res.body).toEqual({ success: false, error: { code: "NOT_FOUND", message: expect.any(String) } });
  });

  it("sends security headers", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });
});
