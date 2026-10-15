import { Module } from "@nestjs/common";
import { ClsModule } from "nestjs-cls";
import { LoggerModule } from "nestjs-pino";
import { CoreModule } from "./core.module.js";
import { env } from "./env.js";
import { HealthController } from "./health.controller.js";
import { AccessModule } from "./modules/access/access.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { PeopleModule } from "./modules/people.module.js";
import { OrganizationsController } from "./modules/organizations/organizations.controller.js";

@Module({
  imports: [
    CoreModule,
    // Per-request context (see common/context.ts), filled by JwtAuthGuard.
    ClsModule.forRoot({ global: true, middleware: { mount: true } }),
    AuthModule,
    PeopleModule,
    AccessModule,
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
  controllers: [HealthController, OrganizationsController],
})
export class AppModule {}
