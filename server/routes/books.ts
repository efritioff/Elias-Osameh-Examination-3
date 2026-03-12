import { ObjectId } from "mongodb";
import { books } from "../db.ts";
import { requireAccessToken } from "../auth.ts";
import { jsonResponse } from "../Utils.ts";

export async function handleBooks(req: Request, url: URL): Promise<Response | null> {

  // LIST
  if (req.method === "GET" && url.pathname === "/books") {
    const rows = await books
      .find({}, { projection: { _id: 1, book_title: 1, author: 1 } })
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

  // GET ONE
  if (req.method === "GET" && url.pathname.startsWith("/books/")) {
    const bookId = decodeURIComponent(url.pathname.replace("/books/", "")).trim();
    if (!bookId) return jsonResponse({ error: "book id krävs" }, { status: 400 });

    const filter: any = ObjectId.isValid(bookId)
      ? { $or: [{ _id: bookId }, { _id: new ObjectId(bookId) }] }
      : { _id: bookId };

    const row: any = await books.findOne(filter, {
      projection: { _id: 1, book_title: 1, author: 1 },
    });

    if (!row) return jsonResponse({ error: "book finns inte" }, { status: 404 });

    return jsonResponse({
      ok: true,
      book: {
        _id: String(row._id ?? ""),
        book_title: String(row.book_title ?? ""),
        author: String(row.author ?? ""),
      },
    });
  }

  // CREATE
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

    const result = await books.insertOne({ book_title: bookTitle, author, createdAt: new Date() });

    return jsonResponse(
      { ok: true, book: { _id: String(result.insertedId), book_title: bookTitle, author } },
      { status: 201 }
    );
  }

  // UPDATE
  if (req.method === "PATCH" && url.pathname.startsWith("/books/")) {
    const authResult = requireAccessToken(req);
    if (!authResult.ok) return authResult.response;

    const bookId = decodeURIComponent(url.pathname.replace("/books/", "")).trim();
    if (!bookId) return jsonResponse({ error: "book id krävs" }, { status: 400 });

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
    if (result.matchedCount === 0) return jsonResponse({ error: "book finns inte" }, { status: 404 });

    return jsonResponse({ ok: true });
  }

  // DELETE
  if (req.method === "DELETE" && url.pathname.startsWith("/books/")) {
    const authResult = requireAccessToken(req);
    if (!authResult.ok) return authResult.response;

    const bookId = decodeURIComponent(url.pathname.replace("/books/", "")).trim();
    if (!bookId) return jsonResponse({ error: "book id krävs" }, { status: 400 });

    const filter: any = ObjectId.isValid(bookId)
      ? { $or: [{ _id: bookId }, { _id: new ObjectId(bookId) }] }
      : { _id: bookId };

    const result = await books.deleteOne(filter);
    if (result.deletedCount === 0) return jsonResponse({ error: "book finns inte" }, { status: 404 });

    return jsonResponse({ ok: true });
  }

  return null; // ingen match
}