import "./Library.css";
import { useEffect, useMemo, useState } from "react";

type Book = {
  _id: string;
  book_title: string;
  author: string;
  total_books: number;
  borrowed_books: number;
};

export function LibraryPage() {
	const [books, setBooks] = useState<Book[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [query, setQuery] = useState("");

	useEffect(() => {
		async function loadBooks() {
			setLoading(true);
			setError("");

			try {
				const res = await fetch("http://localhost:3001/books");
				const data = (await res.json().catch(() => ({}))) as {
					books?: Book[];
					error?: string;
				};

				if (!res.ok) {
					setError(data.error ?? "Kunde inte hämta böcker.");
					return;
				}

				setBooks(data.books ?? []);
			} catch {
				setError("Kunde inte nå servern på http://localhost:3001");
			} finally {
				setLoading(false);
			}
		}

		loadBooks();
	}, []);

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
					<a href="/mybooks" className="nav-link">My Books</a>
					<a href="/login" className="nav-link nav-logout">Sign Out</a>
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

			{/* ── Results count ── */}
			<div className="results-count">
				<span>— {filteredBooks.length} volumes found —</span>
			</div>

			{/* ── Book Grid ── */}
			<main className="book-grid">
				{loading && <p>Laddar böcker...</p>}
				{error && <p>{error}</p>}

				{!loading && !error && filteredBooks.map(book => {
					const availableCount = Math.max(book.total_books - book.borrowed_books, 0);
					const isAvailable = availableCount > 0;

					return (
						<article className="book-card" key={book._id}>
							<div className={`card-spine ${isAvailable ? "" : "borrowed-spine"}`} />
							<div className="card-body">
								<p className="card-genre">Book</p>
								<h2 className="card-title">{book.book_title}</h2>
								<p className="card-author">— {book.author}</p>
								<p className="card-desc">
									Total: {book.total_books} · Borrowed: {book.borrowed_books} · Available: {availableCount}
								</p>
								<div className="card-footer">
									<span className={`card-badge ${isAvailable ? "available" : "borrowed"}`}>
										{isAvailable ? "Available" : "Borrowed"}
									</span>
								</div>
							</div>
						</article>
					);
				})}

			</main>

			{/* ── Footer ── */}
			<footer className="lib-footer">
				<p>❧ Bibliotheca — {new Date().getFullYear()} ❧</p>
			</footer>

		</div>
	);
}

export default LibraryPage;
