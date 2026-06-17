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

  async function handleResolve(status: "resolved" | "dismissed") {
    const user = getCurrentUser();
    if (!user) return;

    const promptText =
      status === "resolved"
        ? "Optional note for resolving this flag:"
        : "Reason for dismissing this flag:";

    const reason = window.prompt(promptText) ?? "";
    if (status === "dismissed" && !reason.trim()) {
      setError("A reason is required to dismiss a flag.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      await resolveConflict(conflictId, status, user.id, reason.trim() || undefined);
      onResolved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update flag.");
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
        onClick={() => void handleResolve("resolved")}
      >
        Mark resolved
      </button>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        disabled={busy}
        onClick={() => void handleResolve("dismissed")}
      >
        Dismiss
      </button>
      {error && <span className="error conflict-resolve__error">{error}</span>}
    </div>
  );
}

export function filterOpenConflicts(conflicts: ConflictFlag[]): ConflictFlag[] {
  return conflicts.filter((flag) => flag.status === "open");
}
