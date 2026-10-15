import { HttpStatus, Injectable } from "@nestjs/common";
import {
  EMPLOYEE_SCOPE,
  ErrorCode,
  type CreateEmployeeInput,
  type EmployeeDto,
  type EmployeeListQuery,
  type TerminateEmployeeInput,
  type UpdateEmployeeInput,
} from "@lobby/types";
import { RequestContext } from "../../common/context.js";
import { AppException, notFound } from "../../common/errors.js";
import { Page, paging } from "../../common/pagination.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma.service.js";
import { AuditService } from "../audit/audit.service.js";
import { detailSelect, isoDate, listSelect, toDate, toDetail, toListItem } from "./employee.mapper.js";

const invalid = (message: string) => new AppException(ErrorCode.VALIDATION_ERROR, message, HttpStatus.BAD_REQUEST);

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly ctx: RequestContext,
  ) {}

  async list(query: EmployeeListQuery) {
    const { q, status, departmentId, positionId, branchId, managerId } = query;
    const where: Prisma.EmployeeWhereInput = {
      AND: [
        await this.visibleWhere(),
        { status, departmentId, positionId, branchId, managerId },
        q
          ? {
              OR: [
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
                { preferredName: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    };
    const [rows, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        select: listSelect,
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }, { id: "asc" }],
        ...paging(query),
      }),
      this.prisma.employee.count({ where }),
    ]);
    return new Page(rows.map(toListItem), { page: query.page, pageSize: query.pageSize, total });
  }

  async get(id: string): Promise<EmployeeDto> {
    const visible = await this.visibleWhere();
    const row = await this.prisma.employee.findFirst({ where: { AND: [visible, { id }] }, select: detailSelect });
    if (!row) throw notFound("Employee");
    return toDetail(row, await this.seesSensitive(id));
  }

  async create(input: CreateEmployeeInput): Promise<EmployeeDto> {
    const { organizationId } = this.ctx.auth;
    await this.assertReferences(input);
    const id = await this.prisma.$transaction(async (tx) => {
      const row = await tx.employee.create({
        data: { ...input, ...this.dates(input), hireDate: toDate(input.hireDate), organizationId },
        select: { id: true },
      });
      await this.audit.record("EMPLOYEE_CREATED", "Employee", row.id, undefined, tx);
      return row.id;
    });
    return this.get(id);
  }

  async update(id: string, input: UpdateEmployeeInput): Promise<EmployeeDto> {
    const current = await this.findOwn(id);
    if (current.status === "TERMINATED" && input.status) throw invalid("A terminated employee's status can't change");
    await this.assertReferences(input, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.employee.update({ where: { id }, data: { ...input, ...this.dates(input) } });
      // Field names only: values may be personal data.
      await this.audit.record("EMPLOYEE_UPDATED", "Employee", id, { fields: Object.keys(input) }, tx);
    });
    return this.get(id);
  }

  // Desligamento: keeps the record and history, and cuts the person's access to the system.
  async terminate(id: string, input: TerminateEmployeeInput): Promise<EmployeeDto> {
    const current = await this.findOwn(id);
    if (current.status === "TERMINATED") throw invalid("Employee is already terminated");
    if (input.terminationDate < isoDate(current.hireDate)) {
      throw invalid("Termination date is before the hire date");
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id },
        data: { status: "TERMINATED", terminationDate: toDate(input.terminationDate), terminationReason: input.reason },
      });
      await this.revokeAccess(tx, current.userId);
      await this.audit.record("EMPLOYEE_TERMINATED", "Employee", id, undefined, tx);
    });
    return this.get(id);
  }

  // Soft delete (history stays for the audit log). Direct reports and departments lose this manager.
  async remove(id: string) {
    const current = await this.findOwn(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.employee.update({ where: { id }, data: { deletedAt: new Date() } });
      await tx.employee.updateMany({ where: { managerId: id }, data: { managerId: null } });
      await tx.department.updateMany({ where: { managerId: id }, data: { managerId: null } });
      await this.revokeAccess(tx, current.userId);
      await this.audit.record("EMPLOYEE_DELETED", "Employee", id, undefined, tx);
    });
    return null;
  }

  // Tenant + role scope for reads: everyone (HR), self and direct reports (manager), or self.
  private async visibleWhere(): Promise<Prisma.EmployeeWhereInput> {
    const { organizationId, role } = this.ctx.auth;
    const base = { organizationId, deletedAt: null };
    const scope = EMPLOYEE_SCOPE[role];
    if (scope === "all") return base;
    const me = await this.myEmployeeId();
    if (!me) return { id: { in: [] } };
    return scope === "team" ? { ...base, OR: [{ id: me }, { managerId: me }] } : { ...base, id: me };
  }

  private async seesSensitive(employeeId: string) {
    return EMPLOYEE_SCOPE[this.ctx.auth.role] === "all" || (await this.myEmployeeId()) === employeeId;
  }

  private async myEmployeeId() {
    const { organizationId, userId } = this.ctx.auth;
    const me = await this.prisma.employee.findFirst({
      where: { organizationId, userId, deletedAt: null },
      select: { id: true },
    });
    return me?.id ?? null;
  }

  // Writes are HR-only (checked by permission), so the tenant filter is the only scope here.
  private async findOwn(id: string) {
    const row = await this.prisma.employee.findFirst({
      where: { id, organizationId: this.ctx.auth.organizationId, deletedAt: null },
      select: { id: true, status: true, hireDate: true, userId: true },
    });
    if (!row) throw notFound("Employee");
    return row;
  }

  // Every id from the body must belong to this organization; a foreign one is reported as not found.
  private async assertReferences(input: UpdateEmployeeInput, selfId?: string) {
    const organizationId = this.ctx.auth.organizationId;
    const { departmentId, positionId, branchId, managerId } = input;
    const [dept, pos, branch, manager] = await Promise.all([
      departmentId ? this.prisma.department.count({ where: { id: departmentId, organizationId } }) : 1,
      positionId ? this.prisma.position.count({ where: { id: positionId, organizationId } }) : 1,
      branchId ? this.prisma.branch.count({ where: { id: branchId, organizationId } }) : 1,
      managerId ? this.prisma.employee.count({ where: { id: managerId, organizationId, deletedAt: null } }) : 1,
    ]);
    if (!dept) throw notFound("Department");
    if (!pos) throw notFound("Position");
    if (!branch) throw notFound("Branch");
    if (!manager) throw notFound("Manager");
    if (managerId && selfId) await this.assertNoManagerCycle(selfId, managerId);
  }

  // Walks up from the new manager; reaching the employee means they would manage themselves.
  private async assertNoManagerCycle(employeeId: string, managerId: string) {
    let cursor: string | null = managerId;
    for (let depth = 0; cursor && depth < 100; depth++) {
      if (cursor === employeeId)
        throw invalid("An employee can't report to themself or to someone who reports to them");
      const next: { managerId: string | null } | null = await this.prisma.employee.findUnique({
        where: { id: cursor },
        select: { managerId: true },
      });
      cursor = next?.managerId ?? null;
    }
  }

  private async revokeAccess(tx: Prisma.TransactionClient, userId: string | null) {
    if (!userId) return;
    await tx.organizationMembership.updateMany({
      where: { userId, organizationId: this.ctx.auth.organizationId },
      data: { status: "DISABLED" },
    });
  }

  // ISO date strings from the API become Date values for @db.Date columns; undefined leaves them unchanged.
  private dates({ birthDate, hireDate }: UpdateEmployeeInput) {
    return {
      birthDate: birthDate === undefined ? undefined : birthDate ? toDate(birthDate) : null,
      hireDate: hireDate === undefined ? undefined : toDate(hireDate),
    };
  }
}
