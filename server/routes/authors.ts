import { ObjectId } from "mongodb";
import { authors } from "../db.ts";
import { requireAccessToken } from "../auth.ts";
import { jsonResponse } from "../Utils.ts";

function buildIdFilter(authorId: string) {
  const idNumber = Number(authorId);
  const idFilters: any[] = [{ _id: authorId }];
  if (Number.isFinite(idNumber)) idFilters.push({ _id: idNumber });
  if (ObjectId.isValid(authorId)) idFilters.push({ _id: new ObjectId(authorId) });
  return idFilters.length > 1 ? { $or: idFilters } : idFilters[0];
}

export async function handleAuthors(req: Request, url: URL): Promise<Response | null> {

  // LIST
  if (req.method === "GET" && url.pathname === "/authors") {
    const rows = await authors
      .find({}, { projection: { _id: 1, name: 1, birth_year: 1, gender: 1 } })
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

  // GET ONE
  if (req.method === "GET" && url.pathname.startsWith("/authors/")) {
    const authorId = decodeURIComponent(url.pathname.replace("/authors/", "")).trim();
    if (!authorId) return jsonResponse({ error: "author id krävs" }, { status: 400 });

    const row: any = await authors.findOne(buildIdFilter(authorId), {
      projection: { _id: 1, name: 1, birth_year: 1, gender: 1 },
    });

    if (!row) return jsonResponse({ error: "author finns inte" }, { status: 404 });

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

  // CREATE
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

    const result = await authors.insertOne({ name, birth_year: birthYear, gender, createdAt: new Date() });

    return jsonResponse(
      { ok: true, author: { _id: String(result.insertedId), name, birth_year: birthYear, gender } },
      { status: 201 }
    );
  }

  // UPDATE
  if (req.method === "PATCH" && url.pathname.startsWith("/authors/")) {
    const authResult = requireAccessToken(req);
    if (!authResult.ok) return authResult.response;

    const authorId = decodeURIComponent(url.pathname.replace("/authors/", "")).trim();
    if (!authorId) return jsonResponse({ error: "author id krävs" }, { status: 400 });

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

    const result = await authors.updateOne(buildIdFilter(authorId), { $set: updates });
    if (result.matchedCount === 0) return jsonResponse({ error: "author finns inte" }, { status: 404 });

    return jsonResponse({ ok: true });
  }

  // DELETE
  if (req.method === "DELETE" && url.pathname.startsWith("/authors/")) {
    const authResult = requireAccessToken(req);
    if (!authResult.ok) return authResult.response;

    const authorId = decodeURIComponent(url.pathname.replace("/authors/", "")).trim();
    if (!authorId) return jsonResponse({ error: "author id krävs" }, { status: 400 });

    const result = await authors.deleteOne(buildIdFilter(authorId));
    if (result.deletedCount === 0) return jsonResponse({ error: "author finns inte" }, { status: 404 });

    return jsonResponse({ ok: true });
  }

  return null;
}