import { Link } from "react-router-dom";
import { useRequireAuth } from "../hooks/useFarmers";

export function DriversPage() {
  const user = useRequireAuth();

  if (!user) return null;

  return (
    <main className="main main--dashboard">
      <div className="toolbar">
        <div className="page-header" style={{ margin: 0 }}>
          <h2 style={{ margin: 0 }}>Drivers</h2>
          <p className="muted" style={{ margin: "0.25rem 0 0" }}>
            0 drivers registered
          </p>
        </div>
      </div>

      <div className="card" style={{ textAlign: "center", padding: "3.5rem 1.5rem" }}>
        <h3 style={{ margin: "0 0 0.5rem" }}>Driver Management</h3>
        <p className="muted" style={{ fontSize: "0.9375rem", margin: "0 0 1.5rem", maxWidth: "420px", marginLeft: "auto", marginRight: "auto" }}>
          Driver registration and fleet operations module will be available in an upcoming update.
        </p>
        <Link to="/" className="btn btn-secondary">
          Back to Overview
        </Link>
      </div>
    </main>
  );
}
