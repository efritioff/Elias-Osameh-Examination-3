import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";
import { users, refreshTokens } from "../db.ts";
import { REFRESH_SECRET, adminEmail } from "../config.ts";
import {
  issueAccessToken,
  issueRefreshToken,
  persistRefreshToken,
  requireAccessToken,
  resolveRole,
  type UserRole,
} from "../auth.ts";
import { parseCookies, buildRefreshCookie, clearRefreshCookie, jsonResponse } from "../utils.ts";

export async function handleAuthRoutes(req: Request, url: URL): Promise<Response | null> {

  // REGISTER
  if (req.method === "POST" && url.pathname === "/auth/register") {
    const body = await req.json().catch(() => null) as null | {
      email?: string;
      password?: string;
    };

    const email = body?.email?.toLowerCase();
    const password = body?.password;

    if (!email || !password) {
      return jsonResponse({ error: "email and password are required" }, { status: 400 });
    }
    if (password.trim().length < 6) {
      return jsonResponse({ error: "password must be at least 6 characters" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const role: UserRole = adminEmail && email === adminEmail ? "admin" : "user";

    try {
      const result = await users.insertOne({ email, passwordHash, role, createdAt: new Date() });
      return jsonResponse({ ok: true, userId: result.insertedId });
    } catch {
      return jsonResponse({ error: "email already exists" }, { status: 409 });
    }
  }

  // LOGIN
  if (req.method === "POST" && url.pathname === "/auth/login") {
    const body = await req.json().catch(() => null) as null | {
      email?: string;
      password?: string;
    };

    const email = body?.email?.trim().toLowerCase();
    const password = body?.password;

    if (!email || !password) {
      return jsonResponse({ error: "email and password are required" }, { status: 400 });
    }

    const user = await users.findOne({ email });
    if (!user) return jsonResponse({ error: "invalid credentials" }, { status: 401 });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return jsonResponse({ error: "invalid credentials" }, { status: 401 });

    const userId = String(user._id);
    const role = resolveRole(user.role);

    const accessToken = issueAccessToken(userId, user.email, role);
    const refreshToken = issueRefreshToken(userId, user.email, role);

    await persistRefreshToken(userId, refreshToken);

    return jsonResponse(
      { ok: true, accessToken },
      { headers: { "Set-Cookie": buildRefreshCookie(refreshToken) } }
    );
  }

  // REFRESH
  if (req.method === "POST" && url.pathname === "/auth/refresh") {
    const cookies = parseCookies(req.headers.get("cookie"));
    const refreshToken = cookies.refreshToken;

    if (!refreshToken) return jsonResponse({ error: "No refresh token" }, { status: 401 });

    try {
      const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as {
        sub: string;
        email?: string;
        typ?: string;
      };

      if (decoded.typ !== "refresh") {
        return jsonResponse({ error: "Invalid refresh token" }, { status: 401 });
      }

      const saved = await refreshTokens.findOne({ userId: decoded.sub });
      if (!saved?.tokenHash) return jsonResponse({ error: "Refresh token revoked" }, { status: 401 });

      const match = await bcrypt.compare(refreshToken, String(saved.tokenHash));
      if (!match) return jsonResponse({ error: "Invalid refresh token" }, { status: 401 });

      const user = await users.findOne({ _id: new ObjectId(decoded.sub) });
      if (!user?.email) return jsonResponse({ error: "User not found" }, { status: 401 });

      const role = resolveRole(user.role);
      const newAccessToken = issueAccessToken(decoded.sub, user.email, role);
      const newRefreshToken = issueRefreshToken(decoded.sub, user.email, role);

      await persistRefreshToken(decoded.sub, newRefreshToken);

      return jsonResponse(
        { ok: true, accessToken: newAccessToken },
        { headers: { "Set-Cookie": buildRefreshCookie(newRefreshToken) } }
      );
    } catch {
      return jsonResponse({ error: "Invalid refresh token" }, { status: 401 });
    }
  }

  // LOGOUT
  if (req.method === "POST" && url.pathname === "/auth/logout") {
    const cookies = parseCookies(req.headers.get("cookie"));
    const refreshToken = cookies.refreshToken;

    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as { sub?: string };
        if (decoded.sub) await refreshTokens.deleteOne({ userId: decoded.sub });
      } catch {
        // ogiltigt token — rensa cookie ändå
      }
    }

    return jsonResponse({ ok: true }, { headers: { "Set-Cookie": clearRefreshCookie() } });
  }

  // ME
  if (req.method === "GET" && url.pathname === "/me") {
    const authResult = requireAccessToken(req);
    if (!authResult.ok) return authResult.response;
    return jsonResponse({ message: "You are authenticated", user: authResult.decoded });
  }

  return null;
}