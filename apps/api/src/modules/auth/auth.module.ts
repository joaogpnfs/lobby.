import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuthController } from "./auth.controller.js";
import { JwtAuthGuard } from "./auth.guard.js";
import { AuthService } from "./auth.service.js";
import { LinkedinController } from "./linkedin.controller.js";
import { LinkedinService } from "./linkedin.service.js";
import { PermissionsGuard } from "./permissions.guard.js";
import { RateLimitGuard } from "./rate-limit.guard.js";

@Module({
  controllers: [AuthController, LinkedinController],
  providers: [
    AuthService,
    LinkedinService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
