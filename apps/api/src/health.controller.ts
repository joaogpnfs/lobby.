import { Controller, Get, HttpStatus, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { FastifyReply } from "fastify";
import type { HealthStatus } from "@lobby/types";
import { PrismaService } from "./prisma.service.js";
import { RedisService } from "./redis.service.js";

const TIMEOUT_MS = 1000;

const check = (probe: () => Promise<unknown>): Promise<"ok" | "down"> =>
  Promise.race([
    probe().then(() => "ok" as const),
    new Promise<"down">((resolve) => setTimeout(() => resolve("down"), TIMEOUT_MS)),
  ]).catch(() => "down" as const);

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Checks the database and Redis. Returns 503 when any of them is down." })
  async health(@Res({ passthrough: true }) reply: FastifyReply): Promise<HealthStatus> {
    const [db, redis] = await Promise.all([
      check(() => this.prisma.$queryRaw`SELECT 1`),
      check(() => this.redis.ping()),
    ]);
    const status = db === "ok" && redis === "ok" ? "ok" : "degraded";
    if (status === "degraded") reply.status(HttpStatus.SERVICE_UNAVAILABLE);
    return { status, db, redis };
  }
}
