import "./mybooks.css";

export function MyBooksPage() {
  return (
    <div className="mybooks-page">

      {/* ── Navbar ── */}
      <header className="lib-navbar">
        <div className="lib-navbar-brand">
          <span className="brand-ornament">❧</span>
          <span className="brand-name">Bibliotheca</span>
          <span className="brand-ornament mirrored">❧</span>
        </div>
        <nav className="lib-nav-links">
          <a href="/library" className="nav-link">Browse</a>
          <a href="#" className="nav-link active">My Books</a>
          <a href="/login" className="nav-link nav-logout">Sign Out</a>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="lib-hero">
        <p className="hero-eyebrow">— Your personal shelf —</p>
        <h1 className="hero-title">My Borrowed Books</h1>
        <p className="hero-sub">
          A record of the volumes currently in your care.
        </p>
      </section>

      {/* ── Summary Strip ── */}
      <section className="mybooks-summary">
        <div className="summary-card">
          <span className="summary-number">0</span>{/* TODO: total borrowed count */}
          <span className="summary-label">Books Borrowed</span>
        </div>
        <div className="summary-divider">❧</div>
        <div className="summary-card">
          <span className="summary-number">0</span>{/* TODO: due soon count */}
          <span className="summary-label">Due This Week</span>
        </div>
        <div className="summary-divider">❧</div>
        <div className="summary-card">
          <span className="summary-number">0</span>{/* TODO: overdue count */}
          <span className="summary-label">Overdue</span>
        </div>
      </section>

      {/* ── Borrowed Books List ── */}
      {/* TODO: map over the user's borrowed books from your API */}
      <main className="mybooks-list">

        {/* ── Section: Currently Reading ── */}
        <section className="mybooks-section">
          <h2 className="section-heading">
            <span className="section-rule" />
            Currently Borrowed
            <span className="section-rule" />
          </h2>

          {/* Book Row — repeat for each borrowed book */}
          <article className="mybook-row">
            <div className="mybook-spine" />
            <div className="mybook-info">
              <div className="mybook-meta">
                <p className="mybook-genre">Genre</p>
                <span className={`mybook-badge on-time`}>On Time</span>
              </div>
              <h3 className="mybook-title">Book Title</h3>
              <p className="mybook-author">— Author Name</p>
            </div>
            <div className="mybook-dates">
              <div className="date-block">
                <span className="date-label">Borrowed</span>
                <span className="date-value">1 Jan 2025</span>{/* TODO: borrowed date */}
              </div>
              <div className="date-arrow">→</div>
              <div className="date-block">
                <span className="date-label">Due</span>
                <span className="date-value">15 Jan 2025</span>{/* TODO: due date */}
              </div>
            </div>
            <div className="mybook-actions">
              {/* TODO: wire to POST /api/return/:id */}
              <button className="return-button">Return</button>
            </div>
          </article>

          {/* Due soon example */}
          <article className="mybook-row">
            <div className="mybook-spine due-spine" />
            <div className="mybook-info">
              <div className="mybook-meta">
                <p className="mybook-genre">Genre</p>
                <span className="mybook-badge due-soon">Due Soon</span>
              </div>
              <h3 className="mybook-title">Book Title</h3>
              <p className="mybook-author">— Author Name</p>
            </div>
            <div className="mybook-dates">
              <div className="date-block">
                <span className="date-label">Borrowed</span>
                <span className="date-value">5 Jan 2025</span>
              </div>
              <div className="date-arrow">→</div>
              <div className="date-block">
                <span className="date-label">Due</span>
                <span className="date-value due-date">12 Jan 2025</span>
              </div>
            </div>
            <div className="mybook-actions">
              <button className="return-button">Return</button>
            </div>
          </article>

          {/* Overdue example */}
          <article className="mybook-row">
            <div className="mybook-spine overdue-spine" />
            <div className="mybook-info">
              <div className="mybook-meta">
                <p className="mybook-genre">Genre</p>
                <span className="mybook-badge overdue">Overdue</span>
              </div>
              <h3 className="mybook-title">Book Title</h3>
              <p className="mybook-author">— Author Name</p>
            </div>
            <div className="mybook-dates">
              <div className="date-block">
                <span className="date-label">Borrowed</span>
                <span className="date-value">1 Dec 2024</span>
              </div>
              <div className="date-arrow">→</div>
              <div className="date-block">
                <span className="date-label">Due</span>
                <span className="date-value overdue-date">15 Dec 2024</span>
              </div>
            </div>
            <div className="mybook-actions">
              <button className="return-button urgent">Return Now</button>
            </div>
          </article>

        </section>

        {/* ── Section: Reading History ── */}
        <section className="mybooks-section">
          <h2 className="section-heading">
            <span className="section-rule" />
            Reading History
            <span className="section-rule" />
          </h2>

          {/* Returned book row — repeat for each past book */}
          {/* TODO: map over returned books from your API */}
          <article className="mybook-row returned">
            <div className="mybook-spine returned-spine" />
            <div className="mybook-info">
              <div className="mybook-meta">
                <p className="mybook-genre">Genre</p>
                <span className="mybook-badge returned-badge">Returned</span>
              </div>
              <h3 className="mybook-title">Book Title</h3>
              <p className="mybook-author">— Author Name</p>
            </div>
            <div className="mybook-dates">
              <div className="date-block">
                <span className="date-label">Borrowed</span>
                <span className="date-value">1 Nov 2024</span>
              </div>
              <div className="date-arrow">→</div>
              <div className="date-block">
                <span className="date-label">Returned</span>
                <span className="date-value">14 Nov 2024</span>
              </div>
            </div>
            <div className="mybook-actions">
              {/* TODO: link to book detail / borrow again */}
              <button className="reborrow-button">Borrow Again</button>
            </div>
          </article>

        </section>

        {/* ── Empty state (show when user has no books) ── */}
        {/* TODO: render this when borrowed list is empty */}
        <div className="mybooks-empty">
          <p className="empty-ornament">✦</p>
          <p className="empty-title">Your shelf is empty</p>
          <p className="empty-sub">Head to the catalogue to find your next read.</p>
          <a href="/library" className="browse-link">Browse the Collection →</a>
        </div>

      </main>

      {/* ── Footer ── */}
      <footer className="lib-footer">
        <p>❧ Bibliotheca — {new Date().getFullYear()} ❧</p>
      </footer>

    </div>
  );
}

export default MyBooksPage;