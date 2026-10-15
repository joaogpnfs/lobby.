import type { Role } from "@lobby/types";
import { Injectable } from "@nestjs/common";
import { ClsService, type ClsStore } from "nestjs-cls";

// Who is calling, set by JwtAuthGuard for every authenticated request.
// Services read organizationId from here, never from the request body.
export type AuthContext = {
  userId: string;
  organizationId: string;
  membershipId: string;
  role: Role;
};

export type RequestMeta = { ipAddress?: string; userAgent?: string };

export interface AppClsStore extends ClsStore {
  auth?: AuthContext;
  // Who sent the request, for audit entries. Set for every request, public ones included.
  meta?: RequestMeta;
}

// The authenticated caller, for services. Only used behind JwtAuthGuard, so it is always set.
@Injectable()
export class RequestContext {
  constructor(private readonly cls: ClsService<AppClsStore>) {}

  get auth(): AuthContext {
    const auth = this.cls.get("auth");
    if (!auth) throw new Error("RequestContext used outside an authenticated request");
    return auth;
  }

  get meta(): RequestMeta {
    return this.cls.get("meta") ?? {};
  }
}
