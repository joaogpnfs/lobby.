import { HttpStatus, Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ErrorCode, ROLE_PERMISSIONS, type Permission } from "@lobby/types";
import { ClsService } from "nestjs-cls";
import type { AppClsStore } from "../../common/context.js";
import { PERMISSIONS } from "../../common/decorators.js";
import { AppException } from "../../common/errors.js";

// Global, runs after JwtAuthGuard. Handlers without @RequirePermissions only need a valid session.
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly cls: ClsService<AppClsStore>,
  ) {}

  canActivate(ctx: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS, [ctx.getHandler(), ctx.getClass()]);
    if (!required?.length) return true;
    const role = this.cls.get("auth")?.role;
    const granted = role ? ROLE_PERMISSIONS[role] : [];
    if (required.every((p) => granted.includes(p))) return true;
    throw new AppException(ErrorCode.FORBIDDEN, "You do not have permission to do this", HttpStatus.FORBIDDEN);
  }
}
