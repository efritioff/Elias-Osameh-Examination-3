import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { ACCESS_SECRET, REFRESH_SECRET, accessTtl, refreshTtl } from "./config.ts";
import { parseTtlToMs, jsonResponse } from "./utils.ts";
import { refreshTokens } from "./db.ts";

export type UserRole = "admin" | "user";

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export function resolveRole(role: unknown): UserRole {
  return role === "admin" ? "admin" : "user";
}

export function issueAccessToken(userId: string, email: string, role: UserRole) {
  return jwt.sign({ sub: userId, email, role }, ACCESS_SECRET, { expiresIn: accessTtl });
}

export function issueRefreshToken(userId: string, email: string, role: UserRole) {
  return jwt.sign({ sub: userId, email, role, typ: "refresh" }, REFRESH_SECRET, {
    expiresIn: refreshTtl,
  });
}

export function requireAccessToken(req: Request): { ok: true; decoded: AccessTokenPayload } | { ok: false; response: Response } {
  const auth = req.headers.get("authorization");
  if (!auth) {
    return { ok: false, response: jsonResponse({ error: "No token" }, { status: 401 }) };
  }

  const [scheme, token] = auth.split(" ");
  if (scheme !== "Bearer" || !token) {
    return {
      ok: false,
      response: jsonResponse({ error: "Invalid authorization header" }, { status: 401 }),
    };
  }

  try {
    const decoded = jwt.verify(token, ACCESS_SECRET) as jwt.JwtPayload;
    if (decoded.typ === "refresh") {
      return { ok: false, response: jsonResponse({ error: "Invalid token" }, { status: 401 }) };
    }
    return { ok: true, decoded: decoded as unknown as AccessTokenPayload };
  } catch {
    return { ok: false, response: jsonResponse({ error: "Invalid token" }, { status: 401 }) };
  }
}

export function requireAdmin(req: Request): { ok: true } | { ok: false; response: Response } {
  const result = requireAccessToken(req);
  if (!result.ok) return result;
  if (result.decoded.role !== "admin") {
    return { ok: false, response: jsonResponse({ error: "Admin krävs" }, { status: 403 }) };
  }
  return { ok: true };
}

export async function persistRefreshToken(userId: string, token: string) {
  const tokenHash = await bcrypt.hash(token, 12);
  const expiresAt = new Date(Date.now() + parseTtlToMs(refreshTtl));

  await refreshTokens.updateOne(
    { userId },
    { $set: { userId, tokenHash, expiresAt, updatedAt: new Date() } },
    { upsert: true }
  );
}