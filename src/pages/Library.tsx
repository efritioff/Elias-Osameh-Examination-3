import { useState } from "react";
import "./Library.css";


export interface Review {
  reviewer: string;
  rating: number; // 1-5
  comment: string;
  date: string;
}

export interface Book {
  id: number;
  title: string;
  author: string;
  genre: string;
  year: number;
  available: boolean;
  description: string;
  reviews: Review[];
}

// ── Mock data (replace with your API calls) ─ DELETE AFTER ADDING API ELIAS!!!
const MOCK_BOOKS: Book[] = [
  {
    id: 1,
    title: "The Name of the Rose",
    author: "Umberto Eco",
    genre: "Historical Mystery",
    year: 1980,
    available: true,
    description:
      "A medieval murder mystery set in an Italian monastery. Brother William of Baskerville investigates a series of deaths that seem connected to a forbidden book in the labyrinthine library.",
    reviews: [
      { reviewer: "Anna K.", rating: 5, comment: "Absolutely mesmerising. The library scenes are unforgettable.", date: "12 Jan 2025" },
      { reviewer: "James T.", rating: 4, comment: "Dense but rewarding. Eco's scholarship shines on every page.", date: "3 Mar 2025" },
    ],
  },
  {
    id: 2,
    title: "Fahrenheit 451",
    author: "Ray Bradbury",
    genre: "Dystopian Fiction",
    year: 1953,
    available: true,
    description:
      "In a future where books are banned and firemen burn them, Guy Montag begins to question the society he serves. A haunting meditation on censorship and the power of literature.",
    reviews: [
      { reviewer: "Sofia L.", rating: 5, comment: "A warning that feels more relevant every year.", date: "22 Feb 2025" },
    ],
  },
  {
    id: 3,
    title: "The Shadow of the Wind",
    author: "Carlos Ruiz Zafón",
    genre: "Gothic Mystery",
    year: 2001,
    available: false,
    description:
      "In post-war Barcelona, a young boy discovers a mysterious novel whose author seems to have been erased from history. A love letter to books and the city that shelters them.",
    reviews: [
      { reviewer: "Marco P.", rating: 5, comment: "The Cemetery of Forgotten Books is one of literature's great inventions.", date: "5 Jan 2025" },
      { reviewer: "Elena R.", rating: 4, comment: "Beautifully atmospheric. Barcelona feels alive.", date: "19 Feb 2025" },
    ],
  },
  {
    id: 4,
    title: "Middlemarch",
    author: "George Eliot",
    genre: "Classic Fiction",
    year: 1871,
    available: true,
    description:
      "A sweeping portrait of English provincial life, following the idealistic Dorothea Brooke and the ambitious Dr Lydgate as their paths cross in the fictional town of Middlemarch.",
    reviews: [
      { reviewer: "Claire M.", rating: 5, comment: "The greatest English novel. Every re-read reveals something new.", date: "8 Mar 2025" },
    ],
  },
  {
    id: 5,
    title: "The Library at Mount Char",
    author: "Scott Hawkins",
    genre: "Dark Fantasy",
    year: 2015,
    available: true,
    description:
      "Carolyn and her siblings were raised by a mysterious figure known only as Father, who taught them to master the knowledge contained in a vast and terrifying library.",
    reviews: [
      { reviewer: "Tom B.", rating: 4, comment: "Wildly original and deeply unsettling. Nothing else like it.", date: "14 Feb 2025" },
      { reviewer: "Nora H.", rating: 3, comment: "Compelling but very dark. Not for the faint-hearted.", date: "27 Feb 2025" },
    ],
  },
  {
    id: 6,
    title: "Possession",
    author: "A.S. Byatt",
    genre: "Literary Fiction",
    year: 1990,
    available: false,
    description:
      "Two modern literary scholars uncover a secret love affair between two Victorian poets. A richly layered novel that weaves poetry, letters, and diaries into a tapestry of obsession.",
    reviews: [
      { reviewer: "Rachel W.", rating: 5, comment: "A triumph of imagination. The Victorian pastiches are extraordinary.", date: "1 Mar 2025" },
    ],
  },
];

const GENRES = ["All", ...Array.from(new Set(MOCK_BOOKS.map((b) => b.genre)))];

function Stars({ rating }: { rating: number }) {
  return (
    <span className="stars" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= rating ? "star filled" : "star"}>★</span>
      ))}
    </span>
  );
}


