import "./Login.css";
import { useState } from "react";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("http://localhost:3001/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        accessToken?: string;
        error?: string;
      };

      if (!res.ok) {
        setMessage(data.error ?? "Login misslyckades");
        return;
      }

      const token = data.accessToken ?? "";
      if (token) {
        localStorage.setItem("accessToken", token);
      }

      setMessage("Inloggning lyckades");
    } catch {
      setMessage("Kunde inte nå servern på http://localhost:3001");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="form-wrapper">
        <h1>Login</h1>
        <form className="login-form" onSubmit={handleLogin}>
          <p>Email</p>
          <input
            type="email"
            placeholder="example@gmail.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <p>Password</p>
          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button className="login-button" disabled={loading} type="submit">
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        {message && <p className="status-text">{message}</p>}
        <p>Or Sign Up Using</p>
        <a href="/register">SIGN UP</a>
      </div>
    </main>
  );
}

export default LoginPage;
