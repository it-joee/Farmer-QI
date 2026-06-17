import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SKIP_AUTH } from "../auth";
import { AppLogo } from "../components/layout/AppLogo";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (SKIP_AUTH) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      setError("Invalid credentials");
      return;
    }

    const data = await res.json();
    localStorage.setItem("farmeriq_user", JSON.stringify(data.user));
    navigate("/");
  }

  if (SKIP_AUTH) return null;

  return (
    <div className="login-page">
      <div className="card">
        <AppLogo as="h2" />
        <p className="muted">Field agent sign in</p>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
