import type { CreateCropCycleRequest, CropCycle } from "@farmeriq/shared";
import { apiFetch } from "./api-client";

export async function fetchCropCycles(farmerId: string): Promise<CropCycle[]> {
  const res = await apiFetch(`/api/farmers/${farmerId}/crop-cycles`);
  if (!res.ok) throw new Error("Failed to load crop cycles");
  const data = await res.json();
  return data.crop_cycles ?? [];
}

export async function createCropCycle(
  farmerId: string,
  payload: CreateCropCycleRequest & { created_by: string }
) {
  const res = await apiFetch(`/api/farmers/${farmerId}/crop-cycles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Crop cycle save failed");
  }

  return res.json();
}
