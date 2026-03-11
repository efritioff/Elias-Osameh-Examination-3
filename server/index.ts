import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const uri = process.env.MONGO_URI!;
const client = new MongoClient(uri);

await client.connect();
console.log("MongoDB connected");

const db = client.db("myapp");
const users = db.collection("users");
const refreshTokens = db.collection("refreshTokens");

await users.createIndex({ email: 1 }, { unique: true });
await refreshTokens.createIndex({ userId: 1 }, { unique: true });
await refreshTokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const accessSecret = process.env.JWT_ACCESS_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET;

if (!accessSecret || !refreshSecret) {
  throw new Error("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in .env");
}

const accessTtl = process.env.ACCESS_TTL || "15m";
const refreshTtl = process.env.REFRESH_TTL || "7d";

const corsHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:3000",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true",
};

function parseCookies(cookieHeader: string | null) {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;

  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (!name) continue;
    out[name] = decodeURIComponent(rest.join("="));
  }

  return out;
}

function parseTtlToMs(ttl: string) {
  const raw = ttl.trim().toLowerCase();
  const fallback = 7 * 24 * 60 * 60 * 1000;

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

const isProd = process.env.NODE_ENV === "production";

function buildRefreshCookie(token: string) {
  const maxAgeMs = parseTtlToMs(refreshTtl);
  const maxAge = Math.floor(maxAgeMs / 1000);
  return [
    `refreshToken=${encodeURIComponent(token)}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/auth",
    `Max-Age=${maxAge}`,
    ...(isProd ? ["Secure"] : []),
  ].join("; ");
}

function clearRefreshCookie() {
  return [
    "refreshToken=",
    "HttpOnly",
    "SameSite=Lax",
    "Path=/auth",
    "Max-Age=0",
    ...(isProd ? ["Secure"] : []),
  ].join("; ");
}

function issueAccessToken(userId: string, email: string) {
  return jwt.sign({ sub: userId, email }, accessSecret, { expiresIn: accessTtl });
}

function issueRefreshToken(userId: string, email: string) {
  return jwt.sign({ sub: userId, email, typ: "refresh" }, refreshSecret, {
    expiresIn: refreshTtl,
  });
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return Response.json(body, {
    ...init,
    headers: {
      ...corsHeaders,
      ...(init?.headers ?? {}),
    },
  });
}

async function persistRefreshToken(userId: string, token: string) {
  const tokenHash = await bcrypt.hash(token, 12);
  const expiresAt = new Date(Date.now() + parseTtlToMs(refreshTtl));

  await refreshTokens.updateOne(
    { userId },
    {
      $set: {
        userId,
        tokenHash,
        expiresAt,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
}

Bun.serve({
  port: 3001,
  async fetch(req) {

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(req.url);

    // TEST
    if (req.method === "GET" && url.pathname === "/test") {

      const result = await users.insertOne({
        email: crypto.randomUUID() + "@test.com",
        createdAt: new Date()
      });

      return jsonResponse({
        ok: true,
        id: result.insertedId
      });
    }

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

        const result = await users.insertOne({
          email,
          passwordHash,
          createdAt: new Date()
        });

        return jsonResponse({
          ok: true,
          userId: result.insertedId
        });

      } catch (err) {

        return jsonResponse(
          { error: "email finns redan" },
          { status: 409 }
        );

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
      if (!user) {
        return jsonResponse({ error: "fel inloggning" }, { status: 401 });
      }

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        return jsonResponse({ error: "fel inloggning" }, { status: 401 });
      }

      const userId = String(user._id);
      const accessToken = issueAccessToken(userId, user.email);
      const refreshToken = issueRefreshToken(userId, user.email);

      await persistRefreshToken(userId, refreshToken);

      return jsonResponse(
        { ok: true, accessToken },
        {
          headers: {
            "Set-Cookie": buildRefreshCookie(refreshToken),
          },
        }
      );
    }

    // REFRESH
    if (req.method === "POST" && url.pathname === "/auth/refresh") {
      const cookies = parseCookies(req.headers.get("cookie"));
      const refreshToken = cookies.refreshToken;

      if (!refreshToken) {
        return jsonResponse({ error: "No refresh token" }, { status: 401 });
      }

      try {
        const decoded = jwt.verify(refreshToken, refreshSecret) as {
          sub: string;
          email?: string;
          typ?: string;
        };

        if (decoded.typ !== "refresh") {
          return jsonResponse({ error: "Invalid refresh token" }, { status: 401 });
        }

        const saved = await refreshTokens.findOne({ userId: decoded.sub });
        if (!saved?.tokenHash) {
          return jsonResponse({ error: "Refresh token revoked" }, { status: 401 });
        }

        const match = await bcrypt.compare(refreshToken, String(saved.tokenHash));
        if (!match) {
          return jsonResponse({ error: "Invalid refresh token" }, { status: 401 });
        }

        const user = await users.findOne({ _id: new ObjectId(decoded.sub) });
        if (!user?.email) {
          return jsonResponse({ error: "User not found" }, { status: 401 });
        }

        const newAccessToken = issueAccessToken(decoded.sub, user.email);
        const newRefreshToken = issueRefreshToken(decoded.sub, user.email);

        await persistRefreshToken(decoded.sub, newRefreshToken);

        return jsonResponse(
          { ok: true, accessToken: newAccessToken },
          {
            headers: {
              "Set-Cookie": buildRefreshCookie(newRefreshToken),
            },
          }
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
          const decoded = jwt.verify(refreshToken, refreshSecret) as { sub?: string };
          if (decoded.sub) {
            await refreshTokens.deleteOne({ userId: decoded.sub });
          }
        } catch {
          // If token is invalid we still clear cookie to end client session.
        }
      }

      return jsonResponse(
        { ok: true },
        {
          headers: {
            "Set-Cookie": clearRefreshCookie(),
          },
        }
      );
    }

    if (req.method === "GET" && url.pathname === "/me") {

      const auth = req.headers.get("authorization");

      if (!auth) {
        return jsonResponse({ error: "No token" }, { status: 401 });
      }

      const token = auth.split(" ")[1];

      try {

        const decoded = jwt.verify(token, accessSecret);

        return jsonResponse({
          message: "You are authenticated",
          user: decoded
        });

      } catch {

        return jsonResponse({ error: "Invalid token" }, { status: 401 });

      }

    }

    return new Response("Server running", { headers: corsHeaders });

  },
});

console.log("Server running on http://localhost:3001");