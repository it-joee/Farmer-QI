import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { canManageUsers } from "../auth";
import { useRequireAuth } from "../hooks/useFarmers";
import { Pagination } from "../components/Pagination";
import { NavIconTrash } from "../components/layout/NavIcons";
import { fetchTrash, restoreTrashItem, permanentDeleteTrashItem, emptyTrash, type TrashedEntity } from "../lib/trash";

export function TrashPage() {
  const user = useRequireAuth();
  const [items, setItems] = useState<TrashedEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadTrash = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchTrash(page, 20);
      setItems(response.data);
      setPagination({
        total: response.total,
        page: response.page,
        limit: response.limit,
        totalPages: response.totalPages,
      });
    } catch {
      setError("Could not load trash.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void loadTrash();
  }, [loadTrash]);

  if (!user) return null;
  // Use canManageUsers as a proxy for Admin access, as only admins should access Trash
  if (!canManageUsers(user)) {
    return <Navigate to="/" replace />;
  }

  const handleRestore = async (item: TrashedEntity) => {
    setProcessingId(item.id);
    try {
      await restoreTrashItem(item.type, item.id);
      await loadTrash();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to restore");
    } finally {
      setProcessingId(null);
    }
  };

  const handlePermanentDelete = async (item: TrashedEntity) => {
    if (!window.confirm("Are you sure you want to permanently delete this item? This action cannot be undone.")) return;
    
    setProcessingId(item.id);
    try {
      await permanentDeleteTrashItem(item.type, item.id);
      await loadTrash();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setProcessingId(null);
    }
  };

  const handleEmptyTrash = async () => {
    if (!window.confirm("Are you sure you want to empty the trash? All items will be permanently deleted and cannot be restored.")) return;
    
    try {
      await emptyTrash();
      await loadTrash();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to empty trash");
    }
  };

  return (
    <main className="main main--dashboard">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ margin: 0 }}>Trash Bin</h2>
          <p className="muted" style={{ margin: "0.25rem 0 0" }}>
            Review and restore deleted data, or empty the trash to free up space.
          </p>
        </div>
        <button 
          onClick={() => void handleEmptyTrash()}
          className="btn btn-secondary"
          style={{ color: "var(--color-danger, #ef4444)", borderColor: "var(--color-danger, #ef4444)", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
          disabled={items.length === 0}
        >
          <NavIconTrash />
          Empty Trash
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      <section className="card">
        {loading ? (
          <p className="muted">Loading trash…</p>
        ) : items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
            <div style={{ opacity: 0.5, marginBottom: "1rem", color: "var(--color-text-muted)" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19.5 5.5L19 11.5M4.5 5.5L5.10461 15.5368C5.25945 18.1073 5.33688 19.3925 5.97868 20.3167C6.296 20.7737 6.7048 21.1594 7.17905 21.4493C7.76127 21.8051 8.46343 21.945 9.5 22" />
                <path d="M11 15.5L12.1363 16.9657C12.708 14.8319 14.9014 13.5655 17.0352 14.1373C18.1275 14.43 18.9925 15.1475 19.5 16.0646M21 20.5L19.8637 19.0363C19.2919 21.1701 17.0986 22.4365 14.9647 21.8647C13.8978 21.5788 13.0477 20.8875 12.5359 20.001" />
                <path d="M3 5.5H21M16.0557 5.5L15.3731 4.09173C14.9196 3.15626 14.6928 2.68852 14.3017 2.39681C14.215 2.3321 14.1231 2.27454 14.027 2.2247C13.5939 2 13.0741 2 12.0345 2C10.9688 2 10.436 2 9.99568 2.23412C9.8981 2.28601 9.80498 2.3459 9.71729 2.41317C9.32164 2.7167 9.10063 3.20155 8.65861 4.17126L8.05292 5.5" />
              </svg>
            </div>
            <p className="muted">The trash bin is empty.</p>
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Name</th>
                    <th>Deleted On</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id}>
                      <td style={{ textTransform: "capitalize" }}>{row.type}</td>
                      <td>{row.name}</td>
                      <td>{new Date(row.deleted_at).toLocaleString()}</td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => void handleRestore(row)}
                            disabled={processingId === row.id}
                            title="Restore"
                          >
                            Restore
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => void handlePermanentDelete(row)}
                            disabled={processingId === row.id}
                            style={{ color: "var(--color-danger, #ef4444)" }}
                            title="Permanently Delete"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={pagination.page}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </section>
    </main>
  );
}
