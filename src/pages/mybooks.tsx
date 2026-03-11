import "./Library.css";
import { useEffect, useMemo, useState } from "react";
import { authFetch, logout } from "../auth";

type Author = {
  _id: string;
  name: string;
  birth_year: number;
  gender: string;
};

export function MyBooksPage() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formBirthYear, setFormBirthYear] = useState(2000);
  const [formGender, setFormGender] = useState("Agender");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadAuthors() {
    setLoading(true);
    setError("");

    try {
      const res = await authFetch("http://localhost:3001/authors");
      const data = (await res.json().catch(() => ({}))) as {
        authors?: Author[];
        error?: string;
      };

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!res.ok) {
        setError(data.error ?? "Kunde inte hämta authors.");
        return;
      }

      setAuthors(data.authors ?? []);
    } catch {
      setError("Kunde inte nå servern på http://localhost:3001");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    window.location.href = "/login";
  }

  useEffect(() => {
    loadAuthors();
  }, []);

  const filteredAuthors = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return authors;

    return authors.filter(
      author =>
        author.name.toLowerCase().includes(q) ||
        author.gender.toLowerCase().includes(q) ||
        String(author.birth_year).includes(q)
    );
  }, [authors, query]);

  function openCreateModal() {
    setEditingId(null);
    setFormName("");
    setFormBirthYear(2000);
    setFormGender("Agender");
    setFormError("");
    setModalOpen(true);
  }

  function openEditModal(author: Author) {
    setEditingId(author._id);
    setFormName(author.name);
    setFormBirthYear(author.birth_year);
    setFormGender(author.gender);
    setFormError("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setFormError("");
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");

    const name = formName.trim();
    const gender = formGender.trim();
    const birthYear = Number(formBirthYear);
    if (!name || !gender || !Number.isFinite(birthYear)) {
      setFormError("Name, birth year och gender krävs.");
      return;
    }

    setSaving(true);
    try {
      const isCreate = editingId === null;
      const url = isCreate
        ? "http://localhost:3001/authors"
        : `http://localhost:3001/authors/${encodeURIComponent(editingId)}`;
      const method = isCreate ? "POST" : "PATCH";

      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, birth_year: birthYear, gender }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        setFormError(data.error ?? "Kunde inte spara author.");
        return;
      }

      await loadAuthors();
      setModalOpen(false);
    } catch {
      setFormError("Kunde inte nå servern.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingId) return;

    setFormError("");
    setSaving(true);
    try {
      const res = await authFetch(`http://localhost:3001/authors/${encodeURIComponent(editingId)}`, {
        method: "DELETE",
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        setFormError(data.error ?? "Kunde inte ta bort author.");
        return;
      }

      await loadAuthors();
      setModalOpen(false);
    } catch {
      setFormError("Kunde inte nå servern.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="library-page">
      <header className="lib-navbar">
        <div className="lib-navbar-brand">
          <span className="brand-ornament">❧</span>
          <span className="brand-name">Bibliotheca</span>
          <span className="brand-ornament mirrored">❧</span>
        </div>
        <nav className="lib-nav-links">
          <a href="/library" className="nav-link">Browse</a>
          <a href="#" className="nav-link active">Authors</a>
          <button type="button" className="nav-link nav-logout" onClick={handleLogout}>Sign Out</button>
        </nav>
      </header>

      <section className="lib-hero">
        <p className="hero-eyebrow">— Welcome to the authors section —</p>
        <h1 className="hero-title">Authors</h1>
        <p className="hero-sub">Manage your author records with simple CRUD.</p>
      </section>

      <section className="lib-toolbar">
        <div className="toolbar-actions">
          <button className="add-book-button" onClick={openCreateModal} type="button">
            Add Author
          </button>
        </div>

        <div className="search-wrap">
          <span className="search-icon">⚲</span>
          <input
            className="search-input"
            type="text"
            placeholder="Search by name, gender or birth year..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </section>

      <div className="results-count">
        <span>— {filteredAuthors.length} authors found —</span>
      </div>

      <main className="book-grid">
        {loading && <p>Laddar authors...</p>}
        {error && <p>{error}</p>}

        {!loading && !error && filteredAuthors.map(author => (
          <article className="book-card" key={author._id}>
            <div className="card-spine" />
            <div className="card-body">
              <p className="card-genre">Author</p>
              <h2 className="card-title">{author.name}</h2>
              <p className="card-author">Birth year: {author.birth_year}</p>
              <p className="card-author">Gender: {author.gender}</p>
              <div className="card-footer">
                <button
                  className="edit-book-button"
                  type="button"
                  onClick={() => openEditModal(author)}
                >
                  Edit
                </button>
              </div>
            </div>
          </article>
        ))}
      </main>

      <footer className="lib-footer">
        <p>❧ Bibliotheca — {new Date().getFullYear()} ❧</p>
      </footer>

      <div className={`edit-overlay ${modalOpen ? "open" : ""}`} onClick={closeModal}>
        <div className="edit-modal" onClick={e => e.stopPropagation()}>
          <h2>{editingId ? "Edit Author" : "Add Author"}</h2>
          <form className="edit-form" onSubmit={handleSave}>
            <label htmlFor="author-name">Name</label>
            <input
              id="author-name"
              type="text"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              required
            />

            <label htmlFor="author-birth-year">Birth Year</label>
            <input
              id="author-birth-year"
              type="number"
              value={formBirthYear}
              onChange={e => setFormBirthYear(Number(e.target.value))}
              required
            />

            <label htmlFor="author-gender">Gender</label>
            <input
              id="author-gender"
              type="text"
              value={formGender}
              onChange={e => setFormGender(e.target.value)}
              required
            />

            {formError && <p className="form-error">{formError}</p>}

            <div className="modal-actions">
              <button type="button" onClick={closeModal} disabled={saving}>Cancel</button>
              {editingId && (
                <button type="button" className="danger" onClick={handleDelete} disabled={saving}>
                  Delete
                </button>
              )}
              <button type="submit" className="primary" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default MyBooksPage;