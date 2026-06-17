import type { Farmer, FarmerPhoto } from "@farmeriq/shared";
import type { FarmerFormData } from "../pages/farmer-form/types";
import { formToPayload } from "../pages/farmer-form/types";
import { apiFetch } from "./api-client";

export async function fetchFarmer(farmerId: string): Promise<Farmer> {
  const res = await apiFetch(`/api/farmers/${farmerId}`);
  if (!res.ok) throw new Error("Farmer not found");
  const data = await res.json();
  return data.farmer;
}

export async function updateFarmer(
  farmerId: string,
  form: FarmerFormData,
  updatedBy: string
) {
  const res = await apiFetch(`/api/farmers/${farmerId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...formToPayload(form, updatedBy), updated_by: updatedBy }),
  });

  if (!res.ok) {
    throw new Error("Farmer update failed");
  }

  return res.json() as Promise<{ farmer: Farmer }>;
}

export async function deleteFarmer(farmerId: string, deletedBy: string) {
  const res = await apiFetch(`/api/farmers/${farmerId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deleted_by: deletedBy }),
  });

  if (!res.ok) {
    throw new Error("Farmer delete failed");
  }
}

export async function fetchFarmerPhotos(farmerId: string): Promise<FarmerPhoto[]> {
  const res = await apiFetch(`/api/farmers/${farmerId}/photos`);
  if (!res.ok) throw new Error("Failed to load photos");
  const data = await res.json();
  return data.photos ?? [];
}
