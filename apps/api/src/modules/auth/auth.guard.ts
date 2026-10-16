import { HttpStatus, Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ErrorCode } from "@lobby/types";
import type { FastifyRequest } from "fastify";
import { ClsService } from "nestjs-cls";
import type { AppClsStore } from "../../common/context.js";
import { IS_PUBLIC } from "../../common/decorators.js";
import { AppException } from "../../common/errors.js";
import { PrismaService } from "../../prisma.service.js";
import { verifyAccessToken } from "./tokens.js";

export const unauthorized = () =>
  new AppException(ErrorCode.UNAUTHORIZED, "Authentication required", HttpStatus.UNAUTHORIZED);

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly cls: ClsService<AppClsStore>,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<FastifyRequest>();
    this.cls.set("meta", { ipAddress: req.ip, userAgent: req.headers["user-agent"]?.slice(0, 512) });
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()])) return true;

    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (!token) throw unauthorized();

    const payload = await verifyAccessToken(token).catch(() => null);
    if (!payload?.mid) throw unauthorized();

    const membership = await this.prisma.organizationMembership.findFirst({
      where: { id: payload.mid, status: "ACTIVE", user: { status: "ACTIVE" } },
      select: { id: true, userId: true, organizationId: true, role: true },
    });
    if (!membership) throw unauthorized();

    this.cls.set("auth", {
      userId: membership.userId,
      organizationId: membership.organizationId,
      membershipId: membership.id,
      role: membership.role,
    });
    return true;
  }
}
