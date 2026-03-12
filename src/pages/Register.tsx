import "../Css/register.css";
import { useState } from "react";

export function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (password.trim().length < 6) {
      setMessage("Losenordet maste vara minst 6 tecken.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("http://localhost:3001/auth/register", {
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
      setMessage("Kunde inte nå servern på http://localhost:3001");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="register-page">
      <div className="form-wrapper">
        <h1>Register</h1>
        <form className="register-form" onSubmit={handleRegister}>
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
