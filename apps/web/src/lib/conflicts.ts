import type { ConflictFlag, ConflictFlagWithFarmer } from "@farmeriq/shared";
import { apiFetch } from "./api-client";

export async function fetchFarmerConflicts(farmerId: string): Promise<ConflictFlag[]> {
  const res = await apiFetch(`/api/farmers/${farmerId}/conflicts`);
  if (!res.ok) throw new Error("Failed to load conflicts");
  const data = await res.json();
  return data.conflicts ?? [];
}

export async function resolveConflict(
  conflictId: string,
  status: "resolved" | "dismissed",
  resolvedBy: string,
  reason?: string
): Promise<ConflictFlag> {
  const res = await apiFetch(`/api/conflicts/${conflictId}/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, resolved_by: resolvedBy, reason }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "Could not update conflict");
  }

  const data = await res.json();
  return data.conflict;
}

export type ConflictReportRow = ConflictFlagWithFarmer;
