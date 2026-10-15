import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaService } from "../src/prisma.service.js";
import { createTestApp, resetState } from "./app.js";
import { createEmployee, giveAccess, signUp, type Api } from "./fixtures.js";

let app: NestFastifyApplication;
let admin: Api;

beforeAll(async () => {
  app = await createTestApp();
});
afterAll(() => app.close());
beforeEach(async () => {
  await resetState(app);
  admin = await signUp(app, "Acme");
});

describe("departments, positions, branches", () => {
  it("CRUD with employee counts", async () => {
    const dept = (await admin.post("/departments", { name: "Engenharia" }).expect(201)).body.data;
    await createEmployee(admin, { departmentId: dept.id });

    const list = await admin.get("/departments").expect(200);
    expect(list.body.data).toEqual([expect.objectContaining({ name: "Engenharia", employeeCount: 1 })]);
    expect(list.body.meta).toEqual({ page: 1, pageSize: 20, total: 1 });

    await admin.patch(`/departments/${dept.id}`, { description: "Produto e plataforma" }).expect(200);
    await admin.post("/positions", { name: "Analista de RH", level: "Pleno" }).expect(201);
    await admin.post("/branches", { name: "Teresina", city: "Teresina", state: "PI" }).expect(201);
  });

  it("refuses duplicates and deleting one that employees still use (409)", async () => {
    const pos = (await admin.post("/positions", { name: "Designer" }).expect(201)).body.data;
    await admin.post("/positions", { name: "Designer" }).expect(409);
    await createEmployee(admin, { positionId: pos.id });
    await admin.delete(`/positions/${pos.id}`).expect(409);
  });
});

describe("employees", () => {
  it("creates, reads, updates and lists with filters, search and pagination", async () => {
    const dept = (await admin.post("/departments", { name: "Vendas" }).expect(201)).body.data;
    const ana = await createEmployee(admin, {
      firstName: "Ana",
      lastName: "Lima",
      departmentId: dept.id,
      document: "529.982.247-25",
    });
    await createEmployee(admin, { firstName: "Bruno", status: "ON_LEAVE" });
    await createEmployee(admin, { firstName: "Carla" });

    const detail = await admin.get(`/employees/${ana.id}`).expect(200);
    expect(detail.body.data).toMatchObject({
      name: "Ana Lima",
      document: "52998224725",
      department: { name: "Vendas" },
    });

    await admin.patch(`/employees/${ana.id}`, { preferredName: "Aninha" }).expect(200);

    const byDept = await admin.get(`/employees?departmentId=${dept.id}`).expect(200);
    expect(byDept.body.data.map((e: { name: string }) => e.name)).toEqual(["Aninha Lima"]);

    const byStatus = await admin.get("/employees?status=ON_LEAVE").expect(200);
    expect(byStatus.body.meta.total).toBe(1);

    const search = await admin.get("/employees?q=carl").expect(200);
    expect(search.body.data).toHaveLength(1);

    const page2 = await admin.get("/employees?pageSize=2&page=2").expect(200);
    expect(page2.body.data).toHaveLength(1);
    expect(page2.body.meta).toEqual({ page: 2, pageSize: 2, total: 3 });
  });

  it("validates input: CPF check digits, unknown fields, foreign ids", async () => {
    await admin
      .post("/employees", {
        firstName: "X",
        lastName: "Y",
        email: "x@y.test",
        hireDate: "2024-01-01",
        document: "111.111.111-11",
      })
      .expect(400);
    await admin
      .post("/employees", { firstName: "X", lastName: "Y", email: "x@y.test", hireDate: "2024-01-01", salary: 1 })
      .expect(400);
    await admin
      .post("/employees", {
        firstName: "X",
        lastName: "Y",
        email: "x@y.test",
        hireDate: "2024-01-01",
        departmentId: crypto.randomUUID(),
      })
      .expect(404);
  });

  it("rejects a duplicate email, but allows reusing it after a deletion", async () => {
    const first = await createEmployee(admin, { email: "dup@acme.test" });
    await admin
      .post("/employees", { firstName: "D", lastName: "U", email: "dup@acme.test", hireDate: "2024-01-01" })
      .expect(409);
    await admin.delete(`/employees/${first.id}`).expect(200);
    await createEmployee(admin, { email: "dup@acme.test" });
  });

  it("prevents management cycles", async () => {
    const boss = await createEmployee(admin);
    const lead = await createEmployee(admin, { managerId: boss.id });
    await admin.patch(`/employees/${boss.id}`, { managerId: lead.id }).expect(400);
    await admin.patch(`/employees/${boss.id}`, { managerId: boss.id }).expect(400);
  });

  it("terminates: records date and reason, and cuts the linked account's access", async () => {
    const person = await createEmployee(admin);
    const personApi = await giveAccess(app, admin, person, "EMPLOYEE");
    await personApi.get("/auth/me").expect(200);

    await admin
      .post(`/employees/${person.id}/terminate`, { terminationDate: "2023-01-01", reason: "Antes da admissão" })
      .expect(400);
    const res = await admin
      .post(`/employees/${person.id}/terminate`, { terminationDate: "2025-06-30", reason: "Pedido de demissão" })
      .expect(200);
    expect(res.body.data).toMatchObject({ status: "TERMINATED", terminationDate: "2025-06-30" });

    await personApi.get("/auth/me").expect(401);
    await admin
      .post(`/employees/${person.id}/terminate`, { terminationDate: "2025-07-01", reason: "De novo" })
      .expect(400);
  });

  it("soft deletes: gone from the API, kept in the database, reports lose the manager", async () => {
    const boss = await createEmployee(admin);
    const report = await createEmployee(admin, { managerId: boss.id });
    await admin.delete(`/employees/${boss.id}`).expect(200);
    await admin.get(`/employees/${boss.id}`).expect(404);
    expect((await admin.get(`/employees/${report.id}`)).body.data.manager).toBeNull();
    const row = await app.get(PrismaService).employee.findUnique({ where: { id: boss.id } });
    expect(row?.deletedAt).toBeInstanceOf(Date);
  });

  it("writes audit entries without personal data", async () => {
    const e = await createEmployee(admin, { document: "529.982.247-25" });
    await admin.patch(`/employees/${e.id}`, { phone: "86 99999-0000" }).expect(200);
    const entries = await app
      .get(PrismaService)
      .auditLog.findMany({ where: { entity: "Employee" }, orderBy: { createdAt: "asc" } });
    expect(entries.map((a) => a.action)).toEqual(["EMPLOYEE_CREATED", "EMPLOYEE_UPDATED"]);
    expect(JSON.stringify(entries)).not.toContain("99999");
    expect(JSON.stringify(entries)).not.toContain("52998224725");
  });
});

