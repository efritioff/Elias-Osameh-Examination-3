import "./index.css";
import LibraryPage from "./pages/library.tsx";
import { LoginPage } from "./pages/Login.tsx";
import { RegisterPage } from "./pages/Register.tsx";


export function App() {
  const path = window.location.pathname.toLowerCase();

  if (path === "/login") {
    return <LoginPage />;
  }

  if (path === "/register") {
    return <RegisterPage />;
  }

if (path === "/library") {
    return <LibraryPage />;
  }


  if (path !== "/") {
    return (
      <div className="app">
        <h1>404 - Page not found</h1>
        <p>
          Try <a href="/">/</a>, <a href="/login">/login</a>, or{" "}
          <a href="/register">/register</a>.
        </p>
      </div>
    );
  }

  return <RegisterPage />;
}

export default App;
