import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp, resetState } from "./app.js";
import { createEmployee, signUp, type Api } from "./fixtures.js";

let app: NestFastifyApplication;
let acme: Api;
let globex: Api;
const theirs: Record<string, string> = {};

beforeAll(async () => {
  app = await createTestApp();
  await resetState(app);
  acme = await signUp(app, "Acme");
  globex = await signUp(app, "Globex");

  theirs.department = (await globex.post("/departments", { name: "Segredos" }).expect(201)).body.data.id;
  theirs.position = (await globex.post("/positions", { name: "Espião" }).expect(201)).body.data.id;
  theirs.branch = (await globex.post("/branches", { name: "Base secreta" }).expect(201)).body.data.id;
  theirs.employee = (await createEmployee(globex, { departmentId: theirs.department })).id;
  theirs.invitation = (await globex.post("/invitations", { email: "spy@globex.test", role: "EMPLOYEE" })).body.data.id;
  theirs.member = ((await globex.get("/members")).body.data as { id: string }[])[0]!.id;

  await createEmployee(acme);
  await acme.post("/departments", { name: "Engenharia" }).expect(201);
});
afterAll(() => app.close());

describe("tenant isolation", () => {
  it.each(["departments", "positions", "branches", "employees"])(
    "GET/PATCH/DELETE on another org's %s → 404",
    async (resource) => {
      const id = theirs[resource === "branches" ? "branch" : resource.replace(/s$/, "")]!;
      await acme.get(`/${resource}/${id}`).expect(404);
      await acme.patch(`/${resource}/${id}`, patchBody(resource)).expect(404);
      await acme.delete(`/${resource}/${id}`).expect(404);
    },
  );

  it("employee actions and invitations/members of another org → 404", async () => {
    await acme
      .post(`/employees/${theirs.employee}/terminate`, { terminationDate: "2025-01-01", reason: "Tentativa" })
      .expect(404);
    await acme.delete(`/invitations/${theirs.invitation}`).expect(404);
    await acme.patch(`/members/${theirs.member}`, { role: "EMPLOYEE" }).expect(404);
  });

  it("can't point to another org's records from its own", async () => {
    const own = await createEmployee(acme);
    await acme.patch(`/employees/${own.id}`, { departmentId: theirs.department }).expect(404);
    await acme.patch(`/employees/${own.id}`, { managerId: theirs.employee }).expect(404);
    await acme.post("/departments", { name: "Infiltrada", managerId: theirs.employee }).expect(404);
    await acme
      .post("/invitations", { email: "x@acme.test", role: "EMPLOYEE", employeeId: theirs.employee })
      .expect(404);
  });

  it("lists never include another org's rows, even when filtering by their ids", async () => {
    for (const path of ["/employees", "/departments", "/positions", "/branches", "/members", "/invitations"]) {
      const body = JSON.stringify((await acme.get(path).expect(200)).body.data);
      expect(body, path).not.toMatch(/Globex|Segredos|Espião|Base secreta|globex\.test/);
    }
    const filtered = await acme.get(`/employees?departmentId=${theirs.department}`).expect(200);
    expect(filtered.body.data).toEqual([]);
  });

  it("the other org's data is untouched", async () => {
    expect((await globex.get(`/employees/${theirs.employee}`).expect(200)).body.data.status).toBe("ACTIVE");
    expect((await globex.get(`/departments/${theirs.department}`).expect(200)).body.data.name).toBe("Segredos");
  });
});

function patchBody(resource: string) {
  return resource === "employees" ? { firstName: "Hacked" } : { name: "Hacked" };
}
