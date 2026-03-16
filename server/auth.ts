import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { ACCESS_SECRET, REFRESH_SECRET, accessTtl, refreshTtl } from "./config.ts";
import { parseTtlToMs, jsonResponse } from "./Utils.ts";
import { refreshTokens } from "./db.ts";

export function issueAccessToken(userId: string, email: string) {
  return jwt.sign({ sub: userId, email }, ACCESS_SECRET, { expiresIn: accessTtl });
}

export function issueRefreshToken(userId: string, email: string) {
  return jwt.sign({ sub: userId, email, typ: "refresh" }, REFRESH_SECRET, {
    expiresIn: refreshTtl,
  });
}

export function requireAccessToken(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth) {
    return { ok: false as const, response: jsonResponse({ error: "No token" }, { status: 401 }) };
  }

  const [scheme, token] = auth.split(" ");
  if (scheme !== "Bearer" || !token) {
    return {
      ok: false as const,
      response: jsonResponse({ error: "Invalid authorization header" }, { status: 401 }),
    };
  }

  try {
    const decoded = jwt.verify(token, ACCESS_SECRET);
    return { ok: true as const, decoded };
  } catch {
    return { ok: false as const, response: jsonResponse({ error: "Invalid token" }, { status: 401 }) };
  }
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