describe("visibility by role", () => {
  it("manager sees self and direct reports; employee sees only self; sensitive fields are hidden", async () => {
    const manager = await createEmployee(admin, { firstName: "Gestora" });
    const report = await createEmployee(admin, {
      firstName: "Liderado",
      managerId: manager.id,
      document: "529.982.247-25",
      phone: "86 98888-0000",
    });
    const other = await createEmployee(admin, { firstName: "Outro" });

    const managerApi = await giveAccess(app, admin, manager, "MANAGER");
    const team = await managerApi.get("/employees").expect(200);
    expect(team.body.data.map((e: { id: string }) => e.id).sort()).toEqual([manager.id, report.id].sort());
    await managerApi.get(`/employees/${other.id}`).expect(404);

    const seenByManager = (await managerApi.get(`/employees/${report.id}`).expect(200)).body.data;
    expect(seenByManager).toMatchObject({ document: "***.982.247-**", phone: null });

    const reportApi = await giveAccess(app, admin, report, "EMPLOYEE");
    const self = await reportApi.get("/employees").expect(200);
    expect(self.body.data.map((e: { id: string }) => e.id)).toEqual([report.id]);
    expect((await reportApi.get(`/employees/${report.id}`)).body.data).toMatchObject({
      document: "52998224725",
      phone: "86 98888-0000",
    });
    await reportApi.get(`/employees/${manager.id}`).expect(404);
  });

  it("only HR writes", async () => {
    const person = await createEmployee(admin);
    const managerApi = await giveAccess(app, admin, person, "MANAGER");
    await managerApi
      .post("/employees", { firstName: "N", lastName: "O", email: "n@o.test", hireDate: "2024-01-01" })
      .expect(403);
    await managerApi.patch(`/employees/${person.id}`, { firstName: "Eu" }).expect(403);
    await managerApi.post("/departments", { name: "Nova" }).expect(403);
  });
});
