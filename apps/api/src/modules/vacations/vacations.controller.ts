import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  createVacationSchema,
  rejectVacationSchema,
  vacationListQuerySchema,
  type CreateVacationInput,
  type RejectVacationInput,
  type VacationDto,
  type VacationListQuery,
  type VacationSummary,
} from "@lobby/types";
import { z } from "zod";
import { RequirePermissions } from "../../common/decorators.js";
import { VacationsService } from "./vacations.service.js";

const idParam = z.uuid();

@ApiTags("vacations")
@ApiBearerAuth()
@Controller("vacations")
export class VacationsController {
  constructor(private readonly vacations: VacationsService) {}

  @Get()
  @RequirePermissions("vacations:read")
  @ApiOperation({ summary: "Requests the caller may see (HR: all, managers: their team, everyone else: their own)." })
  list(@Query({ schema: vacationListQuerySchema }) query: VacationListQuery) {
    return this.vacations.list(query);
  }

  @Get("summary")
  @RequirePermissions("vacations:read")
  @ApiOperation({ summary: "Who is away today, requests awaiting the caller and the caller's next vacations." })
  summary(): Promise<VacationSummary> {
    return this.vacations.summary();
  }

  @Post()
  @RequirePermissions("vacations:request")
  @ApiOperation({ summary: "Requests vacations for the caller. Overlapping an open request returns 409." })
  create(@Body({ schema: createVacationSchema }) body: CreateVacationInput): Promise<VacationDto> {
    return this.vacations.create(body);
  }

  @Post(":id/approve")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions("vacations:approve")
  @ApiOperation({ summary: "Approves a pending request (the employee's manager or HR, never the requester)." })
  approve(@Param("id", { schema: idParam }) id: string): Promise<VacationDto> {
    return this.vacations.approve(id);
  }

  @Post(":id/reject")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions("vacations:approve")
  @ApiOperation({ summary: "Rejects a pending request with a reason shown to the employee." })
  reject(
    @Param("id", { schema: idParam }) id: string,
    @Body({ schema: rejectVacationSchema }) body: RejectVacationInput,
  ): Promise<VacationDto> {
    return this.vacations.reject(id, body.note);
  }

  @Post(":id/cancel")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions("vacations:request")
  @ApiOperation({ summary: "The requester cancels a pending request, or an approved one that hasn't started." })
  cancel(@Param("id", { schema: idParam }) id: string): Promise<VacationDto> {
    return this.vacations.cancel(id);
  }
}
