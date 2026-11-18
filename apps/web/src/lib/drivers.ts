import type { CreateDriverRequest, Driver, UpdateDriverRequest } from "@farmeriq/shared";
import { apiFetch } from "./api-client";

export async function fetchDriver(driverId: string): Promise<Driver> {
  const res = await apiFetch(`/api/drivers/${driverId}`);
  if (!res.ok) throw new Error("Driver not found");
  const data = (await res.json()) as { driver: Driver };
  return data.driver;
}

export async function createDriver(payload: CreateDriverRequest): Promise<{ driver: Driver }> {
  const res = await apiFetch("/api/drivers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Could not create driver");
  }
  return res.json() as Promise<{ driver: Driver }>;
}

export async function updateDriver(
  driverId: string,
  payload: UpdateDriverRequest
): Promise<{ driver: Driver }> {
  const res = await apiFetch(`/api/drivers/${driverId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Could not update driver");
  }
  return res.json() as Promise<{ driver: Driver }>;
}

export async function deleteDriver(driverId: string): Promise<void> {
  const res = await apiFetch(`/api/drivers/${driverId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("Could not delete driver");
  }
}
