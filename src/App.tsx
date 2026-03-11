import "./index.css";
import { LoginPage } from "./pages/Login.tsx";
import { RegisterPage } from "./pages/Register.tsx";

import logo from "./logo.svg";
import reactLogo from "./react.svg";

function HomePage() {
  return (
    <div className="app">
      <div className="logo-container">
        <img src={logo} alt="Bun Logo" className="logo bun-logo" />
        <img src={reactLogo} alt="React Logo" className="logo react-logo" />
      </div>

      <h1>Bun + React</h1>
      <p>
        Edit <code>src/App.tsx</code> and save to test HMR
      </p>
    </div>
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

  return <HomePage />;
}

export default App;
