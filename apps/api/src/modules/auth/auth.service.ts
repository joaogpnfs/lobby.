import { randomUUID } from "node:crypto";
import { HttpStatus, Injectable } from "@nestjs/common";
import { ErrorCode, ROLE_PERMISSIONS, type LoginInput, type Me, type RegisterInput } from "@lobby/types";
import { hash, verify } from "@node-rs/argon2";
import type { AuthContext } from "../../common/context.js";
import { AppException } from "../../common/errors.js";
import { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma.service.js";
import { AuditService } from "../audit/audit.service.js";
import { unauthorized } from "./auth.guard.js";
import { hashToken, newRefreshToken, REFRESH_TOKEN_TTL_MS, signAccessToken } from "./tokens.js";

export type Session = { accessToken: string; refreshToken: string };

export type MembershipRef = { id: string; userId: string; organizationId: string; role: AuthContext["role"] };

const DUMMY_HASH = await hash("lobby-timing-equalizer");

const invalidCredentials = () =>
  new AppException(ErrorCode.UNAUTHORIZED, "Invalid email or password", HttpStatus.UNAUTHORIZED);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async register(input: RegisterInput): Promise<Session> {
    const passwordHash = await hash(input.password);
    try {
      const membership = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({ data: { email: input.email, name: input.name, passwordHash } });
        const org = await tx.organization.create({ data: { name: input.organizationName } });
        const m = await tx.organizationMembership.create({
          data: { userId: user.id, organizationId: org.id, role: "ORG_ADMIN" },
        });
        await this.audit.log(
          {
            organizationId: org.id,
            actorId: user.id,
            action: "ORGANIZATION_REGISTERED",
            entity: "Organization",
            entityId: org.id,
          },
          tx,
        );
        return m;
      });
      return this.startSession(membership);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new AppException(ErrorCode.CONFLICT, "Email already registered", HttpStatus.CONFLICT);
      }
      throw err;
    }
  }

  async login(input: LoginInput): Promise<Session> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: {
        id: true,
        status: true,
        passwordHash: true,
        memberships: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    const valid = await verify(user?.passwordHash ?? DUMMY_HASH, input.password);
    const membership = user?.memberships[0];
    if (!valid || !user || user.status !== "ACTIVE" || !membership) throw invalidCredentials();

    await this.audit.log({
      organizationId: membership.organizationId,
      actorId: user.id,
      action: "LOGIN",
      entity: "User",
      entityId: user.id,
    });
    return this.startSession(membership);
  }

  async refresh(refreshToken: string): Promise<Session> {
    const current = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { membership: { include: { user: { select: { status: true } } } } },
    });
    if (!current) throw unauthorized();

    if (current.revokedAt) {
      await this.revokeFamily(current.familyId);
      throw unauthorized();
    }
    const { membership } = current;
    if (current.expiresAt < new Date() || membership.status !== "ACTIVE" || membership.user.status !== "ACTIVE") {
      throw unauthorized();
    }

    const next = newRefreshToken();
    await this.prisma.$transaction(async (tx) => {
      const created = await tx.refreshToken.create({ data: this.tokenRow(membership, next, current.familyId) });
      const { count } = await tx.refreshToken.updateMany({
        where: { id: current.id, revokedAt: null },
        data: { revokedAt: new Date(), replacedById: created.id },
      });
      if (count === 0) throw unauthorized();
    });

    return { accessToken: await this.accessTokenFor(membership), refreshToken: next };
  }

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return;
    const token = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(refreshToken) } });
    if (token) await this.revokeFamily(token.familyId);
  }

  async me(ctx: AuthContext): Promise<Me> {
    const [m, employee] = await Promise.all([
      this.prisma.organizationMembership.findUniqueOrThrow({
        where: { id: ctx.membershipId },
        select: {
          role: true,
          user: { select: { id: true, name: true, email: true, avatarUrl: true, linkedinSub: true } },
          organization: { select: { id: true, name: true } },
        },
      }),
      this.prisma.employee.findFirst({
        where: { organizationId: ctx.organizationId, userId: ctx.userId, deletedAt: null },
        select: { id: true },
      }),
    ]);
    const { linkedinSub, ...user } = m.user;
    return {
      user: { ...user, linkedinConnected: linkedinSub !== null },
      employeeId: employee?.id ?? null,
      organization: m.organization,
      role: m.role,
      permissions: ROLE_PERMISSIONS[m.role],
    };
  }

  async startSession(membership: MembershipRef): Promise<Session> {
    const refreshToken = newRefreshToken();
    await this.prisma.refreshToken.create({ data: this.tokenRow(membership, refreshToken, randomUUID()) });
    return { accessToken: await this.accessTokenFor(membership), refreshToken };
  }

  private tokenRow(membership: MembershipRef, token: string, familyId: string) {
    return {
      userId: membership.userId,
      membershipId: membership.id,
      tokenHash: hashToken(token),
      familyId,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    };
  }

  private accessTokenFor(m: MembershipRef) {
    return signAccessToken({ sub: m.userId, mid: m.id, org: m.organizationId, role: m.role });
  }

  private revokeFamily(familyId: string) {
    return this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
