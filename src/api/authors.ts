import { authFetch } from "../auth";

const BASE = "http://localhost:3001";

export type Author = {
  _id: string;
  name: string;
  birth_year: number;
  gender: string;
};

export async function fetchAuthors(): Promise<Author[]> {
  const res = await authFetch(`${BASE}/authors`);
  if (res.status === 401) {
    window.location.href = "/login";
    return [];
  }
  const data = (await res.json().catch(() => ({}))) as { authors?: Author[]; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Kunde inte hämta authors.");
  return data.authors ?? [];
}

export async function createAuthor(name: string, birth_year: number, gender: string): Promise<void> {
  const res = await authFetch(`${BASE}/authors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, birth_year, gender }),
  });
  if (res.status === 401) { window.location.href = "/login"; return; }
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Kunde inte spara author.");
}

export async function updateAuthor(id: string, name: string, birth_year: number, gender: string): Promise<void> {
  const res = await authFetch(`${BASE}/authors/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, birth_year, gender }),
  });
  if (res.status === 401) { window.location.href = "/login"; return; }
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Kunde inte spara author.");
}

export async function deleteAuthor(id: string): Promise<void> {
  const res = await authFetch(`${BASE}/authors/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (res.status === 401) { window.location.href = "/login"; return; }
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Kunde inte ta bort author.");
}