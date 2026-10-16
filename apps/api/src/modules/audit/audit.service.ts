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
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: RequestContext,
  ) {}

  async log(entry: AuditEntry, tx: Prisma.TransactionClient = this.prisma) {
    await tx.auditLog.create({ data: { ...this.ctx.meta, ...entry } });
  }

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
