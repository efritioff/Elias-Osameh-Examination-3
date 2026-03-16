import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";
import { users, refreshTokens } from "../db.ts";
import { REFRESH_SECRET, ACCESS_SECRET } from "../config.ts";
import {
  issueAccessToken,
  issueRefreshToken,
  persistRefreshToken,
} from "../auth.ts";
import { parseCookies, buildRefreshCookie, clearRefreshCookie, jsonResponse } from "../Utils.ts";

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
      return jsonResponse({ error: "email och password krävs" }, { status: 400 });
    }
    if (password.trim().length < 6) {
      return jsonResponse({ error: "losenordet maste vara minst 6 tecken" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    try {
      const result = await users.insertOne({ email, passwordHash, createdAt: new Date() });
      return jsonResponse({ ok: true, userId: result.insertedId });
    } catch {
      return jsonResponse({ error: "email finns redan" }, { status: 409 });
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
      return jsonResponse({ error: "email och password krävs" }, { status: 400 });
    }

    const user = await users.findOne({ email });
    if (!user) return jsonResponse({ error: "fel inloggning" }, { status: 401 });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return jsonResponse({ error: "fel inloggning" }, { status: 401 });

    const userId = String(user._id);
    const accessToken = issueAccessToken(userId, user.email);
    const refreshToken = issueRefreshToken(userId, user.email);

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

      const newAccessToken = issueAccessToken(decoded.sub, user.email);
      const newRefreshToken = issueRefreshToken(decoded.sub, user.email);

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
    const auth = req.headers.get("authorization");
    if (!auth) return jsonResponse({ error: "No token" }, { status: 401 });

    const token = auth.split(" ")[1];
    if (!token) return jsonResponse({ error: "No token" }, { status: 401 });

    try {
      const decoded = jwt.verify(token, ACCESS_SECRET);
      return jsonResponse({ message: "You are authenticated", user: decoded });
    } catch {
      return jsonResponse({ error: "Invalid token" }, { status: 401 });
    }
  }

  return null;
}