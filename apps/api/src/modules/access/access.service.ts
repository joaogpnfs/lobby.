import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import {
  ErrorCode,
  type AcceptInvitationInput,
  type CreatedInvitation,
  type CreateInvitationInput,
  type InvitationDto,
  type InvitationPreview,
  type ListQuery,
  type MemberDto,
  type UpdateMemberInput,
} from "@lobby/types";
import { hash, verify } from "@node-rs/argon2";
import { RequestContext } from "../../common/context.js";
import { AppException, conflict, forbidden, notFound } from "../../common/errors.js";
import { Page, paging } from "../../common/pagination.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { env } from "../../env.js";
import { PrismaService } from "../../prisma.service.js";
import { AuditService } from "../audit/audit.service.js";
import { AuthService, type Session } from "../auth/auth.service.js";
import { hashToken, newRefreshToken } from "../auth/tokens.js";
import { personName, personRef } from "../employees/employee.mapper.js";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const invitationSelect = {
  id: true,
  email: true,
  role: true,
  expiresAt: true,
  createdAt: true,
  employee: { select: personName },
} satisfies Prisma.InvitationSelect;

const toInvitation = (i: Prisma.InvitationGetPayload<{ select: typeof invitationSelect }>): InvitationDto => ({
  id: i.id,
  email: i.email,
  role: i.role,
  employee: i.employee && personRef(i.employee),
  expiresAt: i.expiresAt.toISOString(),
  createdAt: i.createdAt.toISOString(),
});

const memberSelect = {
  id: true,
  role: true,
  status: true,
  user: { select: { name: true, email: true } },
} satisfies Prisma.OrganizationMembershipSelect;

const toMember = ({
  user,
  ...m
}: Prisma.OrganizationMembershipGetPayload<{ select: typeof memberSelect }>): MemberDto => ({
  ...m,
  ...user,
});

const invalidInvitation = () =>
  new AppException(ErrorCode.NOT_FOUND, "Invitation not found or expired", HttpStatus.NOT_FOUND);

// Who gets into an organization: invitations (by link) and the memberships they create.
@Injectable()
export class AccessService {
  private readonly logger = new Logger(AccessService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly auth: AuthService,
    private readonly ctx: RequestContext,
  ) {}

