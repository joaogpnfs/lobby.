import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestApp, resetState } from "./app.js";
import { signUp, type Api } from "./fixtures.js";

let app: NestFastifyApplication;
let admin: Api;
let linkedinUser = { sub: "li-123", picture: "https://media.licdn.com/dms/image/ana.jpg" };

const realFetch = globalThis.fetch;
vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
  const url = String(input);
  if (url.startsWith("https://www.linkedin.com/oauth/v2/accessToken")) return Response.json({ access_token: "token" });
  if (url.startsWith("https://api.linkedin.com/v2/userinfo")) return Response.json(linkedinUser);
  return realFetch(input, init);
});

beforeAll(async () => {
  app = await createTestApp();
});
afterAll(() => app.close());
beforeEach(async () => {
  await resetState(app);
  admin = await signUp(app, "Acme");
  linkedinUser = { sub: "li-123", picture: "https://media.licdn.com/dms/image/ana.jpg" };
});

const http = () => request(app.getHttpServer());

function stateFrom(res: request.Response) {
  const cookie = ([] as string[]).concat(res.headers["set-cookie"] ?? []).find((c) => c.startsWith("lobby_li_state="))!;
  return cookie.split(";")[0]!.split("=")[1]!;
}

const callback = (state: string, cookieState = state) =>
  http().get(`/api/v1/auth/linkedin/callback?state=${state}&code=abc`).set("Cookie", `lobby_li_state=${cookieState}`);

async function link(api: Api) {
  const res = await api.post("/auth/linkedin/link").expect(200);
  expect(new URL(res.body.data.url as string).searchParams.get("scope")).toBe("openid profile email");
  return callback(stateFrom(res));
}

describe("LinkedIn", () => {
  it("links the signed-in user, then lets them sign in with LinkedIn", async () => {
    const linked = await link(admin);
    expect(linked.headers.location).toBe("http://localhost:3000/settings?linkedin=linked");
    expect((await admin.get("/auth/me")).body.data.user).toMatchObject({
      linkedinConnected: true,
      avatarUrl: linkedinUser.picture,
    });

    const start = await http().get("/api/v1/auth/linkedin/login").expect(302);
    expect(start.headers.location).toMatch(/^https:\/\/www\.linkedin\.com\/oauth\/v2\/authorization\?/);
    const done = await callback(stateFrom(start)).expect(302);
    expect(done.headers.location).toBe("http://localhost:3000/dashboard");
    const refresh = ([] as string[]).concat(done.headers["set-cookie"] ?? []).find((c) => c.startsWith("lobby_rt="))!;

    await http()
      .post("/api/v1/auth/refresh")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", refresh.split(";")[0]!)
      .expect(200);
  });

  it("never signs in a LinkedIn account nobody linked", async () => {
    const start = await http().get("/api/v1/auth/linkedin/login");
    const res = await callback(stateFrom(start)).expect(302);
    expect(res.headers.location).toBe("http://localhost:3000/login?linkedin=not-linked");
    expect(([] as string[]).concat(res.headers["set-cookie"] ?? []).some((c) => c.startsWith("lobby_rt="))).toBe(false);
  });

  it("refuses a forged or reused state", async () => {
    const start = await http().get("/api/v1/auth/linkedin/login");
    const state = stateFrom(start);
    expect((await callback(state, "other")).headers.location).toBe("http://localhost:3000/login?linkedin=error");
    await callback(state).expect(302);
    expect((await callback(state)).headers.location).toBe("http://localhost:3000/login?linkedin=error");
  });

  it("one LinkedIn account links to one user only, and can be unlinked", async () => {
    await link(admin);
    const other = await signUp(app, "Globex");
    expect((await link(other)).headers.location).toBe("http://localhost:3000/settings?linkedin=taken");

    await admin.delete("/auth/linkedin").expect(200);
    expect((await admin.get("/auth/me")).body.data.user.linkedinConnected).toBe(false);
    expect((await link(other)).headers.location).toBe("http://localhost:3000/settings?linkedin=linked");
  });
});
