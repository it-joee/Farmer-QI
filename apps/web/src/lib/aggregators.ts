import type { Aggregator, AggregatorPhoto } from "@farmeriq/shared";
import type { AggregatorFormData } from "../pages/aggregator-form/types";
import { aggregatorFormToPayload } from "../pages/aggregator-form/types";
import { apiFetch } from "./api-client";

export async function fetchAggregator(aggregatorId: string): Promise<Aggregator> {
  const res = await apiFetch(`/api/aggregators/${aggregatorId}`);
  if (!res.ok) throw new Error("Aggregator not found");
  const data = await res.json();
  return data.aggregator;
}

export async function updateAggregator(
  aggregatorId: string,
  form: AggregatorFormData,
  updatedBy: string
) {
  const res = await apiFetch(`/api/aggregators/${aggregatorId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...aggregatorFormToPayload(form, updatedBy),
      updated_by: updatedBy,
    }),
  });

  if (!res.ok) {
    throw new Error("Aggregator update failed");
  }

  return res.json() as Promise<{ aggregator: Aggregator }>;
}

export async function deleteAggregator(aggregatorId: string, deletedBy: string) {
  const res = await apiFetch(`/api/aggregators/${aggregatorId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deleted_by: deletedBy }),
  });

  if (!res.ok) {
    throw new Error("Aggregator delete failed");
  }
}

export async function fetchAggregatorPhotos(aggregatorId: string): Promise<AggregatorPhoto[]> {
  const res = await apiFetch(`/api/aggregators/${aggregatorId}/photos`);
  if (!res.ok) throw new Error("Failed to load photos");
  const data = await res.json();
  return data.photos ?? [];
}
