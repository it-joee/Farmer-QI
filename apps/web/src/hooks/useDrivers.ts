import { useCallback, useEffect, useState } from "react";
import type { Driver, PaginatedResponse } from "@farmeriq/shared";
import { formatDriverReferenceId } from "@farmeriq/shared";
import { canAccessDrivers, USER_CHANGED_EVENT } from "../auth";
import { apiFetch } from "../lib/api-client";
import { useAuthUser } from "./useAuth";

export function normalizeDriver(raw: Driver): Driver {
  return {
    ...raw,
    reference_id: raw.reference_id || formatDriverReferenceId(raw.id),
  };
}

interface DriversResponse extends PaginatedResponse<Driver> {
  summary?: {
    total_all: number;
    active_count: number;
    inactive_count: number;
  };
  vehicle_types?: string[];
}

export function useDrivers(
  page = 1,
  limit = 20,
  search = "",
  vehicleType = "",
  status = ""
) {
  const user = useAuthUser();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
  const [summary, setSummary] = useState({ total_all: 0, active_count: 0, inactive_count: 0 });
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    if (!user || !canAccessDrivers(user)) {
      setDrivers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
      ...(vehicleType && { vehicle_type: vehicleType }),
      ...(status && { status }),
    });

    apiFetch(`/api/drivers?${params.toString()}`)
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data: DriversResponse | null) => {
        if (!data) return;
        if (Array.isArray(data.data)) {
          setDrivers(data.data.map(normalizeDriver));
          setPagination({
            total: data.total,
            page: data.page,
            limit: data.limit,
            totalPages: data.totalPages,
          });
        }
        if (data.summary) {
          setSummary(data.summary);
        }
        if (Array.isArray(data.vehicle_types)) {
          setVehicleTypes(data.vehicle_types);
        }
      })
      .catch(() => {
        /* keep cached list */
      })
      .finally(() => setLoading(false));
  }, [user?.id, user?.role, refreshKey, page, limit, search, vehicleType, status]);

  useEffect(() => {
    function handleChanged() {
      refetch();
    }
    window.addEventListener(USER_CHANGED_EVENT, handleChanged);
    return () => window.removeEventListener(USER_CHANGED_EVENT, handleChanged);
  }, [refetch]);

  return { drivers, vehicleTypes, summary, pagination, loading, refetch };
}

export function useDriver(driverId: string) {
  const user = useAuthUser();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user || !canAccessDrivers(user) || !driverId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    apiFetch(`/api/drivers/${driverId}`)
      .then(async (r) => {
        if (!r.ok) {
          throw new Error("Driver not found");
        }
        return (await r.json()) as { driver: Driver };
      })
      .then((data) => {
        setDriver(normalizeDriver(data.driver));
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error("Failed to load driver"));
        setDriver(null);
      })
      .finally(() => setLoading(false));
  }, [user?.id, user?.role, driverId]);

  return { driver, loading, error };
}
