import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { DocumentUpload } from "@lobby/types";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DocumentsService } from "../src/modules/documents/documents.service.js";
import { StorageService } from "../src/modules/documents/storage.service.js";
import { PrismaService } from "../src/prisma.service.js";
import { createTestApp, resetState } from "./app.js";
import { createEmployee, giveAccess, signUp, type Api } from "./fixtures.js";

let app: NestFastifyApplication;
let admin: Api;

const pdf = Buffer.from("%PDF-1.4 contrato de trabalho");

beforeAll(async () => {
  app = await createTestApp();
});
afterAll(() => app.close());
beforeEach(async () => {
  await resetState(app);
  admin = await signUp(app, "Acme");
});

async function presign(api: Api, employeeId: string, overrides: Record<string, unknown> = {}) {
  const res = await api
    .post("/documents/presigned-url", {
      employeeId,
      name: "Contrato de trabalho.pdf",
      type: "CONTRACT",
      mimeType: "application/pdf",
      size: pdf.length,
      ...overrides,
    })
    .expect(201);
  return res.body.data as DocumentUpload;
}

const put = (upload: DocumentUpload, body: Buffer = pdf, headers = upload.headers) =>
  fetch(upload.uploadUrl, { method: "PUT", headers, body });

async function uploadDocument(api: Api, employeeId: string, overrides: Record<string, unknown> = {}) {
  const upload = await presign(api, employeeId, overrides);
  expect((await put(upload)).status).toBe(200);
  await api.post(`/documents/${upload.document.id}/confirm`).expect(200);
  return upload.document.id;
}

describe("documents", () => {
  it("presign, direct upload, confirm, list and signed download", async () => {
    const ana = await createEmployee(admin);
    const upload = await presign(admin, ana.id, { expiresAt: "2027-01-31" });
    expect(upload.document.status).toBe("PENDING_UPLOAD");
    expect(upload.uploadUrl).not.toContain(ana.email);

    expect((await admin.get("/documents").expect(200)).body.data).toEqual([]);
    expect((await put(upload)).status).toBe(200);

    const confirmed = await admin.post(`/documents/${upload.document.id}/confirm`).expect(200);
    expect(confirmed.body.data).toMatchObject({ status: "AVAILABLE", expiresAt: "2027-01-31", size: pdf.length });

    const list = await admin.get(`/documents?employeeId=${ana.id}&type=CONTRACT`).expect(200);
    expect(list.body.data).toEqual([
      expect.objectContaining({ id: upload.document.id, name: "Contrato de trabalho.pdf" }),
    ]);
    expect(list.body.meta.total).toBe(1);
    expect((await admin.get("/documents?expiringBefore=2026-12-31").expect(200)).body.data).toEqual([]);

    const link = await admin.get(`/documents/${upload.document.id}/download-url`).expect(200);
    const file = await fetch(link.body.data.url as string);
    expect(file.status).toBe(200);
    expect(file.headers.get("content-disposition")).toContain("attachment");
    expect(Buffer.from(await file.arrayBuffer())).toEqual(pdf);

    const actions = await app
      .get(PrismaService)
      .auditLog.findMany({ where: { entityId: upload.document.id }, select: { action: true } });
    expect(actions.map((a) => a.action).sort()).toEqual(["DOCUMENT_DOWNLOADED", "DOCUMENT_UPLOADED"]);
  });

  it("refuses files outside the allowlist or above 20 MB", async () => {
    const ana = await createEmployee(admin);
    const body = { employeeId: ana.id, name: "x", type: "OTHER" };
    await admin.post("/documents/presigned-url", { ...body, mimeType: "text/html", size: 10 }).expect(400);
    await admin
      .post("/documents/presigned-url", { ...body, mimeType: "application/pdf", size: 20 * 1024 * 1024 + 1 })
      .expect(400);
    await admin
      .post("/documents/presigned-url", { ...body, employeeId: crypto.randomUUID(), mimeType: "image/png", size: 10 })
      .expect(404);
  });

  it("only confirms an upload that matches what was declared", async () => {
    const ana = await createEmployee(admin);
    const upload = await presign(admin, ana.id);
    await admin.post(`/documents/${upload.document.id}/confirm`).expect(400);

    expect((await put(upload, pdf, { "content-type": "text/html" })).ok).toBe(false);
    expect((await put(upload, Buffer.concat([pdf, pdf]))).ok).toBe(false);
    await admin.post(`/documents/${upload.document.id}/confirm`).expect(400);
  });

  it("delete removes the file and hides the document", async () => {
    const ana = await createEmployee(admin);
    const id = await uploadDocument(admin, ana.id);
    const { storageKey } = await app.get(PrismaService).document.findUniqueOrThrow({ where: { id } });

    await admin.delete(`/documents/${id}`).expect(200);
    await admin.get(`/documents/${id}/download-url`).expect(404);
    await admin.delete(`/documents/${id}`).expect(404);
    expect((await admin.get("/documents").expect(200)).body.data).toEqual([]);
    expect(await app.get(StorageService).head(storageKey)).toBeNull();
  });

  it("employees and managers see only their own documents and can't upload", async () => {
    const manager = await createEmployee(admin);
    const report = await createEmployee(admin, { managerId: manager.id });
    const managerDoc = await uploadDocument(admin, manager.id);
    const reportDoc = await uploadDocument(admin, report.id, { type: "MEDICAL" });

    const managerApi = await giveAccess(app, admin, manager, "MANAGER");
    const reportApi = await giveAccess(app, admin, report, "EMPLOYEE");

    const mine = await reportApi.get("/documents").expect(200);
    expect(mine.body.data.map((d: { id: string }) => d.id)).toEqual([reportDoc]);
    await reportApi.get(`/documents/${reportDoc}/download-url`).expect(200);
    await reportApi.get(`/documents/${managerDoc}/download-url`).expect(404);

    const managers = await managerApi.get("/documents").expect(200);
    expect(managers.body.data.map((d: { id: string }) => d.id)).toEqual([managerDoc]);
    await managerApi.get(`/documents/${reportDoc}/download-url`).expect(404);

    await reportApi.post("/documents/presigned-url", { employeeId: report.id }).expect(403);
    await reportApi.delete(`/documents/${reportDoc}`).expect(403);
  });

  it("is isolated between organizations", async () => {
    const theirs = await uploadDocument(admin, (await createEmployee(admin)).id);
    const other = await signUp(app, "Globex");
    const pending = await presign(admin, (await createEmployee(admin)).id);

    expect((await other.get("/documents").expect(200)).body.data).toEqual([]);
    await other.get(`/documents/${theirs}/download-url`).expect(404);
    await other.post(`/documents/${pending.document.id}/confirm`).expect(404);
    await other.delete(`/documents/${theirs}`).expect(404);
  });

  it("purges uploads left pending for more than 24 hours", async () => {
    const ana = await createEmployee(admin);
    const stale = await presign(admin, ana.id);
    await put(stale);
    const kept = await uploadDocument(admin, ana.id);
    const prisma = app.get(PrismaService);
    const { storageKey } = await prisma.document.findUniqueOrThrow({ where: { id: stale.document.id } });

    const docs = app.get(DocumentsService);
    expect(await docs.purgeStaleUploads()).toBe(0);
    expect(await docs.purgeStaleUploads(new Date(Date.now() + 25 * 60 * 60 * 1000))).toBe(1);

    expect(await prisma.document.findUnique({ where: { id: stale.document.id } })).toBeNull();
    expect(await prisma.document.findUnique({ where: { id: kept } })).not.toBeNull();
    expect(await app.get(StorageService).head(storageKey)).toBeNull();
  });
});
