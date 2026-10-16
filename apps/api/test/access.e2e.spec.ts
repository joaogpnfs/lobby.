import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetState } from "./app.js";
import { client, createEmployee, giveAccess, signUp, type Api } from "./fixtures.js";

let app: NestFastifyApplication;
let admin: Api;

const tokenOf = (url: string) => new URL(url).pathname.split("/").pop()!;

beforeAll(async () => {
  app = await createTestApp();
});
afterAll(() => app.close());
beforeEach(async () => {
  await resetState(app);
  admin = await signUp(app, "Acme");
});

describe("invitations", () => {
  it("invite → preview → accept creates the account and links the employee", async () => {
    const person = await createEmployee(admin, { email: "rh@acme.test" });
    const invite = (
      await admin.post("/invitations", { email: "rh@acme.test", role: "HR_MANAGER", employeeId: person.id }).expect(201)
    ).body.data;
    const token = tokenOf(invite.url);

    const preview = await client(app).post("/invitations/preview", { token }).expect(200);
    expect(preview.body.data).toEqual({
      organizationName: "Acme",
      email: "rh@acme.test",
      role: "HR_MANAGER",
      hasAccount: false,
    });

    const accepted = await client(app)
      .post("/invitations/accept", { token, name: "Rita", password: "rita-pass-123" })
      .expect(200);
    const rita = client(app, accepted.body.data.accessToken);
    expect((await rita.get("/auth/me")).body.data).toMatchObject({
      role: "HR_MANAGER",
      organization: { name: "Acme" },
    });
    expect((await admin.get(`/employees/${person.id}`)).body.data.hasAccess).toBe(true);

    await client(app).post("/invitations/accept", { token, name: "Rita", password: "rita-pass-123" }).expect(404);
  });

  it("an existing account joins a second organization with its own password", async () => {
    const globex = await signUp(app, "Globex");
    const invite = (await globex.post("/invitations", { email: "admin@acme.test", role: "EMPLOYEE" }).expect(201)).body
      .data;
    const token = tokenOf(invite.url);

    expect((await client(app).post("/invitations/preview", { token })).body.data.hasAccount).toBe(true);
    await client(app).post("/invitations/accept", { token, password: "wrong-password" }).expect(401);
    await client(app).post("/invitations/accept", { token, password: "correct-horse-1" }).expect(200);
  });

  it("HR can't invite an admin (no privilege escalation)", async () => {
    const hrPerson = await createEmployee(admin);
    const hr = await giveAccess(app, admin, hrPerson, "HR_MANAGER");
    await hr.post("/invitations", { email: "boss@acme.test", role: "ORG_ADMIN" }).expect(403);
    await hr.post("/invitations", { email: "staff@acme.test", role: "EMPLOYEE" }).expect(201);
  });

  it("a new invitation replaces the previous link, and revoked links stop working", async () => {
    const first = tokenOf((await admin.post("/invitations", { email: "x@acme.test", role: "EMPLOYEE" })).body.data.url);
    const second = (await admin.post("/invitations", { email: "x@acme.test", role: "MANAGER" })).body.data;
    await client(app).post("/invitations/preview", { token: first }).expect(404);

    expect((await admin.get("/invitations")).body.data).toHaveLength(1);
    await admin.delete(`/invitations/${second.id}`).expect(200);
    await client(app)
      .post("/invitations/preview", { token: tokenOf(second.url) })
      .expect(404);
  });

  it("refuses inviting someone who is already a member", async () => {
    await admin.post("/invitations", { email: "admin@acme.test", role: "EMPLOYEE" }).expect(409);
  });
});

describe("members", () => {
  it("admin changes roles and disables access; nobody changes their own", async () => {
    const person = await createEmployee(admin);
    const personApi = await giveAccess(app, admin, person, "EMPLOYEE");

    const members = (await admin.get("/members").expect(200)).body.data as {
      id: string;
      role: string;
      email: string;
    }[];
    expect(members).toHaveLength(2);
    const self = members.find((m) => m.role === "ORG_ADMIN")!;
    const other = members.find((m) => m.role === "EMPLOYEE")!;

    await admin.patch(`/members/${self.id}`, { status: "DISABLED" }).expect(403);
    await admin.patch(`/members/${other.id}`, { role: "MANAGER" }).expect(200);
    expect((await personApi.get("/auth/me")).body.data.role).toBe("MANAGER");

    await admin.patch(`/members/${other.id}`, { status: "DISABLED" }).expect(200);
    await personApi.get("/auth/me").expect(401);
    await personApi.get("/members").expect(401);
  });
});
