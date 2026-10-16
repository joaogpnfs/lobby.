import { SetMetadata } from "@nestjs/common";
import type { Permission } from "@lobby/types";

export const IS_PUBLIC = "isPublic";
export const PERMISSIONS = "permissions";
export const RATE_LIMIT = "rateLimit";

export const Public = () => SetMetadata(IS_PUBLIC, true);

export const RequirePermissions = (...permissions: Permission[]) => SetMetadata(PERMISSIONS, permissions);

export const RateLimit = (perMinute: number) => SetMetadata(RATE_LIMIT, perMinute);
