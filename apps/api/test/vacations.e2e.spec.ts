import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { NotificationList, VacationDto, VacationSummary } from "@lobby/types";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { JobsService } from "../src/modules/jobs/jobs.service.js";
import { PrismaService } from "../src/prisma.service.js";
import { createTestApp, resetState } from "./app.js";
import { createEmployee, giveAccess, signUp, type Api } from "./fixtures.js";

let app: NestFastifyApplication;
let admin: Api;
let manager: Api;
let ana: Api;
let anaId: string;
let managerId: string;

const day = (offset: number) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
    new Date(Date.now() + offset * 86_400_000),
  );

beforeAll(async () => {
  app = await createTestApp();
});
afterAll(() => app.close());
beforeEach(async () => {
  await resetState(app);
  admin = await signUp(app, "Acme");
  const boss = await createEmployee(admin);
  managerId = boss.id;
  manager = await giveAccess(app, admin, boss, "MANAGER");
  const person = await createEmployee(admin, { managerId: boss.id });
  anaId = person.id;
  ana = await giveAccess(app, admin, person, "EMPLOYEE");
});

async function request(api: Api, startDate = day(10), endDate = day(24)) {
  const res = await api.post("/vacations", { startDate, endDate, reason: "Viagem" }).expect(201);
  return res.body.data as VacationDto;
}

const notifications = async (api: Api) => (await api.get("/notifications").expect(200)).body.data as NotificationList;

describe("vacations", () => {
  it("request, manager approval, notifications and summary", async () => {
    const created = await request(ana);
    expect(created).toMatchObject({ status: "PENDING", days: 15, canCancel: true, canDecide: false });

    const inbox = await notifications(manager);
    expect(inbox.unread).toBe(1);
    expect(inbox.items[0]).toMatchObject({ type: "VACATION_REQUESTED", data: { vacationId: created.id } });

    const awaiting = await manager.get("/vacations?awaitingMe=true").expect(200);
    expect(awaiting.body.data).toEqual([expect.objectContaining({ id: created.id, canDecide: true })]);

    const approved = await manager.post(`/vacations/${created.id}/approve`).expect(200);
    expect(approved.body.data).toMatchObject({ status: "APPROVED", canDecide: false });
    await manager.post(`/vacations/${created.id}/reject`, { note: "Tarde demais" }).expect(409);

    expect((await notifications(ana)).items[0]).toMatchObject({ type: "VACATION_APPROVED" });
    await ana.post("/notifications/read").expect(200);
    expect((await notifications(ana)).unread).toBe(0);

    const summary = (await ana.get("/vacations/summary").expect(200)).body.data as VacationSummary;
    expect(summary.mine).toEqual([expect.objectContaining({ id: created.id, status: "APPROVED" })]);
    expect(summary.awaitingMe).toBe(0);

    const actions = await app
      .get(PrismaService)
      .auditLog.findMany({ where: { entityId: created.id }, select: { action: true } });
    expect(actions.map((a) => a.action).sort()).toEqual(["VACATION_APPROVED", "VACATION_REQUESTED"]);
  });

  it("blocks overlapping open requests until one is cancelled", async () => {
    const first = await request(ana, day(10), day(20));
    await ana.post("/vacations", { startDate: day(20), endDate: day(26) }).expect(409);
    await ana.post(`/vacations/${first.id}/cancel`).expect(200);
    await request(ana, day(20), day(26));
  });

  it("validates dates", async () => {
    await ana.post("/vacations", { startDate: day(-1), endDate: day(10) }).expect(400);
    await ana.post("/vacations", { startDate: day(10), endDate: day(12) }).expect(400);
    await ana.post("/vacations", { startDate: day(20), endDate: day(10) }).expect(400);
    await ana.post("/vacations", { startDate: day(10), endDate: day(50) }).expect(400);
  });

  it("rejection needs a reason and only approvers outside the request decide", async () => {
    const created = await request(ana);
    await ana.post(`/vacations/${created.id}/approve`).expect(403);
    await manager.post(`/vacations/${created.id}/reject`, {}).expect(400);
    const rejected = await manager.post(`/vacations/${created.id}/reject`, { note: "Fechamento do trimestre" });
    expect(rejected.body.data).toMatchObject({ status: "REJECTED", decisionNote: "Fechamento do trimestre" });
    expect((await notifications(ana)).items[0]).toMatchObject({ type: "VACATION_REJECTED" });

    const own = await request(manager);
    await manager.post(`/vacations/${own.id}/approve`).expect(403);
    expect((await notifications(admin)).items[0]).toMatchObject({ data: { vacationId: own.id } });
    await admin.post(`/vacations/${own.id}/approve`).expect(200);
  });

  it("scopes visibility by role", async () => {
    const outsider = await createEmployee(admin);
    const bob = await giveAccess(app, admin, outsider, "EMPLOYEE");
    const theirs = await request(bob);
    await request(ana);

    expect((await manager.get("/vacations").expect(200)).body.meta.total).toBe(1);
    expect((await bob.get("/vacations").expect(200)).body.data).toEqual([expect.objectContaining({ id: theirs.id })]);
    expect((await admin.get("/vacations").expect(200)).body.meta.total).toBe(2);
    await manager.post(`/vacations/${theirs.id}/approve`).expect(404);
    await ana.post(`/vacations/${theirs.id}/cancel`).expect(404);
  });

  it("refuses requests from accounts without an employee record", async () => {
    await admin.post("/vacations", { startDate: day(10), endDate: day(20) }).expect(403);
  });

  it("completes approved vacations once they end", async () => {
    const prisma = app.get(PrismaService);
    const org = await prisma.employee.findUniqueOrThrow({ where: { id: anaId }, select: { organizationId: true } });
    const past = await prisma.vacationRequest.create({
      data: {
        organizationId: org.organizationId,
        employeeId: anaId,
        startDate: new Date(`${day(-20)}T00:00:00Z`),
        endDate: new Date(`${day(-6)}T00:00:00Z`),
        days: 15,
        status: "APPROVED",
      },
    });
    const ongoing = await prisma.vacationRequest.create({
      data: {
        organizationId: org.organizationId,
        employeeId: managerId,
        startDate: new Date(`${day(-2)}T00:00:00Z`),
        endDate: new Date(`${day(5)}T00:00:00Z`),
        days: 8,
        status: "APPROVED",
      },
    });

    expect(await app.get(JobsService).runMaintenance()).toMatchObject({ completedVacations: 1 });
    const statuses = await prisma.vacationRequest.findMany({ select: { id: true, status: true } });
    expect(statuses).toEqual(
      expect.arrayContaining([
        { id: past.id, status: "COMPLETED" },
        { id: ongoing.id, status: "APPROVED" },
      ]),
    );
    const summary = (await admin.get("/vacations/summary").expect(200)).body.data as VacationSummary;
    expect(summary.onVacationToday).toEqual([expect.objectContaining({ id: managerId })]);
  });
});
