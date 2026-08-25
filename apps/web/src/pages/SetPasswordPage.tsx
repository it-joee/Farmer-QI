import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLogo } from "../components/layout/AppLogo";
import { apiFetch } from "../lib/api-client";

export function SetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing invite link. Please ask your admin for a new one.");
    }
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSaving(true);

    const res = await apiFetch("/api/auth/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Could not set password. The link may have expired.");
      return;
    }

    setDone(true);
  }

  return (
    <div className="login-page">
      <div className="card">
        <AppLogo as="h2" />

        {done ? (
          <>
            <p style={{ color: "var(--color-success, #16a34a)", marginBottom: "1rem" }}>
              ✓ Password set successfully. You can now log in.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={() => navigate("/login")}
            >
              Go to login
            </button>
          </>
        ) : (
          <>
            <p className="muted">Set your account password</p>
            {error && <p className="error">{error}</p>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="sp-password">New password</label>
                <input
                  id="sp-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                  disabled={!token}
                />
              </div>
              <div className="form-group">
                <label htmlFor="sp-confirm">Confirm password</label>
                <input
                  id="sp-confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  required
                  minLength={8}
                  disabled={!token}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%" }}
                disabled={saving || !token}
              >
                {saving ? "Setting password…" : "Set password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
