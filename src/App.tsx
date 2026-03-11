import "./index.css";
import { LoginPage } from "./pages/Login.tsx";
import { RegisterPage } from "./pages/Register.tsx";
import { LibraryPage } from "./pages/library.tsx";
import { MyBooksPage } from "./pages/mybooks.tsx";
import { getAccessToken } from "./auth";

export function App() {
  const path = window.location.pathname.toLowerCase();
  const protectedPaths = new Set(["/library", "/authors"]);

  if (protectedPaths.has(path) && !getAccessToken()) {
    window.location.href = "/login";
    return null;
  }

  if (path === "/login") {
    return <LoginPage />;
  }

  if (path === "/register") {
    return <RegisterPage />;
  }


  if (path === "/library") {
    return ( <LibraryPage /> );
  }

  if (path === "/authors") {
    return <MyBooksPage />;
  }

  if (path === "/") {
    window.location.href = "/library";
    return null;
  }

  if (path !== "/") {
    return (
      <div className="app">
        <h1>404 - Page not found</h1>
        <p>
          Try <a href="/">/</a>, <a href="/login">/login</a>, or{" "}
          <a href="/register">/register</a>, <a href="/library">/library</a>, or <a href="/authors">/authors</a>.
        </p>
      </div>
    );
  }

  return null;
}

export default App;
