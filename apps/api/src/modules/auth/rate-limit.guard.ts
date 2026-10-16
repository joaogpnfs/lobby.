import { HttpStatus, Injectable, Logger, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ErrorCode } from "@lobby/types";
import type { FastifyRequest } from "fastify";
import { ClsService } from "nestjs-cls";
import type { AppClsStore } from "../../common/context.js";
import { RATE_LIMIT } from "../../common/decorators.js";
import { AppException } from "../../common/errors.js";
import { RedisService } from "../../redis.service.js";

const DEFAULT_PER_MINUTE = 100;

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
    private readonly cls: ClsService<AppClsStore>,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<FastifyRequest>();
    const strict = this.reflector.get<number | undefined>(RATE_LIMIT, ctx.getHandler());
    const route = ctx.getHandler().name;
    const email = (req.body as { email?: unknown } | undefined)?.email;

    const keys = strict
      ? [`ip:${route}:${req.ip}`, ...(typeof email === "string" ? [`email:${route}:${email.toLowerCase()}`] : [])]
      : [`user:${this.cls.get("auth")?.userId ?? req.ip}`];
    const limit = strict ?? DEFAULT_PER_MINUTE;
    const window = Math.floor(Date.now() / 60_000);

    try {
      for (const key of keys) {
        const redisKey = `rl:${key}:${window}`;
        const count = await this.redis.incr(redisKey);
        if (count === 1) await this.redis.expire(redisKey, 60);
        if (count > limit) {
          throw new AppException(ErrorCode.RATE_LIMITED, "Too many requests", HttpStatus.TOO_MANY_REQUESTS);
        }
      }
    } catch (err) {
      if (err instanceof AppException) throw err;
      this.logger.warn(`Rate limit skipped: ${String(err)}`);
    }
    return true;
  }
}
