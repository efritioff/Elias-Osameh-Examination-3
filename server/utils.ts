import type { SignOptions } from "jsonwebtoken";
import { corsHeaders, refreshTtl, isProd } from "./config.ts";

export function parseCookies(cookieHeader: string | null) {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;

  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (!name) continue;
    out[name] = decodeURIComponent(rest.join("="));
  }

  return out;
}

export function parseTtlToMs(ttl: SignOptions["expiresIn"]) {
  const fallback = 7 * 24 * 60 * 60 * 1000;

  if (typeof ttl === "number") {
    if (!Number.isFinite(ttl) || ttl <= 0) return fallback;
    return ttl * 1000;
  }

  if (typeof ttl !== "string") return fallback;

  const raw = ttl.trim().toLowerCase();
  if (raw.length < 2) return fallback;

  const unit = raw.slice(-1);
  const value = Number(raw.slice(0, -1));

  if (!Number.isFinite(value) || value <= 0) return fallback;
  if (unit === "s") return value * 1000;
  if (unit === "m") return value * 60 * 1000;
  if (unit === "h") return value * 60 * 60 * 1000;
  if (unit === "d") return value * 24 * 60 * 60 * 1000;

  return fallback;
}

export function buildRefreshCookie(token: string) {
  const maxAge = Math.floor(parseTtlToMs(refreshTtl) / 1000);
  return [
    `refreshToken=${encodeURIComponent(token)}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/auth",
    `Max-Age=${maxAge}`,
    ...(isProd ? ["Secure"] : []),
  ].join("; ");
}

export function clearRefreshCookie() {
  return [
    "refreshToken=",
    "HttpOnly",
    "SameSite=Lax",
    "Path=/auth",
    "Max-Age=0",
    ...(isProd ? ["Secure"] : []),
  ].join("; ");
}

export function jsonResponse(body: unknown, init?: ResponseInit) {
  return Response.json(body, {
    ...init,
    headers: {
      ...corsHeaders,
      ...(init?.headers ?? {}),
    },
  });
}