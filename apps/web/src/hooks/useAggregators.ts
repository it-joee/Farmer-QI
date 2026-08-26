import { useCallback, useEffect, useState } from "react";
import type { Aggregator, PaginatedResponse } from "@farmeriq/shared";
import { formatAggregatorReferenceId } from "@farmeriq/shared";
import { apiFetch } from "../lib/api-client";
import { useAuthUser } from "./useAuth";
import { USER_CHANGED_EVENT } from "../auth";
import { AGGREGATORS_SYNCED_EVENT } from "../lib/offline/aggregator-sync";

export function normalizeAggregator(raw: Aggregator): Aggregator {
  return {
    ...raw,
    reference_id: raw.reference_id || formatAggregatorReferenceId(raw.id),
    commodities: raw.commodities ?? [],
  };
}

export function useAggregators(page = 1, limit = 20, search = "", commodity = "") {
  const user = useAuthUser();
  const [aggregators, setAggregators] = useState<Aggregator[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    if (!user) {
      setAggregators([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
      ...(commodity && { commodity }),
    });

    apiFetch(`/api/aggregators?${params.toString()}`)
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data: PaginatedResponse<Aggregator> | { aggregators: Aggregator[] } | null) => {
        if (!data) return;
        if ("data" in data && Array.isArray(data.data)) {
          setAggregators(data.data.map(normalizeAggregator));
          setPagination({
            total: data.total,
            page: data.page,
            limit: data.limit,
            totalPages: data.totalPages,
          });
        } else if ("aggregators" in data && Array.isArray(data.aggregators)) {
          setAggregators(data.aggregators.map(normalizeAggregator));
        }
      })
      .catch(() => {
        /* keep cached list when offline */
      })
      .finally(() => setLoading(false));
  }, [user?.id, user?.role, refreshKey, page, limit, search, commodity]);

  useEffect(() => {
    function handleSynced() {
      refetch();
    }

    window.addEventListener(AGGREGATORS_SYNCED_EVENT, handleSynced);
    window.addEventListener(USER_CHANGED_EVENT, handleSynced);
    return () => {
      window.removeEventListener(AGGREGATORS_SYNCED_EVENT, handleSynced);
      window.removeEventListener(USER_CHANGED_EVENT, handleSynced);
    };
  }, [refetch]);

  return { aggregators, pagination, loading, refetch };
}

export function useAllAggregators() {
  const user = useAuthUser();
  const [aggregators, setAggregators] = useState<Aggregator[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    if (!user) {
      setAggregators([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    apiFetch(`/api/aggregators/all`)
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data: { aggregators: Aggregator[] } | null) => {
        if (!data || !Array.isArray(data.aggregators)) return;
        setAggregators(data.aggregators.map(normalizeAggregator));
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

    window.addEventListener(AGGREGATORS_SYNCED_EVENT, handleSynced);
    window.addEventListener(USER_CHANGED_EVENT, handleSynced);
    return () => {
      window.removeEventListener(AGGREGATORS_SYNCED_EVENT, handleSynced);
      window.removeEventListener(USER_CHANGED_EVENT, handleSynced);
    };
  }, [refetch]);

  return { aggregators, loading, refetch };
}