function BookPanel({ book, onClose }: { book: Book; onClose: () => void }) {
  const avg =
    book.reviews.length
      ? Math.round(book.reviews.reduce((s, r) => s + r.rating, 0) / book.reviews.length)
      : 0;

  return (
    <div className="panel-overlay" onClick={onClose}>
      <aside className="book-panel" onClick={(e) => e.stopPropagation()}>
        <button className="panel-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="panel-header">
          <p className="panel-genre">{book.genre} · {book.year}</p>
          <h2 className="panel-title">{book.title}</h2>
          <p className="panel-author">by {book.author}</p>
          <span className={`panel-badge ${book.available ? "available" : "borrowed"}`}>
            {book.available ? "Available" : "Currently Borrowed"}
          </span>
        </div>

        <div className="panel-divider">— ✦ —</div>

        <p className="panel-description">{book.description}</p>

        <div className="panel-divider">— ✦ —</div>

        <div className="panel-reviews">
          <div className="reviews-heading">
            <h3>Reader Reviews</h3>
            {book.reviews.length > 0 && (
              <span className="avg-rating">
                <Stars rating={avg} />
                <span className="avg-number">{avg}.0</span>
              </span>
            )}
          </div>

          {book.reviews.length === 0 ? (
            <p className="no-reviews">No reviews yet. Be the first!</p>
          ) : (
            <ul className="review-list">
              {book.reviews.map((r, i) => (
                <li key={i} className="review-item">
                  <div className="review-meta">
                    <strong>{r.reviewer}</strong>
                    <Stars rating={r.rating} />
                    <time>{r.date}</time>
                  </div>
                  <p className="review-comment">"{r.comment}"</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        
        {book.available && (
          <button className="borrow-button">Borrow This Book</button>
        )}
      </aside>
    </div>
  );
}


export function LibraryPage() {
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("All");
  const [selected, setSelected] = useState<Book | null>(null);

  // Filter logic — swap MOCK_BOOKS for your API data
  const filtered = MOCK_BOOKS.filter((b) => {
    const matchSearch =
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.author.toLowerCase().includes(search.toLowerCase());
    const matchGenre = genre === "All" || b.genre === genre;
    return matchSearch && matchGenre;
  });

  return (
    <div className="library-page">
      
      <header className="lib-navbar">
        <div className="lib-navbar-brand">
          <span className="brand-ornament">❧</span>
          <span className="brand-name">Bibliotheca</span>
          <span className="brand-ornament mirrored">❧</span>
        </div>
        <nav className="lib-nav-links">
          <a href="#" className="nav-link active">Browse</a>
          <a href="#" className="nav-link">My Books</a>
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

      
      <section className="lib-toolbar">
        <div className="search-wrap">
          <span className="search-icon">⚲</span>
          <input
            className="search-input"
            type="text"
            placeholder="Search by title or author…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch("")}>✕</button>
          )}
        </div>

        <div className="genre-filters">
          {GENRES.map((g) => (
            <button
              key={g}
              className={`genre-pill ${genre === g ? "active" : ""}`}
              onClick={() => setGenre(g)}
            >
              {g}
            </button>
          ))}
        </div>
      </section>

      
      <div className="results-count">
        <span>{filtered.length} {filtered.length === 1 ? "volume" : "volumes"} found</span>
      </div>

      
      <main className="book-grid">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <p className="empty-ornament">✦</p>
            <p>No books match your search.</p>
          </div>
        ) : (
          filtered.map((book, i) => (
            <article
              key={book.id}
              className="book-card"
              style={{ animationDelay: `${i * 0.06}s` }}
              onClick={() => setSelected(book)}
            >
              
              <div className={`card-spine ${book.available ? "" : "borrowed-spine"}`} />

              <div className="card-body">
                <p className="card-genre">{book.genre}</p>
                <h2 className="card-title">{book.title}</h2>
                <p className="card-author">— {book.author}</p>

                <p className="card-desc">{book.description.slice(0, 100)}…</p>

                <div className="card-footer">
                  <span className={`card-badge ${book.available ? "available" : "borrowed"}`}>
                    {book.available ? "Available" : "Borrowed"}
                  </span>
                  {book.reviews.length > 0 && (
                    <span className="card-reviews">
                      {"★".repeat(Math.round(book.reviews.reduce((s, r) => s + r.rating, 0) / book.reviews.length))}
                      <span className="review-count"> ({book.reviews.length})</span>
                    </span>
                  )}
                </div>
              </div>
            </article> 
          ))
        )}
      </main>

      
      {selected && <BookPanel book={selected} onClose={() => setSelected(null)} />}

      
      <footer className="lib-footer">
        <p>❧ Bibliotheca — {new Date().getFullYear()} ❧</p>
      </footer>
    </div>
  );
}

export default LibraryPage;