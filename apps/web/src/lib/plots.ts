import type { FarmPlotDetail } from "@farmeriq/shared";
import { calculateAreas, pinsToPolygon } from "./geo";
import type { GpsPin } from "@farmeriq/shared";
import { apiFetch } from "./api-client";

export function buildPlotPayload(pins: GpsPin[]) {
  const { area_acres, area_hectares } = calculateAreas(pins);
  return {
    boundary: pinsToPolygon(pins),
    area_acres,
    area_hectares,
    gps_accuracy_notes: pins,
  };
}

export async function fetchFarmerPlots(farmerId: string): Promise<FarmPlotDetail[]> {
  const res = await apiFetch(`/api/farmers/${farmerId}/plots`);
  if (!res.ok) throw new Error("Failed to load plots");
  const data = await res.json();
  return data.plots ?? [];
}

export async function uploadFarmPlot(farmerId: string, pins: GpsPin[], createdBy: string) {
  const res = await apiFetch(`/api/farmers/${farmerId}/plots`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...buildPlotPayload(pins), created_by: createdBy }),
  });

  if (!res.ok) {
    throw new Error("Plot upload failed");
  }
}

export async function updateFarmPlot(
  farmerId: string,
  plotId: string,
  pins: GpsPin[],
  createdBy: string
) {
  const res = await apiFetch(`/api/farmers/${farmerId}/plots/${plotId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...buildPlotPayload(pins), created_by: createdBy }),
  });

  if (!res.ok) {
    throw new Error("Plot update failed");
  }
}
