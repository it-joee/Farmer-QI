import { useState } from "react";
import type { ConflictFlag } from "@farmeriq/shared";
import { getCurrentUser } from "../auth";
import { resolveConflict } from "../lib/conflicts";

interface ConflictResolveActionsProps {
  conflictId: string;
  onResolved: () => void;
}

export function ConflictResolveActions({ conflictId, onResolved }: ConflictResolveActionsProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [modalStatus, setModalStatus] = useState<"resolved" | "dismissed" | null>(null);
  const [reason, setReason] = useState("");
  const [modalError, setModalError] = useState("");

  function openModal(status: "resolved" | "dismissed") {
    setError("");
    setModalError("");
    setReason("");
    setModalStatus(status);
  }

  function closeModal() {
    if (busy) return;
    setModalStatus(null);
    setModalError("");
    setReason("");
  }

  async function submitModal() {
    if (!modalStatus) return;
    const user = getCurrentUser();
    if (!user) return;

    if (modalStatus === "dismissed" && !reason.trim()) {
      setModalError("A reason is required to dismiss a flag.");
      return;
    }

    setBusy(true);
    setModalError("");
    setError("");

    try {
      await resolveConflict(conflictId, modalStatus, user.id, reason.trim() || undefined);
      setModalStatus(null);
      setReason("");
      onResolved();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Could not update flag.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="conflict-resolve">
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        disabled={busy}
        onClick={() => openModal("resolved")}
      >
        Mark resolved
      </button>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        disabled={busy}
        onClick={() => openModal("dismissed")}
      >
        Dismiss
      </button>
      {error && <span className="error conflict-resolve__error">{error}</span>}

      {modalStatus && (
        <div className="confirm-modal-overlay" onClick={closeModal}>
          <div
            className="confirm-modal-card"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") closeModal();
            }}
          >
            <div
              className={`confirm-modal-icon confirm-modal-icon--${
                modalStatus === "dismissed" ? "warning" : "primary"
              }`}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>

            <div className="confirm-modal-content">
              <h3 className="confirm-modal-title">
                {modalStatus === "resolved" ? "Resolve Conflict Flag" : "Dismiss Conflict Flag"}
              </h3>
              <p className="confirm-modal-message" style={{ marginBottom: "0.75rem" }}>
                {modalStatus === "resolved"
                  ? "Add an optional note explaining how this conflict was resolved."
                  : "Please provide a reason for dismissing this conflict flag."}
              </p>
              <div className="form-group" style={{ margin: 0, textAlign: "left" }}>
                <label htmlFor={`conflict-reason-${conflictId}`} className="sr-only">
                  {modalStatus === "resolved" ? "Resolution note" : "Dismissal reason"}
                </label>
                <textarea
                  id={`conflict-reason-${conflictId}`}
                  rows={3}
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (modalError) setModalError("");
                  }}
                  placeholder={
                    modalStatus === "resolved"
                      ? "Optional note (e.g. Verified Ghana Card with farmer)..."
                      : "Reason for dismissing (required)..."
                  }
                  autoFocus
                />
                {modalError && (
                  <span className="field-error" role="alert" style={{ display: "block", marginTop: "0.25rem" }}>
                    {modalError}
                  </span>
                )}
              </div>
            </div>

            <div className="confirm-modal-actions">
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={closeModal}>
                Cancel
              </button>
              <button
                type="button"
                className={`btn ${modalStatus === "dismissed" ? "btn-warning" : "btn-primary"}`}
                disabled={busy}
                onClick={() => void submitModal()}
              >
                {busy
                  ? "Saving..."
                  : modalStatus === "resolved"
                    ? "Mark Resolved"
                    : "Dismiss Flag"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function filterOpenConflicts(conflicts: ConflictFlag[]): ConflictFlag[] {
  return conflicts.filter((flag) => flag.status === "open");
}
