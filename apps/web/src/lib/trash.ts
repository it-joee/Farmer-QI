import { apiFetch } from "./api-client";

export interface TrashedEntity {
  type: "farmer" | "aggregator" | "offtaker" | "event";
  id: string;
  name: string;
  deleted_at: string;
}

export interface TrashResponse {
  data: TrashedEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function fetchTrash(page = 1, limit = 20): Promise<TrashResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  const res = await apiFetch(`/api/trash?${params.toString()}`);
  if (!res.ok) {
    throw new Error("Failed to load trash");
  }

  return res.json() as Promise<TrashResponse>;
}

export async function restoreTrashItem(type: string, id: string): Promise<void> {
  const res = await apiFetch("/api/trash/restore", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type, id }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "Failed to restore item");
  }
}

export async function permanentDeleteTrashItem(type: string, id: string): Promise<void> {
  const res = await apiFetch("/api/trash/permanent", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type, id }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "Failed to permanently delete item");
  }
}

export async function emptyTrash(): Promise<void> {
  const res = await apiFetch("/api/trash/empty", {
    method: "DELETE",
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "Failed to empty trash");
  }
}
