import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { hash } from "@node-rs/argon2";
import { ROLE_PERMISSIONS } from "@lobby/types";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaService } from "../src/prisma.service.js";
import { createTestApp, resetState } from "./app.js";

const ORIGIN = "http://localhost:3000";
const owner = { name: "Ana Souza", email: "ana@acme.test", password: "correct-horse-1", organizationName: "Acme" };

let app: NestFastifyApplication;
const http = () => request(app.getHttpServer());

// The refresh token as the browser would send it back: only the cookie's name=value.
const refreshCookie = (res: request.Response) => {
  const raw = ([] as string[]).concat(res.headers["set-cookie"] ?? []).find((c) => c.startsWith("lobby_rt="));
  return raw?.split(";")[0];
};

const register = (body = owner) => http().post("/api/v1/auth/register").send(body);
const refresh = (cookie: string | undefined) =>
  http()
    .post("/api/v1/auth/refresh")
    .set("Origin", ORIGIN)
    .set("Cookie", cookie ?? "");

beforeAll(async () => {
  app = await createTestApp();
});
afterAll(() => app.close());
beforeEach(() => resetState(app));

describe("register", () => {
  it("creates user, organization and ORG_ADMIN membership, and starts a session", async () => {
    const res = await register().expect(201);
    expect(res.body.data.accessToken).toEqual(expect.any(String));

    const cookie = ([] as string[]).concat(res.headers["set-cookie"] ?? []).find((c) => c.startsWith("lobby_rt="));
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\/api\/v1\/auth/);

    const me = await http().get("/api/v1/auth/me").auth(res.body.data.accessToken, { type: "bearer" }).expect(200);
    expect(me.body.data).toMatchObject({
      user: { name: owner.name, email: owner.email },
      organization: { name: "Acme" },
      role: "ORG_ADMIN",
      permissions: ROLE_PERMISSIONS.ORG_ADMIN,
    });
  });

  it("stores an argon2id hash, never the password", async () => {
    await register().expect(201);
    const user = await app.get(PrismaService).user.findUniqueOrThrow({ where: { email: owner.email } });
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
  });

  it("rejects a duplicate email with 409", async () => {
    await register().expect(201);
    const res = await register({ ...owner, email: "ANA@acme.test" }).expect(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("rejects invalid input and unknown fields (organizationId never comes from the body)", async () => {
    const res = await register({ ...owner, password: "short" }).expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    await http()
      .post("/api/v1/auth/register")
      .send({ ...owner, organizationId: "00000000-0000-0000-0000-000000000000" })
      .expect(400);
  });
});

describe("login", () => {
  beforeEach(() => register().expect(201));

  it("accepts valid credentials and records a LOGIN audit entry", async () => {
    const res = await http()
      .post("/api/v1/auth/login")
      .send({ email: owner.email, password: owner.password })
      .expect(200);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(refreshCookie(res)).toBeDefined();

    const logins = await app.get(PrismaService).auditLog.count({ where: { action: "LOGIN" } });
    expect(logins).toBe(1);
  });

  it("rejects a wrong password and an unknown email with the same 401", async () => {
    const wrong = await http()
      .post("/api/v1/auth/login")
      .send({ email: owner.email, password: "nope-nope" })
      .expect(401);
    const unknown = await http()
      .post("/api/v1/auth/login")
      .send({ email: "who@x.test", password: "nope-nope" })
      .expect(401);
    expect(wrong.body.error).toEqual(unknown.body.error);
  });

  it("rate limits repeated attempts on one account", async () => {
    for (let i = 0; i < 5; i++) {
      await http().post("/api/v1/auth/login").send({ email: owner.email, password: "nope-nope" }).expect(401);
    }
    const res = await http()
      .post("/api/v1/auth/login")
      .send({ email: owner.email, password: owner.password })
      .expect(429);
    expect(res.body.error.code).toBe("RATE_LIMITED");
  });
});

describe("access token", () => {
  it("is required on protected routes", async () => {
    await http().get("/api/v1/auth/me").expect(401);
  });

  it("rejects a tampered or garbage token", async () => {
    const { accessToken } = (await register()).body.data as { accessToken: string };
    const [h, p] = accessToken.split(".");
    await http().get("/api/v1/auth/me").auth(`${h}.${p}.forged`, { type: "bearer" }).expect(401);
    await http().get("/api/v1/auth/me").auth("not-a-jwt", { type: "bearer" }).expect(401);
  });

  it("stops working as soon as the membership is disabled", async () => {
    const { accessToken } = (await register()).body.data as { accessToken: string };
    await app.get(PrismaService).organizationMembership.updateMany({ data: { status: "DISABLED" } });
    await http().get("/api/v1/auth/me").auth(accessToken, { type: "bearer" }).expect(401);
  });
});

describe("refresh", () => {
  it("rotates the token: the new one works, and the old one can't be used again", async () => {
    const first = refreshCookie(await register());
    const res = await refresh(first).expect(200);
    const second = refreshCookie(res);
    expect(second).toBeDefined();
    expect(second).not.toBe(first);
    await http().get("/api/v1/auth/me").auth(res.body.data.accessToken, { type: "bearer" }).expect(200);
    await refresh(second).expect(200);
  });

  it("revokes the whole family when a rotated token is reused", async () => {
    const stolen = refreshCookie(await register());
    const legit = refreshCookie(await refresh(stolen).expect(200));

    await refresh(stolen).expect(401);
    // The legitimate holder is logged out too: the family is burned.
    await refresh(legit).expect(401);
  });

  it("requires an allowed Origin (CSRF)", async () => {
    const cookie = refreshCookie(await register());
    await http().post("/api/v1/auth/refresh").set("Cookie", cookie!).expect(403);
    await http().post("/api/v1/auth/refresh").set("Origin", "https://evil.test").set("Cookie", cookie!).expect(403);
  });

  it("rejects a missing or unknown cookie", async () => {
    await refresh(undefined).expect(401);
    await refresh("lobby_rt=made-up").expect(401);
  });
});

describe("logout", () => {
  it("revokes the session and clears the cookie", async () => {
    const cookie = refreshCookie(await register());
    const res = await http().post("/api/v1/auth/logout").set("Origin", ORIGIN).set("Cookie", cookie!).expect(200);
    expect(([] as string[]).concat(res.headers["set-cookie"] ?? []).join()).toMatch(/lobby_rt=;/);
    await refresh(cookie).expect(401);
  });
});

describe("RBAC", () => {
  // An EMPLOYEE in the same organization, created directly: invitations arrive in Phase 3.
  async function employeeToken() {
    await register().expect(201);
    const prisma = app.get(PrismaService);
    const org = await prisma.organization.findFirstOrThrow();
    await prisma.user.create({
      data: {
        email: "bruno@acme.test",
        name: "Bruno",
        passwordHash: await hash("employee-pass-1"),
        memberships: { create: { organizationId: org.id, role: "EMPLOYEE" } },
      },
    });
    const res = await http().post("/api/v1/auth/login").send({ email: "bruno@acme.test", password: "employee-pass-1" });
    return res.body.data.accessToken as string;
  }

  it("lets a role do what ROLE_PERMISSIONS grants", async () => {
    const token = await employeeToken();
    const res = await http().get("/api/v1/organizations/me").auth(token, { type: "bearer" }).expect(200);
    expect(res.body.data.name).toBe("Acme");
  });

  it("returns 403 for an action the role lacks", async () => {
    const token = await employeeToken();
    const res = await http()
      .patch("/api/v1/organizations/me")
      .auth(token, { type: "bearer" })
      .send({ name: "Hacked" })
      .expect(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("ORG_ADMIN updates the organization, with an audit entry", async () => {
    const { accessToken } = (await register()).body.data as { accessToken: string };
    const res = await http()
      .patch("/api/v1/organizations/me")
      .auth(accessToken, { type: "bearer" })
      .send({ legalName: "Acme Ltda" })
      .expect(200);
    expect(res.body.data.legalName).toBe("Acme Ltda");
    const entry = await app.get(PrismaService).auditLog.findFirstOrThrow({ where: { action: "ORGANIZATION_UPDATED" } });
    expect(entry.metadata).toEqual({ fields: ["legalName"] });
  });
});
