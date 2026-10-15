import { SetMetadata } from "@nestjs/common";
import type { Permission } from "@lobby/types";

export const IS_PUBLIC = "isPublic";
export const PERMISSIONS = "permissions";
export const RATE_LIMIT = "rateLimit";

// Skips JwtAuthGuard. Everything else requires a valid access token.
export const Public = () => SetMetadata(IS_PUBLIC, true);

// Checked by PermissionsGuard against ROLE_PERMISSIONS. Never check roles by hand.
export const RequirePermissions = (...permissions: Permission[]) => SetMetadata(PERMISSIONS, permissions);

// Strict limit for this handler, in requests per minute per IP (and per email when the body has one).
// Without it: 100/min per user, or per IP when anonymous.
export const RateLimit = (perMinute: number) => SetMetadata(RATE_LIMIT, perMinute);
