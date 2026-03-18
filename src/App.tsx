import React from "react";
import "./index.css";
import LibraryPage from "./pages/library.tsx";
import MyBooksPage from "./pages/mybooks.tsx";
import { LoginPage } from "./pages/Login.tsx";
import { RegisterPage } from "./pages/Register.tsx";

const routes: Record<string, React.ComponentType> = {
  "/login": LoginPage,
  "/register": RegisterPage,
  "/library": LibraryPage,
  "/authors": MyBooksPage,
};

export function App() {
  const path = window.location.pathname.toLowerCase();

  const Page = routes[path];
  if (Page) return <Page />;

  if (path !== "/") {
    return (
      <div className="app">
        <h1>404 - Page not found</h1>
        <p>
          Try <a href="/">/</a>, <a href="/login">/login</a>, or{" "}
          <a href="/register">/register</a>, <a href="/library">/library</a>, or{" "}
          <a href="/authors">/authors</a>.
        </p>
      </div>
    );
  }

  return <RegisterPage />;
}

export default App;
