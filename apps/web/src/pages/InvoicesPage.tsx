import { useRequireAuth } from "../hooks/useFarmers";

export function InvoicesPage() {
  const user = useRequireAuth();
  if (!user) return null;

  return (
    <main className="main main--wide">
      <div className="toolbar">
        <div className="page-header" style={{ margin: 0 }}>
          <h2 style={{ margin: 0 }}>Invoices</h2>
          <p className="muted" style={{ margin: "0.25rem 0 0" }}>
            Manage commodity and waybill invoices
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: "2.5rem 1.5rem", textAlign: "center" }}>
        <p className="muted" style={{ margin: 0 }}>
          Invoices module is ready for setup. Database schema and invoice workflows will be connected here.
        </p>
      </div>
    </main>
  );
}
