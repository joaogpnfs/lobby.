import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  ErrorCode,
  loginSchema,
  registerSchema,
  type AuthTokens,
  type LoginInput,
  type Me,
  type RegisterInput,
} from "@lobby/types";
import type { FastifyReply, FastifyRequest } from "fastify";
import { RequestContext } from "../../common/context.js";
import { Public, RateLimit } from "../../common/decorators.js";
import { AppException } from "../../common/errors.js";
import { env } from "../../env.js";
import { AuthService, type Session } from "./auth.service.js";
import { REFRESH_COOKIE, REFRESH_TOKEN_TTL_MS } from "./tokens.js";

const COOKIE_PATH = "/api/v1/auth";

// CSRF: refresh and logout act on the cookie alone, so they also require an allowed Origin.
function assertTrustedOrigin(req: FastifyRequest) {
  const origin = req.headers.origin;
  if (!origin || !env.CORS_ORIGINS.includes(origin)) {
    throw new AppException(ErrorCode.FORBIDDEN, "Untrusted origin", HttpStatus.FORBIDDEN);
  }
}

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly ctx: RequestContext,
  ) {}

  @Public()
  @RateLimit(5)
  @Post("register")
  @ApiOperation({ summary: "Creates a user, its organization and an ORG_ADMIN membership; starts a session." })
  async register(
    @Body({ schema: registerSchema }) body: RegisterInput,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthTokens> {
    return sendSession(reply, await this.auth.register(body));
  }

  @Public()
  @RateLimit(5)
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Access token in the body, refresh token in an httpOnly cookie." })
  async login(
    @Body({ schema: loginSchema }) body: LoginInput,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthTokens> {
    return sendSession(reply, await this.auth.login(body));
  }

  @Public()
  @RateLimit(10)
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rotates the refresh cookie and returns a new access token." })
  async refresh(@Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply): Promise<AuthTokens> {
    assertTrustedOrigin(req);
    const token = req.cookies[REFRESH_COOKIE];
    if (!token) throw new AppException(ErrorCode.UNAUTHORIZED, "Authentication required", HttpStatus.UNAUTHORIZED);
    try {
      return sendSession(reply, await this.auth.refresh(token));
    } catch (err) {
      reply.clearCookie(REFRESH_COOKIE, { path: COOKIE_PATH });
      throw err;
    }
  }

  @Public()
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Revokes the session's refresh token family and clears the cookie." })
  async logout(@Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply): Promise<null> {
    assertTrustedOrigin(req);
    await this.auth.logout(req.cookies[REFRESH_COOKIE]);
    reply.clearCookie(REFRESH_COOKIE, { path: COOKIE_PATH });
    return null;
  }

  @Get("me")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Current user, organization, role and permissions." })
  me(): Promise<Me> {
    return this.auth.me(this.ctx.auth);
  }
}

// Refresh token into the httpOnly cookie, access token into the body. Also used by invitation acceptance.
export function sendSession(reply: FastifyReply, session: Session): AuthTokens {
  reply.setCookie(REFRESH_COOKIE, session.refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: COOKIE_PATH,
    maxAge: REFRESH_TOKEN_TTL_MS / 1000,
  });
  return { accessToken: session.accessToken };
}
