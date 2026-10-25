import { Injectable } from "@nestjs/common";
import {
  EMPLOYEE_SCOPE,
  ROLE_PERMISSIONS,
  vacationDays,
  type CreateVacationInput,
  type NotificationType,
  type VacationDto,
  type VacationListQuery,
  type VacationSummary,
} from "@lobby/types";
import { RequestContext } from "../../common/context.js";
import { conflict, forbidden, invalid, notFound } from "../../common/errors.js";
import { Page, paging } from "../../common/pagination.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma.service.js";
import { AuditService } from "../audit/audit.service.js";
import { displayName, isoDate, personName, personRef, toDate } from "../employees/employee.mapper.js";
import { NotificationsService } from "../notifications/notifications.service.js";

const select = {
  id: true,
  startDate: true,
  endDate: true,
  days: true,
  status: true,
  reason: true,
  decisionNote: true,
  decidedAt: true,
  createdAt: true,
  employee: { select: { ...personName, managerId: true, userId: true } },
  decidedBy: { select: { id: true, name: true } },
} satisfies Prisma.VacationRequestSelect;
type Row = Prisma.VacationRequestGetPayload<{ select: typeof select }>;

type Viewer = { me: string | null; today: string };

const isOverlap = (err: unknown) => err instanceof Error && err.message.includes("VacationRequest_no_overlap");

