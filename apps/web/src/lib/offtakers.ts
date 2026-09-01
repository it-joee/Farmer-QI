import type { Offtaker, OfftakerPhoto } from "@farmeriq/shared";
import type { OfftakerFormData } from "../pages/offtaker-form/types";
import { offtakerFormToPayload } from "../pages/offtaker-form/types";
import { apiFetch } from "./api-client";

export async function fetchOfftaker(offtakerId: string): Promise<Offtaker> {
  const res = await apiFetch(`/api/offtakers/${offtakerId}`);
  if (!res.ok) throw new Error("Offtaker not found");
  const data = await res.json();
  return data.offtaker;
}

export async function updateOfftaker(
  offtakerId: string,
  form: OfftakerFormData,
  updatedBy: string
) {
  const res = await apiFetch(`/api/offtakers/${offtakerId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...offtakerFormToPayload(form, updatedBy),
      updated_by: updatedBy,
    }),
  });

  if (!res.ok) {
    throw new Error("Offtaker update failed");
  }

  return res.json() as Promise<{ offtaker: Offtaker }>;
}

export async function deleteOfftaker(offtakerId: string, deletedBy: string) {
  const res = await apiFetch(`/api/offtakers/${offtakerId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deleted_by: deletedBy }),
  });

  if (!res.ok) {
    throw new Error("Offtaker delete failed");
  }
}

export async function fetchOfftakerPhotos(offtakerId: string): Promise<OfftakerPhoto[]> {
  const res = await apiFetch(`/api/offtakers/${offtakerId}/photos`);
  if (!res.ok) throw new Error("Failed to load photos");
  const data = await res.json();
  return data.photos ?? [];
}
