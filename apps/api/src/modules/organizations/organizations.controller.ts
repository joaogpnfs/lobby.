import { Body, Controller, Get, Patch } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { updateOrganizationSchema, type OrganizationDto, type UpdateOrganizationInput } from "@lobby/types";
import { RequestContext } from "../../common/context.js";
import { RequirePermissions } from "../../common/decorators.js";
import { PrismaService } from "../../prisma.service.js";
import { AuditService } from "../audit/audit.service.js";

const select = { id: true, name: true, legalName: true, document: true, email: true, phone: true, timezone: true };

@ApiTags("organizations")
@ApiBearerAuth()
@Controller("organizations/me")
export class OrganizationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly ctx: RequestContext,
  ) {}

  @Get()
  @RequirePermissions("organization:read")
  @ApiOperation({ summary: "The current organization." })
  get(): Promise<OrganizationDto> {
    return this.prisma.organization.findUniqueOrThrow({ where: { id: this.ctx.auth.organizationId }, select });
  }

  @Patch()
  @RequirePermissions("organization:update")
  @ApiOperation({ summary: "Updates the current organization's settings." })
  update(@Body({ schema: updateOrganizationSchema }) body: UpdateOrganizationInput): Promise<OrganizationDto> {
    const { organizationId } = this.ctx.auth;
    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.update({ where: { id: organizationId }, data: body, select });
      await this.audit.record(
        "ORGANIZATION_UPDATED",
        "Organization",
        organizationId,
        { fields: Object.keys(body) },
        tx,
      );
      return org;
    });
  }
}
