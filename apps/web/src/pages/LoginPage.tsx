import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SKIP_AUTH } from "../auth";
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

  useEffect(() => {
    if (SKIP_AUTH) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

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
  }

  if (SKIP_AUTH) return null;

  return (
    <div className="login-page">
      <div className="card">
        <AppLogo as="h2" />
        <p className="muted">Sign in to your account</p>

        {sessionExpired && (
          <div
            style={{
              background: "var(--color-warning-bg, #fef9ec)",
              border: "1px solid var(--color-warning, #f59e0b)",
              borderRadius: "var(--radius)",
              padding: "0.75rem 1rem",
              marginBottom: "1rem",
              display: "flex",
              gap: "0.5rem",
              alignItems: "flex-start",
            }}
          >
            <span style={{ fontSize: "1rem", lineHeight: 1.4 }}>⏱️</span>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--color-warning-text, #92400e)", lineHeight: 1.5 }}>
              <strong>Your session has expired.</strong> Please sign in again to continue.
            </p>
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
          <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
