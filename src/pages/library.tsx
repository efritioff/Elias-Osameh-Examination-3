import "../Css/library.css";
import { useEffect, useMemo, useState } from "react";
import { logout } from "../auth";
import { fetchBooks, createBook, updateBook, deleteBook, type Book } from "../api/books";

export function LibraryPage() {
	const [books, setBooks] = useState<Book[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [query, setQuery] = useState("");
	const [modalOpen, setModalOpen] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [formTitle, setFormTitle] = useState("");
	const [formAuthor, setFormAuthor] = useState("");
	const [formError, setFormError] = useState("");
	const [saving, setSaving] = useState(false);

	async function loadBooks() {
			setLoading(true);
			setError("");
			try {
				const data = await fetchBooks();
				setBooks(data);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Kunde inte nå servern.");
			} finally {
				setLoading(false);
			}
	}

	async function handleLogout() {
		await logout();
		window.location.href = "/login";
	}

	useEffect(() => {
		loadBooks();
	}, []);

	function openCreateModal() {
		setEditingId(null);
		setFormTitle("");
		setFormAuthor("");
		setFormError("");
		setModalOpen(true);
	}

	function openEditModal(book: Book) {
		setEditingId(book._id);
		setFormTitle(book.book_title);
		setFormAuthor(book.author);
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

		const book_title = formTitle.trim();
		const author = formAuthor.trim();
		if (!book_title || !author) {
			setFormError("Book title och author krävs.");
			return;
		}

		setSaving(true);
		try {
			if (editingId === null) {
				await createBook(book_title, author);
			} else {
				await updateBook(editingId, book_title, author);
			}
			await loadBooks();
			setModalOpen(false);
		} catch (err) {
			setFormError(err instanceof Error ? err.message : "Kunde inte spara boken.");
		} finally {
			setSaving(false);
		}
	}

	async function handleDelete() {
		if (!editingId) return;
		setFormError("");
		setSaving(true);
		try {
			await deleteBook(editingId);
			await loadBooks();
			setModalOpen(false);
		} catch (err) {
			setFormError(err instanceof Error ? err.message : "Kunde inte radera boken.");
		} finally {
			setSaving(false);
		}
	}

	const filteredBooks = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return books;
		return books.filter(
			book =>
				book.book_title.toLowerCase().includes(q) ||
				book.author.toLowerCase().includes(q)
		);
	}, [books, query]);

	return (
		<div className="library-page">

			{/* ── Navbar ── */}
			<header className="lib-navbar">
				<div className="lib-navbar-brand">
					<span className="brand-ornament">❧</span>
					<span className="brand-name">Bibliotheca</span>
					<span className="brand-ornament mirrored">❧</span>
				</div>
				<nav className="lib-nav-links">
					<a href="#" className="nav-link active">Browse</a>
					<a href="/authors" className="nav-link">Authors</a>
					<button type="button" className="nav-link nav-logout" onClick={handleLogout}>Sign Out</button>
				</nav>
			</header>

			{/* ── Hero ── */}
			<section className="lib-hero">
				<p className="hero-eyebrow">— Welcome to the collection —</p>
				<h1 className="hero-title">The Reading Room</h1>
				<p className="hero-sub">
					Discover, borrow, and review books from our curated catalogue.
				</p>
			</section>

			{/* ── Search & Filter ── */}
			<section className="lib-toolbar">
				<div className="toolbar-actions">
					<button className="add-book-button" onClick={openCreateModal} type="button">
						Add Book
					</button>
				</div>
				<div className="search-wrap">
					<span className="search-icon">⚲</span>
					<input
						className="search-input"
						type="text"
						placeholder="Search by title or author…"
						value={query}
						onChange={e => setQuery(e.target.value)}
					/>
				</div>
			</section>

			<div className="results-count">
				<span>— {filteredBooks.length} volumes found —</span>
			</div>

			{/* ── Book Grid ── */}
			<main className="book-grid">
				{loading && <p>Laddar böcker...</p>}
				{error && <p>{error}</p>}

				{!loading && !error && filteredBooks.map(book => (
					<article className="book-card" key={book._id}>
						<div className="card-spine" />
						<div className="card-body">
							<p className="card-genre">Book</p>
							<h2 className="card-title">{book.book_title}</h2>
							<p className="card-author">— {book.author}</p>
							<div className="card-footer">
								<button
									className="edit-book-button"
									type="button"
									onClick={() => openEditModal(book)}
								>
									Edit
								</button>
							</div>
						</div>
					</article>
				))}
			</main>

			{/* ── Footer ── */}
			<footer className="lib-footer">
				<p>❧ Bibliotheca — {new Date().getFullYear()} ❧</p>
			</footer>

			<div className={`edit-overlay ${modalOpen ? "open" : ""}`} onClick={closeModal}>
				<div className="edit-modal" onClick={e => e.stopPropagation()}>
					<h2>{editingId ? "Edit Book" : "Add Book"}</h2>
					<form className="edit-form" onSubmit={handleSave}>
						<label htmlFor="book-title">Book Title</label>
						<input
							id="book-title"
							type="text"
							value={formTitle}
							onChange={e => setFormTitle(e.target.value)}
							required
						/>

						<label htmlFor="book-author">Author</label>
						<input
							id="book-author"
							type="text"
							value={formAuthor}
							onChange={e => setFormAuthor(e.target.value)}
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

export default LibraryPage;