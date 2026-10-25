import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { ProfileImport } from "@lobby/types";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetState } from "./app.js";
import { createEmployee, giveAccess, signUp, type Api } from "./fixtures.js";
import { linkedinPdf } from "./pdf.js";

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

const importPdf = (api: Api, id: string) =>
  api.upload(`/employees/${id}/professional-profile/import`, linkedinPdf(), "application/pdf");

describe("professional profile", () => {
  it("previews a LinkedIn PDF without saving, then saves what the user confirms", async () => {
    const ana = await createEmployee(admin);
    const preview = (await importPdf(admin, ana.id).expect(200)).body.data as ProfileImport;
    expect(preview.linkedinUrl).toBe("https://www.linkedin.com/in/joao-gabriel-dev");
    expect(preview.profile.experiences).toHaveLength(3);
    expect((await admin.get(`/employees/${ana.id}`)).body.data.professionalProfile).toBeNull();

    const saved = await admin.put(`/employees/${ana.id}/professional-profile`, preview).expect(200);
    expect(saved.body.data).toMatchObject({
      linkedinUrl: preview.linkedinUrl,
      professionalProfile: preview.profile,
      canEditProfile: true,
    });
  });

  it("rejects anything that is not a readable PDF", async () => {
    const ana = await createEmployee(admin);
    await admin.post(`/employees/${ana.id}/professional-profile/import`, { pdf: "x" }).expect(400);
    await admin
      .upload(`/employees/${ana.id}/professional-profile/import`, Buffer.from("not a pdf"), "application/pdf")
      .expect(400);
    await admin
      .put(`/employees/${ana.id}/professional-profile`, {
        profile: { headline: "x" },
        linkedinUrl: "https://evil.test",
      })
      .expect(400);
  });

  it("the person edits their own profile; managers and colleagues can't", async () => {
    const manager = await createEmployee(admin);
    const report = await createEmployee(admin, { managerId: manager.id });
    const managerApi = await giveAccess(app, admin, manager, "MANAGER");
    const reportApi = await giveAccess(app, admin, report, "EMPLOYEE");

    const preview = (await importPdf(reportApi, report.id).expect(200)).body.data as ProfileImport;
    await reportApi.put(`/employees/${report.id}/professional-profile`, preview).expect(200);
    expect((await reportApi.get(`/employees/${report.id}`)).body.data.canEditProfile).toBe(true);

    expect((await managerApi.get(`/employees/${report.id}`)).body.data.canEditProfile).toBe(false);
    await managerApi.put(`/employees/${report.id}/professional-profile`, preview).expect(403);
    await importPdf(reportApi, manager.id).expect(403);

    const other = await signUp(app, "Globex");
    await importPdf(other, report.id).expect(404);
  });
});
