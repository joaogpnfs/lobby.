import type { Role } from "@lobby/types";
import { Injectable } from "@nestjs/common";
import { ClsService, type ClsStore } from "nestjs-cls";

export type AuthContext = {
  userId: string;
  organizationId: string;
  membershipId: string;
  role: Role;
};

export type RequestMeta = { ipAddress?: string; userAgent?: string };

export interface AppClsStore extends ClsStore {
  auth?: AuthContext;
  meta?: RequestMeta;
}

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
