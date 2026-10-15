import { Injectable } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client.js";
import { RequestContext } from "../../common/context.js";
import { PrismaService } from "../../prisma.service.js";

export type AuditEntry = {
  organizationId: string;
  actorId: string | null;
  action: string;
  entity: string;
  entityId?: string;
  // Never passwords, tokens or personal documents.
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
};

// Append-only log. Pass the transaction client so the entry commits (or rolls back) with the change it describes.
@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: RequestContext,
  ) {}

  // IP and user agent come from the current request unless given.
  async log(entry: AuditEntry, tx: Prisma.TransactionClient = this.prisma) {
    await tx.auditLog.create({ data: { ...this.ctx.meta, ...entry } });
  }

  // Shorthand for the authenticated caller acting on their own organization.
  async record(
    action: string,
    entity: string,
    entityId: string,
    metadata?: Prisma.InputJsonValue,
    tx?: Prisma.TransactionClient,
  ) {
    const { organizationId, userId } = this.ctx.auth;
    await this.log({ organizationId, actorId: userId, action, entity, entityId, metadata }, tx);
  }
}