@Injectable()
export class VacationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly ctx: RequestContext,
  ) {}

  async list(query: VacationListQuery) {
    const viewer = await this.viewer();
    const { status, employeeId, awaitingMe } = query;
    const where: Prisma.VacationRequestWhereInput = {
      AND: [this.visibleWhere(viewer.me), { status, employeeId }, awaitingMe ? this.awaitingWhere(viewer.me) : {}],
    };
    const [rows, total] = await Promise.all([
      this.prisma.vacationRequest.findMany({
        where,
        select,
        orderBy: [{ startDate: "desc" }, { id: "asc" }],
        ...paging(query),
      }),
      this.prisma.vacationRequest.count({ where }),
    ]);
    return new Page(
      rows.map((r) => this.toDto(r, viewer)),
      { page: query.page, pageSize: query.pageSize, total },
    );
  }

  async summary(): Promise<VacationSummary> {
    const viewer = await this.viewer();
    const today = toDate(viewer.today);
    const visible = this.visibleWhere(viewer.me);
    const [away, awaitingMe, mine] = await Promise.all([
      this.prisma.vacationRequest.findMany({
        where: { AND: [visible, { status: "APPROVED", startDate: { lte: today }, endDate: { gte: today } }] },
        select: { employee: { select: personName } },
        orderBy: { endDate: "asc" },
        take: 20,
      }),
      this.prisma.vacationRequest.count({ where: { AND: [visible, this.awaitingWhere(viewer.me)] } }),
      viewer.me
        ? this.prisma.vacationRequest.findMany({
            where: { employeeId: viewer.me, status: { in: ["PENDING", "APPROVED"] }, endDate: { gte: today } },
            select,
            orderBy: { startDate: "asc" },
            take: 3,
          })
        : [],
    ]);
    return {
      onVacationToday: away.map((v) => personRef(v.employee)),
      awaitingMe,
      mine: mine.map((r) => this.toDto(r, viewer)),
    };
  }

  async create(input: CreateVacationInput): Promise<VacationDto> {
    const viewer = await this.viewer();
    if (!viewer.me) throw forbidden("Only people with an employee record can request vacations");
    if (input.startDate < viewer.today) throw invalid("The vacation can't start in the past");

    const { organizationId } = this.ctx.auth;
    const employee = await this.prisma.employee.findUniqueOrThrow({
      where: { id: viewer.me },
      select: { ...personName, status: true, manager: { select: { userId: true } } },
    });
    if (employee.status === "TERMINATED") throw forbidden();

    const row = await this.prisma
      .$transaction(async (tx) => {
        const created = await tx.vacationRequest.create({
          data: {
            organizationId,
            employeeId: employee.id,
            startDate: toDate(input.startDate),
            endDate: toDate(input.endDate),
            days: vacationDays(input.startDate, input.endDate),
            reason: input.reason,
          },
          select,
        });
        const approvers = employee.manager?.userId ? [employee.manager.userId] : await this.hrUserIds(tx);
        await this.notifications.notify(tx, approvers, "VACATION_REQUESTED", this.payload(created));
        await this.audit.record("VACATION_REQUESTED", "VacationRequest", created.id, { days: created.days }, tx);
        return created;
      })
      .catch((err: unknown) => {
        if (isOverlap(err)) throw conflict("Overlaps another vacation");
        throw err;
      });
    return this.toDto(row, viewer);
  }

  approve(id: string) {
    return this.decide(id, "APPROVED", null);
  }

  reject(id: string, note: string) {
    return this.decide(id, "REJECTED", note);
  }

  async cancel(id: string): Promise<VacationDto> {
    const viewer = await this.viewer();
    const current = await this.findVisible(id, viewer);
    if (!this.canCancel(current, viewer)) throw invalid("This request can no longer be cancelled");
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.vacationRequest.update({ where: { id }, data: { status: "CANCELLED" }, select });
      await this.audit.record("VACATION_CANCELLED", "VacationRequest", id, undefined, tx);
      return updated;
    });
    return this.toDto(row, viewer);
  }

  async completeFinished() {
    return this.prisma.$executeRaw`
      UPDATE "VacationRequest" v SET status = 'COMPLETED', "updatedAt" = now()
      FROM "Organization" o
      WHERE v."organizationId" = o.id AND v.status = 'APPROVED'
        AND v."endDate" < (now() AT TIME ZONE o.timezone)::date`;
  }

  private async decide(id: string, status: "APPROVED" | "REJECTED", note: string | null): Promise<VacationDto> {
    const viewer = await this.viewer();
    const current = await this.findVisible(id, viewer);
    if (current.status !== "PENDING") throw conflict("This request was already decided");
    if (!this.canDecide(current, viewer)) throw forbidden();

    const row = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.vacationRequest.updateMany({
        where: { id, status: "PENDING" },
        data: { status, decisionNote: note, decidedById: this.ctx.auth.userId, decidedAt: new Date() },
      });
      if (!count) throw conflict("This request was already decided");
      const updated = await tx.vacationRequest.findUniqueOrThrow({ where: { id }, select });
      const type: NotificationType = status === "APPROVED" ? "VACATION_APPROVED" : "VACATION_REJECTED";
      if (updated.employee.userId)
        await this.notifications.notify(tx, [updated.employee.userId], type, this.payload(updated));
      await this.audit.record(type, "VacationRequest", id, undefined, tx);
      return updated;
    });
    return this.toDto(row, viewer);
  }

  private toDto(r: Row, viewer: Viewer): VacationDto {
    return {
      id: r.id,
      employee: personRef(r.employee),
      startDate: isoDate(r.startDate),
      endDate: isoDate(r.endDate),
      days: r.days,
      status: r.status,
      reason: r.reason,
      decisionNote: r.decisionNote,
      decidedBy: r.decidedBy,
      decidedAt: r.decidedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      canDecide: this.canDecide(r, viewer),
      canCancel: this.canCancel(r, viewer),
    };
  }

  private canDecide(r: Row, { me }: Viewer) {
    const { role } = this.ctx.auth;
    if (r.status !== "PENDING" || r.employee.id === me || !ROLE_PERMISSIONS[role].includes("vacations:approve")) {
      return false;
    }
    return EMPLOYEE_SCOPE[role] === "all" || (me !== null && r.employee.managerId === me);
  }

  private canCancel(r: Row, { me, today }: Viewer) {
    if (r.employee.id !== me) return false;
    return r.status === "PENDING" || (r.status === "APPROVED" && isoDate(r.startDate) > today);
  }

  private visibleWhere(me: string | null): Prisma.VacationRequestWhereInput {
    const { organizationId, role } = this.ctx.auth;
    const base = { organizationId, employee: { deletedAt: null } };
    const scope = EMPLOYEE_SCOPE[role];
    if (scope === "all") return base;
    if (!me) return { id: { in: [] } };
    if (scope === "self") return { ...base, employeeId: me };
    return { organizationId, employee: { deletedAt: null, OR: [{ id: me }, { managerId: me }] } };
  }

  private awaitingWhere(me: string | null): Prisma.VacationRequestWhereInput {
    const { role } = this.ctx.auth;
    if (!ROLE_PERMISSIONS[role].includes("vacations:approve")) return { id: { in: [] } };
    const others = me ? { employeeId: { not: me } } : {};
    if (EMPLOYEE_SCOPE[role] === "all") return { status: "PENDING", ...others };
    return me ? { status: "PENDING", employee: { managerId: me } } : { id: { in: [] } };
  }

  private async findVisible(id: string, viewer: Viewer) {
    const row = await this.prisma.vacationRequest.findFirst({
      where: { AND: [this.visibleWhere(viewer.me), { id }] },
      select,
    });
    if (!row) throw notFound("Vacation request");
    return row;
  }

  private async viewer(): Promise<Viewer> {
    const { organizationId, userId } = this.ctx.auth;
    const [me, org] = await Promise.all([
      this.prisma.employee.findFirst({ where: { organizationId, userId, deletedAt: null }, select: { id: true } }),
      this.prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { timezone: true } }),
    ]);
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: org.timezone }).format(new Date());
    return { me: me?.id ?? null, today };
  }

  private async hrUserIds(tx: Prisma.TransactionClient) {
    const members = await tx.organizationMembership.findMany({
      where: {
        organizationId: this.ctx.auth.organizationId,
        status: "ACTIVE",
        role: { in: ["ORG_ADMIN", "HR_MANAGER"] },
      },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }

  private payload(r: Row) {
    return {
      vacationId: r.id,
      employeeName: displayName(r.employee),
      startDate: isoDate(r.startDate),
      endDate: isoDate(r.endDate),
    };
  }
}