  async invite(input: CreateInvitationInput): Promise<CreatedInvitation> {
    const { organizationId, userId, role } = this.ctx.auth;
    // No privilege escalation: only an admin can hand out admin.
    if (input.role === "ORG_ADMIN" && role !== "ORG_ADMIN") throw forbidden("Only an admin can invite another admin");

    if (input.employeeId) {
      const employee = await this.prisma.employee.findFirst({
        where: { id: input.employeeId, organizationId, deletedAt: null },
        select: { userId: true, status: true },
      });
      if (!employee) throw notFound("Employee");
      if (employee.userId) throw conflict("This employee already has access");
      if (employee.status === "TERMINATED") throw conflict("This employee was terminated");
    }
    const member = await this.prisma.organizationMembership.count({
      where: { organizationId, status: "ACTIVE", user: { email: input.email } },
    });
    if (member) throw conflict("This person is already a member");

    const token = newRefreshToken();
    const invitation = await this.prisma.$transaction(async (tx) => {
      // One live invitation per email: a new one replaces the old link.
      await tx.invitation.updateMany({
        where: { organizationId, email: input.email, acceptedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      const created = await tx.invitation.create({
        data: {
          ...input,
          organizationId,
          invitedById: userId,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
        },
        select: invitationSelect,
      });
      await this.audit.record("INVITATION_CREATED", "Invitation", created.id, { role: input.role }, tx);
      return created;
    });

    const url = `${env.APP_URL}/invite/${token}`;
    // ponytail: no email provider yet (PROJECT_PLAN §15.5); the inviter copies the link. Send it by email once chosen.
    if (env.NODE_ENV === "development") this.logger.log(`Invitation link for ${input.email}: ${url}`);
    return { ...toInvitation(invitation), url };
  }

  async pendingInvitations(): Promise<InvitationDto[]> {
    const rows = await this.prisma.invitation.findMany({
      where: {
        organizationId: this.ctx.auth.organizationId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: invitationSelect,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toInvitation);
  }

  async revokeInvitation(id: string) {
    const { count } = await this.prisma.invitation.updateMany({
      where: { id, organizationId: this.ctx.auth.organizationId, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (!count) throw notFound("Invitation");
    await this.audit.record("INVITATION_REVOKED", "Invitation", id);
    return null;
  }

  // Public: what the invitee sees on the acceptance page.
  async preview(token: string): Promise<InvitationPreview> {
    const invitation = await this.findLive(token);
    const account = await this.prisma.user.count({ where: { email: invitation.email } });
    return {
      organizationName: invitation.organization.name,
      email: invitation.email,
      role: invitation.role,
      hasAccount: account > 0,
    };
  }

  // Public: creates the account (or confirms the existing one), the membership, links the employee, and logs in.
  async accept(input: AcceptInvitationInput): Promise<Session> {
    const invitation = await this.findLive(input.token);
    const { organizationId, email, role, employeeId } = invitation;

    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, status: true, passwordHash: true },
    });
    if (existing) {
      const valid = existing.passwordHash && (await verify(existing.passwordHash, input.password));
      if (!valid || existing.status !== "ACTIVE") {
        throw new AppException(ErrorCode.UNAUTHORIZED, "Invalid email or password", HttpStatus.UNAUTHORIZED);
      }
    } else if (!input.name) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, "Name is required", HttpStatus.BAD_REQUEST, [
        { path: "name", message: "Required" },
      ]);
    }
    const passwordHash = existing ? null : await hash(input.password);

    const membership = await this.prisma.$transaction(async (tx) => {
      // Conditional update: the same link can't be used twice, even concurrently.
      const { count } = await tx.invitation.updateMany({
        where: { id: invitation.id, acceptedAt: null, revokedAt: null },
        data: { acceptedAt: new Date() },
      });
      if (!count) throw invalidInvitation();

      const userId =
        existing?.id ??
        (await tx.user.create({ data: { email, name: input.name!, passwordHash }, select: { id: true } })).id;

      const current = await tx.organizationMembership.findUnique({
        where: { userId_organizationId: { userId, organizationId } },
      });
      if (current?.status === "ACTIVE") throw conflict("You are already a member of this organization");
      const m = current
        ? await tx.organizationMembership.update({ where: { id: current.id }, data: { role, status: "ACTIVE" } })
        : await tx.organizationMembership.create({ data: { userId, organizationId, role } });

      if (employeeId) {
        const linked = await tx.employee.updateMany({
          where: { id: employeeId, organizationId, deletedAt: null, userId: null },
          data: { userId },
        });
        if (!linked.count) throw conflict("This employee already has access");
      }
      await this.audit.log(
        {
          organizationId,
          actorId: userId,
          action: "INVITATION_ACCEPTED",
          entity: "Invitation",
          entityId: invitation.id,
        },
        tx,
      );
      return m;
    });
    return this.auth.startSession(membership);
  }

  async members(query: ListQuery) {
    const where: Prisma.OrganizationMembershipWhereInput = {
      organizationId: this.ctx.auth.organizationId,
      ...(query.q && {
        user: {
          OR: [
            { name: { contains: query.q, mode: "insensitive" } },
            { email: { contains: query.q, mode: "insensitive" } },
          ],
        },
      }),
    };
    const [rows, total] = await Promise.all([
      this.prisma.organizationMembership.findMany({
        where,
        select: memberSelect,
        orderBy: { user: { name: "asc" } },
        ...paging(query),
      }),
      this.prisma.organizationMembership.count({ where }),
    ]);
    return new Page(rows.map(toMember), { page: query.page, pageSize: query.pageSize, total });
  }

  async updateMember(id: string, input: UpdateMemberInput): Promise<MemberDto> {
    const { organizationId, membershipId } = this.ctx.auth;
    // Changing your own role or access could lock the organization out of its last admin.
    if (id === membershipId) throw forbidden("You can't change your own access");
    const found = await this.prisma.organizationMembership.count({ where: { id, organizationId } });
    if (!found) throw notFound("Member");
    return this.prisma.$transaction(async (tx) => {
      const m = await tx.organizationMembership.update({
        where: { id },
        data: input,
        select: memberSelect,
      });
      await this.audit.record("MEMBER_UPDATED", "OrganizationMembership", id, { ...input }, tx);
      return toMember(m);
    });
  }

  private async findLive(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { organization: { select: { name: true } } },
    });
    if (!invitation || invitation.acceptedAt || invitation.revokedAt || invitation.expiresAt < new Date()) {
      throw invalidInvitation();
    }
    return invitation;
  }
}
