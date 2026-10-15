import { createHash, randomBytes } from "node:crypto";
import type { Role } from "@lobby/types";
import { jwtVerify, SignJWT } from "jose";
import { env } from "../../env.js";

export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const REFRESH_COOKIE = "lobby_rt";

const secret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const ISSUER = "lobby";

export type AccessPayload = { sub: string; mid: string; org: string; role: Role };

export function signAccessToken(p: AccessPayload) {
  return new SignJWT({ mid: p.mid, org: p.org, role: p.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(p.sub)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret);
}

// Rejects a bad signature, any algorithm other than HS256, a wrong issuer or an expired token.
export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify<Omit<AccessPayload, "sub">>(token, secret, {
    algorithms: ["HS256"],
    issuer: ISSUER,
  });
  return payload;
}

// Refresh tokens are opaque random strings; only their hash is stored.
export const newRefreshToken = () => randomBytes(32).toString("base64url");
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
