import { Injectable } from "@nestjs/common";
import type { NotificationDto, NotificationList, NotificationType } from "@lobby/types";
import { RequestContext } from "../../common/context.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma.service.js";

const LIST_SIZE = 30;

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: RequestContext,
  ) {}

  async notify(tx: Prisma.TransactionClient, userIds: string[], type: NotificationType, data: NotificationDto["data"]) {
    const { organizationId, userId: actorId } = this.ctx.auth;
    const recipients = [...new Set(userIds)].filter((id) => id !== actorId);
    if (!recipients.length) return;
    await tx.notification.createMany({ data: recipients.map((userId) => ({ organizationId, userId, type, data })) });
  }

  async list(): Promise<NotificationList> {
    const where = this.mine();
    const [rows, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        select: { id: true, type: true, data: true, readAt: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: LIST_SIZE,
      }),
      this.prisma.notification.count({ where: { ...where, readAt: null } }),
    ]);
    return {
      items: rows.map((n) => ({
        ...n,
        type: n.type as NotificationType,
        data: n.data as NotificationDto["data"],
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
      })),
      unread,
    };
  }

  async readAll() {
    await this.prisma.notification.updateMany({
      where: { ...this.mine(), readAt: null },
      data: { readAt: new Date() },
    });
    return null;
  }

  private mine() {
    const { organizationId, userId } = this.ctx.auth;
    return { organizationId, userId };
  }
}
