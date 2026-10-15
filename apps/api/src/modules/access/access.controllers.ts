import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  acceptInvitationSchema,
  createInvitationSchema,
  listQuerySchema,
  updateMemberSchema,
  type AcceptInvitationInput,
  type AuthTokens,
  type CreatedInvitation,
  type CreateInvitationInput,
  type InvitationDto,
  type InvitationPreview,
  type ListQuery,
  type MemberDto,
  type UpdateMemberInput,
} from "@lobby/types";
import type { FastifyReply } from "fastify";
import { z } from "zod";
import { Public, RateLimit, RequirePermissions } from "../../common/decorators.js";
import { sendSession } from "../auth/auth.controller.js";
import { AccessService } from "./access.service.js";

const idParam = z.uuid();

@ApiTags("invitations")
@Controller("invitations")
export class InvitationsController {
  constructor(private readonly access: AccessService) {}

  @Post()
  @ApiBearerAuth()
  @RequirePermissions("users:invite")
  @ApiOperation({ summary: "Invites someone by link (valid 7 days). Returns the link once." })
  create(@Body({ schema: createInvitationSchema }) body: CreateInvitationInput): Promise<CreatedInvitation> {
    return this.access.invite(body);
  }

  @Get()
  @ApiBearerAuth()
  @RequirePermissions("users:invite")
  pending(): Promise<InvitationDto[]> {
    return this.access.pendingInvitations();
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @RequirePermissions("users:invite")
  revoke(@Param("id", { schema: idParam }) id: string): Promise<null> {
    return this.access.revokeInvitation(id);
  }

  // POST, not GET /:token: keeps the token out of URLs that end up in logs.
  @Public()
  @RateLimit(20)
  @Post("preview")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Organization and email behind an invitation token." })
  preview(
    @Body({ schema: acceptInvitationSchema.pick({ token: true }) }) body: { token: string },
  ): Promise<InvitationPreview> {
    return this.access.preview(body.token);
  }

  @Public()
  @RateLimit(5)
  @Post("accept")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Accepts an invitation and starts a session." })
  async accept(
    @Body({ schema: acceptInvitationSchema }) body: AcceptInvitationInput,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthTokens> {
    return sendSession(reply, await this.access.accept(body));
  }
}

@ApiTags("members")
@ApiBearerAuth()
@Controller("members")
export class MembersController {
  constructor(private readonly access: AccessService) {}

  @Get()
  @RequirePermissions("users:invite")
  @ApiOperation({ summary: "People with access to the organization." })
  list(@Query({ schema: listQuerySchema }) query: ListQuery) {
    return this.access.members(query);
  }

  @Patch(":id")
  @RequirePermissions("users:manage")
  @ApiOperation({ summary: "Changes a member's role or disables their access." })
  update(
    @Param("id", { schema: idParam }) id: string,
    @Body({ schema: updateMemberSchema }) body: UpdateMemberInput,
  ): Promise<MemberDto> {
    return this.access.updateMember(id, body);
  }
}
