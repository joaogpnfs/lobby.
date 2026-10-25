import { Module } from "@nestjs/common";
import { ClsModule } from "nestjs-cls";
import { LoggerModule } from "nestjs-pino";
import { CoreModule } from "./core.module.js";
import { env } from "./env.js";
import { HealthController } from "./health.controller.js";
import { AccessModule } from "./modules/access/access.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { DocumentsModule } from "./modules/documents/documents.module.js";
import { JobsModule } from "./modules/jobs/jobs.module.js";
import { NotificationsModule } from "./modules/notifications/notifications.module.js";
import { PeopleModule } from "./modules/people.module.js";
import { OrganizationsController } from "./modules/organizations/organizations.controller.js";
import { VacationsModule } from "./modules/vacations/vacations.module.js";

@Module({
  imports: [
    CoreModule,
    ClsModule.forRoot({ global: true, middleware: { mount: true } }),
    AuthModule,
    PeopleModule,
    AccessModule,
    DocumentsModule,
    VacationsModule,
    NotificationsModule,
    JobsModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: env.LOG_LEVEL,
        genReqId: (req) => req.id,
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
