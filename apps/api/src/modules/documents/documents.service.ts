import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import {
  EMPLOYEE_SCOPE,
  type CreateDocumentInput,
  type DocumentDto,
  type DocumentListQuery,
  type DocumentUpload,
  type SignedUrl,
} from "@lobby/types";
import { RequestContext } from "../../common/context.js";
import { invalid, notFound } from "../../common/errors.js";
import { Page, paging } from "../../common/pagination.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma.service.js";
import { AuditService } from "../audit/audit.service.js";
import { isoDate, personName, personRef, toDate } from "../employees/employee.mapper.js";
import { StorageService } from "./storage.service.js";

const STALE_UPLOAD_MS = 24 * 60 * 60 * 1000;

const select = {
  id: true,
  name: true,
  type: true,
  mimeType: true,
  size: true,
  status: true,
  storageKey: true,
  expiresAt: true,
  createdAt: true,
  employee: { select: personName },
  uploadedBy: { select: { id: true, name: true } },
} satisfies Prisma.DocumentSelect;
type Row = Prisma.DocumentGetPayload<{ select: typeof select }>;

function toDto(d: Row): DocumentDto {
  return {
    id: d.id,
    name: d.name,
    type: d.type,
    mimeType: d.mimeType,
    size: d.size,
    status: d.status === "AVAILABLE" ? "AVAILABLE" : "PENDING_UPLOAD",
    expiresAt: d.expiresAt && isoDate(d.expiresAt),
    employee: personRef(d.employee),
    uploadedBy: d.uploadedBy,
    createdAt: d.createdAt.toISOString(),
  };
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
    private readonly ctx: RequestContext,
  ) {}

  async list(query: DocumentListQuery) {
    const { q, employeeId, type, expiringBefore } = query;
    const where: Prisma.DocumentWhereInput = {
      AND: [
        this.visibleWhere(),
        { employeeId, type },
        expiringBefore ? { expiresAt: { lte: toDate(expiringBefore) } } : {},
        q ? { name: { contains: q, mode: "insensitive" } } : {},
      ],
    };
    const [rows, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        select,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        ...paging(query),
      }),
      this.prisma.document.count({ where }),
    ]);
    return new Page(rows.map(toDto), { page: query.page, pageSize: query.pageSize, total });
  }

  async create(input: CreateDocumentInput): Promise<DocumentUpload> {
    const { organizationId, userId } = this.ctx.auth;
    const employee = await this.prisma.employee.count({
      where: { id: input.employeeId, organizationId, deletedAt: null },
    });
    if (!employee) throw notFound("Employee");

    const id = randomUUID();
    const row = await this.prisma.document.create({
      data: {
        ...input,
        id,
        organizationId,
        uploadedById: userId,
        storageKey: `${organizationId}/${input.employeeId}/${id}`,
        expiresAt: input.expiresAt ? toDate(input.expiresAt) : null,
      },
      select,
    });
    return {
      document: toDto(row),
      uploadUrl: await this.storage.uploadUrl(row.storageKey, row.mimeType, row.size),
      headers: { "content-type": row.mimeType },
    };
  }

  async confirm(id: string): Promise<DocumentDto> {
    const doc = await this.findOwn(id);
    if (doc.status === "AVAILABLE") return toDto(doc);

    const stored = await this.storage.head(doc.storageKey);
    if (!stored) throw invalid("The file was not uploaded yet");
    if (stored.size !== doc.size || stored.mimeType !== doc.mimeType) {
      await this.storage.remove(doc.storageKey);
      throw invalid("The uploaded file does not match the declared size or type");
    }

    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.document.update({ where: { id }, data: { status: "AVAILABLE" }, select });
      await this.audit.record("DOCUMENT_UPLOADED", "Document", id, { type: doc.type, employeeId: doc.employee.id }, tx);
      return updated;
    });
    return toDto(row);
  }

  async downloadUrl(id: string): Promise<SignedUrl> {
    const doc = await this.prisma.document.findFirst({ where: { AND: [this.visibleWhere(), { id }] }, select });
    if (!doc) throw notFound("Document");
    const url = await this.storage.downloadUrl(doc.storageKey, doc.name, doc.mimeType);
    await this.audit.record("DOCUMENT_DOWNLOADED", "Document", id);
    return { url };
  }

  async remove(id: string) {
    const doc = await this.findOwn(id);
    await this.storage.remove(doc.storageKey);
    await this.prisma.$transaction(async (tx) => {
      await tx.document.update({ where: { id }, data: { status: "DELETED" } });
      await this.audit.record("DOCUMENT_DELETED", "Document", id, { type: doc.type, employeeId: doc.employee.id }, tx);
    });
    return null;
  }

  async purgeStaleUploads(now = new Date()) {
    const stale = await this.prisma.document.findMany({
      where: { status: "PENDING_UPLOAD", createdAt: { lt: new Date(now.getTime() - STALE_UPLOAD_MS) } },
      select: { id: true, storageKey: true },
      take: 500,
    });
    for (const doc of stale) await this.storage.remove(doc.storageKey);
    await this.prisma.document.deleteMany({ where: { id: { in: stale.map((d) => d.id) } } });
    return stale.length;
  }

  private visibleWhere(): Prisma.DocumentWhereInput {
    const { organizationId, userId, role } = this.ctx.auth;
    const base = { organizationId, status: "AVAILABLE" as const };
    if (EMPLOYEE_SCOPE[role] === "all") return { ...base, employee: { deletedAt: null } };
    return { ...base, employee: { userId, deletedAt: null } };
  }

  private async findOwn(id: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, organizationId: this.ctx.auth.organizationId, status: { not: "DELETED" } },
      select,
    });
    if (!doc) throw notFound("Document");
    return doc;
  }
}
