import { FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLogo } from "../components/layout/AppLogo";
import { PasswordField } from "../components/fields/PasswordField";
import { apiFetch } from "../lib/api-client";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get("expired") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Invalid credentials");
        return;
      }

      const data = await res.json();
      localStorage.setItem("farmeriq_user", JSON.stringify(data.user));
      localStorage.setItem("farmeriq_token", data.token);
      window.dispatchEvent(new Event("farmeriq:user-changed"));
      navigate("/");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="card">
        <AppLogo as="h2" />
        <p className="muted">Sign in to your account</p>

        {sessionExpired && (
          <div className="alert--danger" role="alert">
            <strong>Your session has expired.</strong> Please sign in again to continue.
          </div>
        )}

        {error && <p className="error">{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. name@jniagri.ag"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <PasswordField
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={4}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
