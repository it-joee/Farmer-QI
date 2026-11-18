import { useCallback, useEffect, useState } from "react";
import type { Farmer, PaginatedResponse } from "@farmeriq/shared";
import { formatFarmerReferenceId } from "@farmeriq/shared";
import { apiFetch } from "../lib/api-client";
import { useAuthUser } from "./useAuth";
import { USER_CHANGED_EVENT } from "../auth";

export const FARMERS_SYNCED_EVENT = "farmeriq:farmers-synced";

export function normalizeFarmer(raw: Farmer): Farmer {
  return {
    ...raw,
    reference_id: raw.reference_id || formatFarmerReferenceId(raw.id),
    primary_crops: raw.primary_crops ?? [],
  };
}

export { useRequireAuth } from "./useAuth";

export function useFarmers(
  page = 1,
  limit = 20,
  search = "",
  commodity = "",
  region = "",
  district = "",
  gender = ""
) {
  const user = useAuthUser();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    if (!user) {
      setFarmers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
      ...(commodity && { commodity }),
      ...(region && { region }),
      ...(district && { district }),
      ...(gender && { gender }),
    });

    apiFetch(`/api/farmers?${params.toString()}`)
      .then((r) => r.json())
      .then((data: PaginatedResponse<Farmer> | { farmers: Farmer[] }) => {
        if ("data" in data) {
          setFarmers(data.data.map(normalizeFarmer));
          setPagination({
            total: data.total,
            page: data.page,
            limit: data.limit,
            totalPages: data.totalPages,
          });
        } else {
          setFarmers((data.farmers ?? []).map(normalizeFarmer));
        }
      })
      .catch(() => {
        /* keep cached list when offline */
      })
      .finally(() => setLoading(false));
  }, [user?.id, user?.role, refreshKey, page, limit, search, commodity, region, district, gender]);

  useEffect(() => {
    function handleSynced() {
      refetch();
    }

    window.addEventListener(FARMERS_SYNCED_EVENT, handleSynced);
    window.addEventListener(USER_CHANGED_EVENT, handleSynced);
    return () => {
      window.removeEventListener(FARMERS_SYNCED_EVENT, handleSynced);
      window.removeEventListener(USER_CHANGED_EVENT, handleSynced);
    };
  }, [refetch]);

  return { farmers, pagination, loading, refetch };
}

export function useAllFarmers() {
  const user = useAuthUser();
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    if (!user) {
      setFarmers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    apiFetch(`/api/farmers/all`)
      .then((r) => r.json())
      .then((data: { farmers: Farmer[] }) => {
        setFarmers((data.farmers ?? []).map(normalizeFarmer));
      })
      .catch(() => {
        /* keep cached list when offline */
      })
      .finally(() => setLoading(false));
  }, [user?.id, user?.role, refreshKey]);

  useEffect(() => {
    function handleSynced() {
      refetch();
    }

    window.addEventListener(FARMERS_SYNCED_EVENT, handleSynced);
    window.addEventListener(USER_CHANGED_EVENT, handleSynced);
    return () => {
      window.removeEventListener(FARMERS_SYNCED_EVENT, handleSynced);
      window.removeEventListener(USER_CHANGED_EVENT, handleSynced);
    };
  }, [refetch]);

  return { farmers, loading, refetch };
}

export interface FarmerStats {
  totalRegistered: number;
  districts: number;
  regions: number;
  male: number;
  female: number;
  by_commodity: { label: string; count: number; percentage: number }[];
  by_region: { label: string; count: number; percentage: number }[];
  by_district: { label: string; count: number; percentage: number }[];
}

const EMPTY_STATS: FarmerStats = {
  totalRegistered: 0,
  districts: 0,
  regions: 0,
  male: 0,
  female: 0,
  by_commodity: [],
  by_region: [],
  by_district: [],
};

export function useFarmerStats(commodity?: string | null) {
  const user = useAuthUser();
  const [stats, setStats] = useState<FarmerStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    if (!user) {
      setStats(EMPTY_STATS);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (commodity && commodity !== "all") {
      params.set("commodity", commodity);
    }
    const qs = params.toString();
    apiFetch(`/api/farmers/stats${qs ? `?${qs}` : ""}`)
      .then((r) => r.json())
      .then((data: FarmerStats) => {
        if (!cancelled && data && typeof data.totalRegistered === "number") {
          setStats(data);
        }
      })
      .catch(() => {
        /* keep existing stats when offline */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role, commodity, refreshKey]);

  useEffect(() => {
    function handleSynced() {
      refetch();
    }

    window.addEventListener(FARMERS_SYNCED_EVENT, handleSynced);
    window.addEventListener(USER_CHANGED_EVENT, handleSynced);
    return () => {
      window.removeEventListener(FARMERS_SYNCED_EVENT, handleSynced);
      window.removeEventListener(USER_CHANGED_EVENT, handleSynced);
    };
  }, [refetch]);

  return { stats, loading, refetch };
}
