import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  createEmployeeSchema,
  employeeListQuerySchema,
  saveProfessionalProfileSchema,
  terminateEmployeeSchema,
  updateEmployeeSchema,
  type CreateEmployeeInput,
  type EmployeeDto,
  type EmployeeListQuery,
  type ProfileImport,
  type SaveProfessionalProfileInput,
  type TerminateEmployeeInput,
  type UpdateEmployeeInput,
} from "@lobby/types";
import { z } from "zod";
import { invalid } from "../../common/errors.js";
import { RequirePermissions } from "../../common/decorators.js";
import { EmployeesService } from "./employees.service.js";

const idParam = z.uuid();

@ApiTags("employees")
@ApiBearerAuth()
@Controller("employees")
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  @RequirePermissions("employees:read")
  @ApiOperation({ summary: "Employees the caller may see (HR: all, manager: team, employee: self)." })
  list(@Query({ schema: employeeListQuerySchema }) query: EmployeeListQuery) {
    return this.employees.list(query);
  }

  @Get(":id")
  @RequirePermissions("employees:read")
  get(@Param("id", { schema: idParam }) id: string): Promise<EmployeeDto> {
    return this.employees.get(id);
  }

  @Post()
  @RequirePermissions("employees:create")
  create(@Body({ schema: createEmployeeSchema }) body: CreateEmployeeInput): Promise<EmployeeDto> {
    return this.employees.create(body);
  }

  @Patch(":id")
  @RequirePermissions("employees:update")
  update(
    @Param("id", { schema: idParam }) id: string,
    @Body({ schema: updateEmployeeSchema }) body: UpdateEmployeeInput,
  ): Promise<EmployeeDto> {
    return this.employees.update(id, body);
  }

  @Post(":id/terminate")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions("employees:update")
  @ApiOperation({ summary: "Desligamento: status, date and reason; disables the linked account." })
  terminate(
    @Param("id", { schema: idParam }) id: string,
    @Body({ schema: terminateEmployeeSchema }) body: TerminateEmployeeInput,
  ): Promise<EmployeeDto> {
    return this.employees.terminate(id, body);
  }

  @Post(":id/professional-profile/import")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions("employees:read")
  @ApiOperation({
    summary: "Reads a LinkedIn 'Save to PDF' export (body: application/pdf) and returns a preview; saves nothing.",
  })
  importProfile(@Param("id", { schema: idParam }) id: string, @Body() pdf: unknown): Promise<ProfileImport> {
    if (!Buffer.isBuffer(pdf)) throw invalid("Send the PDF as application/pdf");
    return this.employees.importProfile(id, pdf);
  }

  @Put(":id/professional-profile")
  @RequirePermissions("employees:read")
  @ApiOperation({ summary: "HR or the person themself saves the professional profile and LinkedIn link." })
  saveProfile(
    @Param("id", { schema: idParam }) id: string,
    @Body({ schema: saveProfessionalProfileSchema }) body: SaveProfessionalProfileInput,
  ): Promise<EmployeeDto> {
    return this.employees.saveProfile(id, body);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions("employees:delete")
  @ApiOperation({ summary: "Soft delete; the record stays for the audit trail." })
  remove(@Param("id", { schema: idParam }) id: string): Promise<null> {
    return this.employees.remove(id);
  }
}
