import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  branchInputSchema,
  departmentInputSchema,
  listQuerySchema,
  positionInputSchema,
  type DepartmentDto,
  type ListQuery,
} from "@lobby/types";
import { z } from "zod";
import { RequestContext } from "../../common/context.js";
import { RequirePermissions } from "../../common/decorators.js";
import { notFound } from "../../common/errors.js";
import { Page, paging } from "../../common/pagination.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma.service.js";
import { AuditService } from "../audit/audit.service.js";
import { personName, personRef } from "../employees/employee.mapper.js";

// Departments, positions and branches: small per-organization catalogs that employees point to.
// Reading is open to every member (they show up on employee profiles); writing needs org-structure:manage.
// Deleting one that employees still use fails with 409 (foreign key), so nothing is orphaned silently.

const idParam = z.uuid();
const employeeCount = { _count: { select: { employees: { where: { deletedAt: null } } } } } as const;
type Counted = { _count: { employees: number } };

// The Prisma calls the catalogs share. Each model's delegate fits it; the cast only drops Prisma's generics.
type Delegate<R> = {
  findMany(args: object): Promise<R[]>;
  count(args: object): Promise<number>;
  findFirst(args: object): Promise<R | null>;
  create(args: object): Promise<R>;
  update(args: object): Promise<R>;
  delete(args: object): Promise<unknown>;
};

type CatalogOptions<S extends z.ZodObject, R> = {
  path: string;
  entity: string;
  schema: S;
  delegate: (db: Prisma.TransactionClient) => unknown;
  select: object;
  toDto: (row: R) => unknown;
  // Extra checks on ids in the body (they must belong to the caller's organization).
  validate?: (body: Partial<z.infer<S>>, prisma: PrismaService, organizationId: string) => Promise<void>;
};

function catalogController<S extends z.ZodObject, R>(o: CatalogOptions<S, R>) {
  const db = (client: Prisma.TransactionClient) => o.delegate(client) as Delegate<R>;
  const action = o.entity.toUpperCase();

  @ApiTags(o.path)
  @ApiBearerAuth()
  @Controller(o.path)
  class CatalogController {
    constructor(
      readonly prisma: PrismaService,
      readonly audit: AuditService,
      readonly ctx: RequestContext,
    ) {}

    @Get()
    async list(@Query({ schema: listQuerySchema }) query: ListQuery) {
      const where = {
        organizationId: this.ctx.auth.organizationId,
        ...(query.q && { name: { contains: query.q, mode: "insensitive" } }),
      };
      const [rows, total] = await Promise.all([
        db(this.prisma).findMany({ where, select: o.select, orderBy: { name: "asc" }, ...paging(query) }),
        db(this.prisma).count({ where }),
      ]);
      return new Page(rows.map(o.toDto), { page: query.page, pageSize: query.pageSize, total });
    }

    @Get(":id")
    async get(@Param("id", { schema: idParam }) id: string) {
      const row = await db(this.prisma).findFirst({
        where: { id, organizationId: this.ctx.auth.organizationId },
        select: o.select,
      });
      if (!row) throw notFound(o.entity);
      return o.toDto(row);
    }

    @Post()
    @RequirePermissions("org-structure:manage")
    async create(@Body({ schema: o.schema }) body: z.infer<S>) {
      const { organizationId } = this.ctx.auth;
      await o.validate?.(body, this.prisma, organizationId);
      return this.prisma.$transaction(async (tx) => {
        const row = await db(tx).create({ data: { ...body, organizationId }, select: o.select });
        await this.audit.record(`${action}_CREATED`, o.entity, (row as { id: string }).id, undefined, tx);
        return o.toDto(row);
      });
    }

    @Patch(":id")
    @RequirePermissions("org-structure:manage")
    async update(
      @Param("id", { schema: idParam }) id: string,
      @Body({ schema: o.schema.partial() }) body: Partial<z.infer<S>>,
    ) {
      await this.get(id);
      await o.validate?.(body, this.prisma, this.ctx.auth.organizationId);
      return this.prisma.$transaction(async (tx) => {
        const row = await db(tx).update({ where: { id }, data: body, select: o.select });
        await this.audit.record(`${action}_UPDATED`, o.entity, id, { fields: Object.keys(body) }, tx);
        return o.toDto(row);
      });
    }

    @Delete(":id")
    @HttpCode(HttpStatus.OK)
    @RequirePermissions("org-structure:manage")
    async remove(@Param("id", { schema: idParam }) id: string): Promise<null> {
      await this.get(id);
      await this.prisma.$transaction(async (tx) => {
        await db(tx).delete({ where: { id } });
        await this.audit.record(`${action}_DELETED`, o.entity, id, undefined, tx);
      });
      return null;
    }
  }
  // Distinct names keep Swagger operation ids unique (DepartmentsController_list, ...).
  Object.defineProperty(CatalogController, "name", {
    value: `${o.path[0]!.toUpperCase()}${o.path.slice(1)}Controller`,
  });
  return CatalogController;
}

const departmentSelect = { id: true, name: true, description: true, manager: { select: personName }, ...employeeCount };
type DepartmentRow = Prisma.DepartmentGetPayload<{ select: typeof departmentSelect }>;

export const DepartmentsController = catalogController({
  path: "departments",
  entity: "Department",
  schema: departmentInputSchema,
  delegate: (db) => db.department,
  select: departmentSelect,
  toDto: ({ _count, manager, ...d }: DepartmentRow): DepartmentDto => ({
    ...d,
    manager: manager && personRef(manager),
    employeeCount: _count.employees,
  }),
  // The manager must be a current employee of the same organization.
  validate: async ({ managerId }, prisma, organizationId) => {
    if (managerId && !(await prisma.employee.count({ where: { id: managerId, organizationId, deletedAt: null } }))) {
      throw notFound("Manager");
    }
  },
});

const withCount = ({ _count, ...row }: Counted) => ({ ...row, employeeCount: _count.employees });

export const PositionsController = catalogController({
  path: "positions",
  entity: "Position",
  schema: positionInputSchema,
  delegate: (db) => db.position,
  select: { id: true, name: true, description: true, level: true, ...employeeCount },
  toDto: withCount,
});

export const BranchesController = catalogController({
  path: "branches",
  entity: "Branch",
  schema: branchInputSchema,
  delegate: (db) => db.branch,
  select: {
    id: true,
    name: true,
    address: true,
    city: true,
    state: true,
    country: true,
    timezone: true,
    ...employeeCount,
  },
  toDto: withCount,
});
