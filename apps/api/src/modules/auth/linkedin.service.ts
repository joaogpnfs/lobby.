import { randomBytes } from "node:crypto";
import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { ErrorCode } from "@lobby/types";
import { AppException } from "../../common/errors.js";
import { env } from "../../env.js";
import { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma.service.js";
import { RedisService } from "../../redis.service.js";
import { AuditService } from "../audit/audit.service.js";
import { AuthService, type Session } from "./auth.service.js";

const AUTHORIZE_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const USERINFO_URL = "https://api.linkedin.com/v2/userinfo";
export const STATE_TTL_S = 10 * 60;

type State = { mode: "link"; userId: string } | { mode: "login" };
type UserInfo = { sub: string; picture?: string };

type LinkedinOutcome =
  | { mode: "link"; result: "linked" | "taken" | "error" }
  | { mode: "login"; result: "not-linked" | "error" }
  | { mode: "login"; result: "ok"; session: Session };

@Injectable()
export class LinkedinService {
  private readonly logger = new Logger("LinkedIn");

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly auth: AuthService,
  ) {}

  async start(state: State) {
    if (!env.LINKEDIN_CLIENT_ID || !env.LINKEDIN_CLIENT_SECRET) {
      throw new AppException(ErrorCode.NOT_FOUND, "LinkedIn is not configured", HttpStatus.NOT_FOUND);
    }
    const key = randomBytes(24).toString("base64url");
    await this.redis.set(`li:${key}`, JSON.stringify(state), "EX", STATE_TTL_S);
    const url = new URL(AUTHORIZE_URL);
    url.search = new URLSearchParams({
      response_type: "code",
      client_id: env.LINKEDIN_CLIENT_ID!,
      redirect_uri: redirectUri(),
      state: key,
      scope: "openid profile email",
    }).toString();
    return { state: key, url: url.toString() };
  }

  async callback(key: string, cookieKey: string | undefined, code: string | undefined): Promise<LinkedinOutcome> {
    const raw = key && key === cookieKey ? await this.redis.getdel(`li:${key}`) : null;
    if (!raw) return { mode: "login", result: "error" };
    const state = JSON.parse(raw) as State;

    const info = code ? await this.userInfo(code).catch((err: unknown) => this.logger.warn(String(err))) : undefined;
    if (!info) return { mode: state.mode, result: "error" };

    if (state.mode === "link") {
      try {
        await this.prisma.user.update({
          where: { id: state.userId },
          data: { linkedinSub: info.sub, avatarUrl: info.picture ?? null },
        });
        return { mode: "link", result: "linked" };
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          return { mode: "link", result: "taken" };
        }
        throw err;
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { linkedinSub: info.sub },
      select: {
        id: true,
        status: true,
        memberships: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    const membership = user?.memberships[0];
    if (!user || user.status !== "ACTIVE" || !membership) return { mode: "login", result: "not-linked" };

    await this.prisma.user.update({ where: { id: user.id }, data: { avatarUrl: info.picture ?? null } });
    await this.audit.log({
      organizationId: membership.organizationId,
      actorId: user.id,
      action: "LOGIN",
      entity: "User",
      entityId: user.id,
      metadata: { method: "linkedin" },
    });
    return { mode: "login", result: "ok", session: await this.auth.startSession(membership) };
  }

  async unlink(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { linkedinSub: null, avatarUrl: null } });
    return null;
  }

  private async userInfo(code: string): Promise<UserInfo> {
    const token = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri(),
        client_id: env.LINKEDIN_CLIENT_ID!,
        client_secret: env.LINKEDIN_CLIENT_SECRET!,
      }),
    });
    if (!token.ok) throw new Error(`LinkedIn token exchange failed (${token.status})`);
    const { access_token } = (await token.json()) as { access_token: string };

    const res = await fetch(USERINFO_URL, { headers: { authorization: `Bearer ${access_token}` } });
    if (!res.ok) throw new Error(`LinkedIn userinfo failed (${res.status})`);
    const info = (await res.json()) as UserInfo;
    if (!info.sub) throw new Error("LinkedIn userinfo without sub");
    return info;
  }
}

const redirectUri = () => `${env.APP_URL}/api/v1/auth/linkedin/callback`;
