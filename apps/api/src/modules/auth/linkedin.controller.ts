import { Controller, Delete, Get, HttpCode, HttpStatus, Post, Query, Req, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { FastifyReply, FastifyRequest } from "fastify";
import { RequestContext } from "../../common/context.js";
import { Public, RateLimit } from "../../common/decorators.js";
import { env } from "../../env.js";
import { sendSession } from "./auth.controller.js";
import { LinkedinService, STATE_TTL_S } from "./linkedin.service.js";

const STATE_COOKIE = "lobby_li_state";
const STATE_PATH = "/api/v1/auth/linkedin";

function setState(reply: FastifyReply, state: string) {
  reply.setCookie(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: STATE_PATH,
    maxAge: STATE_TTL_S,
  });
}

@ApiTags("auth")
@Controller("auth/linkedin")
export class LinkedinController {
  constructor(
    private readonly linkedin: LinkedinService,
    private readonly ctx: RequestContext,
  ) {}

  @Post("link")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Returns the LinkedIn authorization URL that links LinkedIn to the current user." })
  async link(@Res({ passthrough: true }) reply: FastifyReply): Promise<{ url: string }> {
    const { state, url } = await this.linkedin.start({ mode: "link", userId: this.ctx.auth.userId });
    setState(reply, state);
    return { url };
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Unlinks LinkedIn from the current user." })
  unlink(): Promise<null> {
    return this.linkedin.unlink(this.ctx.auth.userId);
  }

  @Public()
  @RateLimit(10)
  @Get("login")
  @ApiOperation({ summary: "Redirects to LinkedIn to sign in; only accounts that linked LinkedIn before can enter." })
  async login(@Res() reply: FastifyReply) {
    const { state, url } = await this.linkedin.start({ mode: "login" });
    setState(reply, state);
    return reply.redirect(url, 302);
  }

  @Public()
  @RateLimit(10)
  @Get("callback")
  @ApiOperation({ summary: "OAuth callback from LinkedIn; redirects back to the app." })
  async callback(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query("state") state?: string,
    @Query("code") code?: string,
  ) {
    const outcome = await this.linkedin.callback(state ?? "", req.cookies[STATE_COOKIE], code);
    reply.clearCookie(STATE_COOKIE, { path: STATE_PATH });
    if (outcome.mode === "login" && outcome.result === "ok") {
      sendSession(reply, outcome.session);
      return reply.redirect(`${env.APP_URL}/dashboard`, 302);
    }
    const page = outcome.mode === "link" ? "settings" : "login";
    return reply.redirect(`${env.APP_URL}/${page}?linkedin=${outcome.result}`, 302);
  }
}
