import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";

const uri = process.env.MONGO_URI!;
const client = new MongoClient(uri);

await client.connect();
console.log("MongoDB connected");

const db = client.db("myapp");
const users = db.collection("users");
const books = db.collection("books");
const authors = db.collection("authors");
const refreshTokens = db.collection("refreshTokens");

await users.createIndex({ email: 1 }, { unique: true });
await authors.createIndex({ name: 1 });
await refreshTokens.createIndex({ userId: 1 }, { unique: true });
await refreshTokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const accessSecret = process.env.JWT_ACCESS_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET;

if (!accessSecret || !refreshSecret) {
  throw new Error("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in .env");
}

const ACCESS_SECRET: string = accessSecret;
const REFRESH_SECRET: string = refreshSecret;

const accessTtl = (process.env.ACCESS_TTL || "15m") as SignOptions["expiresIn"];
const refreshTtl = (process.env.REFRESH_TTL || "7d") as SignOptions["expiresIn"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:3000",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
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

function parseTtlToMs(ttl: SignOptions["expiresIn"]) {
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
  return jwt.sign({ sub: userId, email }, ACCESS_SECRET, { expiresIn: accessTtl });
}

function issueRefreshToken(userId: string, email: string) {
  return jwt.sign({ sub: userId, email, typ: "refresh" }, REFRESH_SECRET, {
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

function requireAccessToken(req: Request) {
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

    // BOOKS - LIST
    if (req.method === "GET" && url.pathname === "/books") {
      const rows = await books
        .find(
          {},
          {
            projection: {
              _id: 1,
              book_title: 1,
              author: 1,
            },
          }
        )
        .toArray();

      return jsonResponse({
        ok: true,
        books: rows.map(row => ({
          _id: String(row._id ?? ""),
          book_title: String(row.book_title ?? ""),
          author: String(row.author ?? ""),
        })),
      });
    }

    // BOOKS - GET ONE
    if (req.method === "GET" && url.pathname.startsWith("/books/")) {
      const bookId = decodeURIComponent(url.pathname.replace("/books/", "")).trim();
      if (!bookId) {
        return jsonResponse({ error: "book id krävs" }, { status: 400 });
      }

      const filter: any = ObjectId.isValid(bookId)
        ? { $or: [{ _id: bookId }, { _id: new ObjectId(bookId) }] }
        : { _id: bookId };

      const row: any = await books.findOne(filter, {
        projection: {
          _id: 1,
          book_title: 1,
          author: 1,
        },
      });

      if (!row) {
        return jsonResponse({ error: "book finns inte" }, { status: 404 });
      }

      return jsonResponse({
        ok: true,
        book: {
          _id: String(row._id ?? ""),
          book_title: String(row.book_title ?? ""),
          author: String(row.author ?? ""),
        },
      });
    }

    // BOOKS - CREATE
    if (req.method === "POST" && url.pathname === "/books") {
      const authResult = requireAccessToken(req);
      if (!authResult.ok) return authResult.response;

      const body = await req.json().catch(() => null) as null | {
        book_title?: string;
        author?: string;
      };

      const bookTitle = body?.book_title?.trim();
      const author = body?.author?.trim();

      if (!bookTitle || !author) {
        return jsonResponse({ error: "book_title och author krävs" }, { status: 400 });
      }

      const result = await books.insertOne({
        book_title: bookTitle,
        author,
        createdAt: new Date(),
      });

      return jsonResponse(
        {
          ok: true,
          book: {
            _id: String(result.insertedId),
            book_title: bookTitle,
            author,
          },
        },
        { status: 201 }
      );
    }

    // BOOKS - UPDATE
    if (req.method === "PATCH" && url.pathname.startsWith("/books/")) {
      const authResult = requireAccessToken(req);
      if (!authResult.ok) return authResult.response;

      const bookId = decodeURIComponent(url.pathname.replace("/books/", "")).trim();
      if (!bookId) {
        return jsonResponse({ error: "book id krävs" }, { status: 400 });
      }

      const body = await req.json().catch(() => null) as null | {
        book_title?: string;
        author?: string;
      };

      const updates: Record<string, string> = {};
      if (typeof body?.book_title === "string") {
        const v = body.book_title.trim();
        if (!v) return jsonResponse({ error: "book_title får inte vara tom" }, { status: 400 });
        updates.book_title = v;
      }
      if (typeof body?.author === "string") {
        const v = body.author.trim();
        if (!v) return jsonResponse({ error: "author får inte vara tom" }, { status: 400 });
        updates.author = v;
      }

      if (Object.keys(updates).length === 0) {
        return jsonResponse({ error: "inga fält att uppdatera" }, { status: 400 });
      }

      const filter: any = ObjectId.isValid(bookId)
        ? { $or: [{ _id: bookId }, { _id: new ObjectId(bookId) }] }
        : { _id: bookId };

      const result = await books.updateOne(filter, { $set: updates });
      if (result.matchedCount === 0) {
        return jsonResponse({ error: "book finns inte" }, { status: 404 });
      }

      return jsonResponse({ ok: true });
    }

    // BOOKS - DELETE
    if (req.method === "DELETE" && url.pathname.startsWith("/books/")) {
      const authResult = requireAccessToken(req);
      if (!authResult.ok) return authResult.response;

      const bookId = decodeURIComponent(url.pathname.replace("/books/", "")).trim();
      if (!bookId) {
        return jsonResponse({ error: "book id krävs" }, { status: 400 });
      }

      const filter: any = ObjectId.isValid(bookId)
        ? { $or: [{ _id: bookId }, { _id: new ObjectId(bookId) }] }
        : { _id: bookId };

      const result = await books.deleteOne(filter);
      if (result.deletedCount === 0) {
        return jsonResponse({ error: "book finns inte" }, { status: 404 });
      }

      return jsonResponse({ ok: true });
    }

    // AUTHORS - LIST
    if (req.method === "GET" && url.pathname === "/authors") {
      const rows = await authors
        .find(
          {},
          {
            projection: {
              _id: 1,
              name: 1,
              birth_year: 1,
              gender: 1,
            },
          }
        )
        .toArray();

      return jsonResponse({
        ok: true,
        authors: rows.map(row => ({
          _id: String(row._id ?? ""),
          name: String(row.name ?? ""),
          birth_year: Number(row.birth_year ?? 0),
          gender: String(row.gender ?? ""),
        })),
      });
    }

    // AUTHORS - GET ONE
    if (req.method === "GET" && url.pathname.startsWith("/authors/")) {
      const authorId = decodeURIComponent(url.pathname.replace("/authors/", "")).trim();
      if (!authorId) {
        return jsonResponse({ error: "author id krävs" }, { status: 400 });
      }

      const idNumber = Number(authorId);
      const idFilters: any[] = [{ _id: authorId }];
      if (Number.isFinite(idNumber)) idFilters.push({ _id: idNumber });
      if (ObjectId.isValid(authorId)) idFilters.push({ _id: new ObjectId(authorId) });

      const filter: any = idFilters.length > 1 ? { $or: idFilters } : idFilters[0];

      const row: any = await authors.findOne(
        filter,
        {
          projection: {
            _id: 1,
            name: 1,
            birth_year: 1,
            gender: 1,
          },
        }
      );

      if (!row) {
        return jsonResponse({ error: "author finns inte" }, { status: 404 });
      }

      return jsonResponse({
        ok: true,
        author: {
          _id: String(row._id ?? ""),
          name: String(row.name ?? ""),
          birth_year: Number(row.birth_year ?? 0),
          gender: String(row.gender ?? ""),
        },
      });
    }

    // AUTHORS - CREATE
    if (req.method === "POST" && url.pathname === "/authors") {
      const authResult = requireAccessToken(req);
      if (!authResult.ok) return authResult.response;

      const body = await req.json().catch(() => null) as null | {
        name?: string;
        birth_year?: number;
        gender?: string;
      };

      const name = body?.name?.trim();
      const gender = body?.gender?.trim();
      const birthYear = Number(body?.birth_year);
      const currentYear = new Date().getFullYear();

      if (!name || !gender || !Number.isFinite(birthYear)) {
        return jsonResponse({ error: "name, birth_year och gender krävs" }, { status: 400 });
      }

      if (birthYear < 1900 || birthYear > currentYear) {
        return jsonResponse({ error: "birth_year är ogiltigt" }, { status: 400 });
      }

      const result = await authors.insertOne({
        name,
        birth_year: birthYear,
        gender,
        createdAt: new Date(),
      });

      return jsonResponse(
        {
          ok: true,
          author: {
            _id: String(result.insertedId),
            name,
            birth_year: birthYear,
            gender,
          },
        },
        { status: 201 }
      );
    }

    // AUTHORS - UPDATE
    if (req.method === "PATCH" && url.pathname.startsWith("/authors/")) {
      const authResult = requireAccessToken(req);
      if (!authResult.ok) return authResult.response;

      const authorId = decodeURIComponent(url.pathname.replace("/authors/", "")).trim();
      if (!authorId) {
        return jsonResponse({ error: "author id krävs" }, { status: 400 });
      }

      const body = await req.json().catch(() => null) as null | {
        name?: string;
        birth_year?: number;
        gender?: string;
      };

      const updates: Record<string, string | number> = {};
      if (typeof body?.name === "string") {
        const v = body.name.trim();
        if (!v) return jsonResponse({ error: "name får inte vara tom" }, { status: 400 });
        updates.name = v;
      }
      if (typeof body?.gender === "string") {
        const v = body.gender.trim();
        if (!v) return jsonResponse({ error: "gender får inte vara tom" }, { status: 400 });
        updates.gender = v;
      }
      if (typeof body?.birth_year !== "undefined") {
        const birthYear = Number(body.birth_year);
        const currentYear = new Date().getFullYear();
        if (!Number.isFinite(birthYear) || birthYear < 1900 || birthYear > currentYear) {
          return jsonResponse({ error: "birth_year är ogiltigt" }, { status: 400 });
        }
        updates.birth_year = birthYear;
      }

      if (Object.keys(updates).length === 0) {
        return jsonResponse({ error: "inga fält att uppdatera" }, { status: 400 });
      }

      const idNumber = Number(authorId);
      const idFilters: any[] = [{ _id: authorId }];
      if (Number.isFinite(idNumber)) idFilters.push({ _id: idNumber });
      if (ObjectId.isValid(authorId)) idFilters.push({ _id: new ObjectId(authorId) });

      const filter: any = idFilters.length > 1 ? { $or: idFilters } : idFilters[0];

      const result = await authors.updateOne(
        filter,
        { $set: updates }
      );

      if (result.matchedCount === 0) {
        return jsonResponse({ error: "author finns inte" }, { status: 404 });
      }

      return jsonResponse({ ok: true });
    }

    // AUTHORS - DELETE
    if (req.method === "DELETE" && url.pathname.startsWith("/authors/")) {
      const authResult = requireAccessToken(req);
      if (!authResult.ok) return authResult.response;

      const authorId = decodeURIComponent(url.pathname.replace("/authors/", "")).trim();
      if (!authorId) {
        return jsonResponse({ error: "author id krävs" }, { status: 400 });
      }

      const idNumber = Number(authorId);
      const idFilters: any[] = [{ _id: authorId }];
      if (Number.isFinite(idNumber)) idFilters.push({ _id: idNumber });
      if (ObjectId.isValid(authorId)) idFilters.push({ _id: new ObjectId(authorId) });

      const filter: any = idFilters.length > 1 ? { $or: idFilters } : idFilters[0];

      const result = await authors.deleteOne(filter);
      if (result.deletedCount === 0) {
        return jsonResponse({ error: "author finns inte" }, { status: 404 });
      }

      return jsonResponse({ ok: true });
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
        const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as {
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
          const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as { sub?: string };
          if (decoded.sub) {
            await refreshTokens.deleteOne({ userId: decoded.sub });
          }
        } catch {
          // If token is invalid = clear cookie to end client session.
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
      if (!token) {
        return jsonResponse({ error: "No token" }, { status: 401 });
      }

      try {

        const decoded = jwt.verify(token, ACCESS_SECRET);

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