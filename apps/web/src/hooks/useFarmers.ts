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

function statsCacheKey(userId: string, commodity?: string | null): string {
  return `farmeriq_stats_${userId}_${commodity || "all"}`;
}

function readCachedStats(userId: string, commodity?: string | null): FarmerStats | null {
  try {
    const raw = sessionStorage.getItem(statsCacheKey(userId, commodity));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FarmerStats;
    return parsed && typeof parsed.totalRegistered === "number" ? parsed : null;
  } catch {
    return null;
  }
}

export function useFarmerStats(commodity?: string | null) {
  const user = useAuthUser();
  const [stats, setStats] = useState<FarmerStats>(() =>
    user ? (readCachedStats(user.id, commodity) ?? EMPTY_STATS) : EMPTY_STATS
  );
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    if (!user) {
      setStats(EMPTY_STATS);
      setLoading(false);
      return;
    }

    const cached = readCachedStats(user.id, commodity);
    if (cached) {
      setStats(cached);
    }

    let cancelled = false;
    let retryTimer: number | undefined;
    setLoading(true);
    const params = new URLSearchParams();
    if (commodity && commodity !== "all") {
      params.set("commodity", commodity);
    }
    const qs = params.toString();
    const url = `/api/farmers/stats${qs ? `?${qs}` : ""}`;

    const fetchOnce = async () => {
      const res = await apiFetch(url);
      if (!res.ok) {
        throw new Error(`Stats failed with ${res.status}`);
      }
      return (await res.json()) as FarmerStats;
    };

    fetchOnce()
      .catch(() =>
        new Promise<FarmerStats>((resolve, reject) => {
          if (cancelled) {
            reject(new Error("cancelled"));
            return;
          }
          retryTimer = window.setTimeout(() => {
            fetchOnce().then(resolve, reject);
          }, 1200);
        })
      )
      .then((data) => {
        if (!cancelled && data && typeof data.totalRegistered === "number") {
          setStats(data);
          try {
            sessionStorage.setItem(statsCacheKey(user.id, commodity), JSON.stringify(data));
          } catch {
            /* ignore storage quota errors */
          }
        }
      })
      .catch(() => {
        /* keep existing/cached stats when offline or transient error */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
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
