import "./index.css";
import { LoginPage } from "./pages/Login.tsx";
import { RegisterPage } from "./pages/Register.tsx";
import { LibraryPage } from "./pages/library.tsx";

function HomePage() {
  return (
  <div>HomePage</div>
  );
}

export function App() {
  const path = window.location.pathname.toLowerCase();

  if (path === "/login") {
    return <LoginPage />;
  }

  if (path === "/register") {
    return <RegisterPage />;
  }


  if (path === "/library") {
    return ( <LibraryPage /> );
  }

  if (path !== "/") {
    return (
      <div className="app">
        <h1>404 - Page not found</h1>
        <p>
          Try <a href="/">/</a>, <a href="/login">/login</a>, or{" "}
          <a href="/register">/register</a>, or <a href="/library">/library</a>.
        </p>
      </div>
    );
  }

  return <HomePage />;
}

export default App;
