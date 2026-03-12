import { authFetch } from "../auth";

const BASE = "http://localhost:3001";

export type Book = {
  _id: string;
  book_title: string;
  author: string;
};

export async function fetchBooks(): Promise<Book[]> {
  const res = await authFetch(`${BASE}/books`);
  if (res.status === 401) {
    window.location.href = "/login";
    return [];
  }
  const data = (await res.json().catch(() => ({}))) as { books?: Book[]; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Kunde inte hämta böcker.");
  return data.books ?? [];
}

export async function createBook(book_title: string, author: string): Promise<void> {
  const res = await authFetch(`${BASE}/books`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ book_title, author }),
  });
  if (res.status === 401) { window.location.href = "/login"; return; }
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Kunde inte spara boken.");
}

export async function updateBook(id: string, book_title: string, author: string): Promise<void> {
  const res = await authFetch(`${BASE}/books/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ book_title, author }),
  });
  if (res.status === 401) { window.location.href = "/login"; return; }
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Kunde inte spara boken.");
}

export async function deleteBook(id: string): Promise<void> {
  const res = await authFetch(`${BASE}/books/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (res.status === 401) { window.location.href = "/login"; return; }
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Kunde inte radera boken.");
}