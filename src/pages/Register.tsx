import "../Css/register.css";
import { useState } from "react";
import { API_BASE } from "../api/config";

export function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    if (password.trim().length < 6) {
      setMessage("Losenordet maste vara minst 6 tecken.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!res.ok) {
        setMessage(data.error ?? "Registrering misslyckades");
        return;
      }

      window.location.href = "/login";
    } catch {
      setMessage(`Could not reach server at ${API_BASE}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="register-page">
      <div className="form-wrapper">
        <h1>Register</h1>
        <form className="register-form" onSubmit={handleRegister}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="example@gmail.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            minLength={6}
            required
          />
          <button className="register-button" disabled={loading} type="submit">
            {loading ? "Registering..." : "Register"}
          </button>
        </form>
        {message && <p className="status-text">{message}</p>}
        <p>Or Log In Using</p>
        <a href="/login">LOG IN</a>
      </div>
    </main>
  );
}

export default RegisterPage;
