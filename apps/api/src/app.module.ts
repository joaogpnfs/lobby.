import { Module } from "@nestjs/common";
import { LoggerModule } from "nestjs-pino";
import { env } from "./env.js";
import { HealthController } from "./health.controller.js";
import { PrismaService } from "./prisma.service.js";
import { RedisService } from "./redis.service.js";

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: env.LOG_LEVEL,
        // Fastify assigns the request id (see createAdapter); reuse it so every log line carries it.
        genReqId: (req) => req.id,
        // Never log credentials or personal documents.
        redact: {
          paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            'res.headers["set-cookie"]',
            "*.password",
            "*.passwordHash",
            "*.token",
            "*.accessToken",
            "*.refreshToken",
            "*.document",
          ],
          censor: "[redacted]",
        },
        transport:
          env.NODE_ENV === "development" ? { target: "pino-pretty", options: { singleLine: true } } : undefined,
      },
    }),
  ],
  controllers: [HealthController],
  providers: [PrismaService, RedisService],
})
export class AppModule {}
