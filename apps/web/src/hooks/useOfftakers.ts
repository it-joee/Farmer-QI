import { useCallback, useEffect, useState } from "react";
import type { Offtaker, PaginatedResponse } from "@farmeriq/shared";
import { formatOfftakerReferenceId } from "@farmeriq/shared";
import { apiFetch } from "../lib/api-client";
import { useAuthUser } from "./useAuth";
import { USER_CHANGED_EVENT } from "../auth";
import { OFFTAKERS_SYNCED_EVENT } from "../lib/offline/offtaker-sync";

export function normalizeOfftaker(raw: Offtaker): Offtaker {
  return {
    ...raw,
    reference_id: raw.reference_id || formatOfftakerReferenceId(raw.id),
    target_products: Array.isArray(raw.target_products) ? raw.target_products : [],
  };
}

export function useOfftakers(page = 1, limit = 20, search = "", commodity = "") {
  const user = useAuthUser();
  const [offtakers, setOfftakers] = useState<Offtaker[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    if (!user) {
      setOfftakers([]);
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

    apiFetch(`/api/offtakers?${params.toString()}`)
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data: PaginatedResponse<Offtaker> | { offtakers: Offtaker[] } | null) => {
        if (!data) return;
        if ("data" in data && Array.isArray(data.data)) {
          setOfftakers(data.data.map(normalizeOfftaker));
          setPagination({
            total: data.total,
            page: data.page,
            limit: data.limit,
            totalPages: data.totalPages,
          });
        } else if ("offtakers" in data && Array.isArray(data.offtakers)) {
          setOfftakers(data.offtakers.map(normalizeOfftaker));
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

    window.addEventListener(OFFTAKERS_SYNCED_EVENT, handleSynced);
    window.addEventListener(USER_CHANGED_EVENT, handleSynced);
    return () => {
      window.removeEventListener(OFFTAKERS_SYNCED_EVENT, handleSynced);
      window.removeEventListener(USER_CHANGED_EVENT, handleSynced);
    };
  }, [refetch]);

  return { offtakers, pagination, loading, refetch };
}

export function useAllOfftakers() {
  const user = useAuthUser();
  const [offtakers, setOfftakers] = useState<Offtaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    if (!user) {
      setOfftakers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    apiFetch(`/api/offtakers/all`)
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data: { offtakers: Offtaker[] } | null) => {
        if (!data || !Array.isArray(data.offtakers)) return;
        setOfftakers(data.offtakers.map(normalizeOfftaker));
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

    window.addEventListener(OFFTAKERS_SYNCED_EVENT, handleSynced);
    window.addEventListener(USER_CHANGED_EVENT, handleSynced);
    return () => {
      window.removeEventListener(OFFTAKERS_SYNCED_EVENT, handleSynced);
      window.removeEventListener(USER_CHANGED_EVENT, handleSynced);
    };
  }, [refetch]);

  return { offtakers, loading, refetch };
}

export function useOfftaker(id: string) {
  const user = useAuthUser();
  const [offtaker, setOfftaker] = useState<Offtaker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    if (!user || !id) {
      setOfftaker(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    apiFetch(`/api/offtakers/${id}`)
      .then((r) => {
        if (!r.ok) {
          if (r.status === 404) throw new Error("Offtaker not found");
          throw new Error("Could not load offtaker");
        }
        return r.json();
      })
      .then((data: { offtaker: Offtaker } | null) => {
        if (!data || !data.offtaker) return;
        setOfftaker(normalizeOfftaker(data.offtaker));
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => setLoading(false));
  }, [id, user?.id, user?.role, refreshKey]);

  useEffect(() => {
    function handleSynced() {
      refetch();
    }

    window.addEventListener(OFFTAKERS_SYNCED_EVENT, handleSynced);
    window.addEventListener(USER_CHANGED_EVENT, handleSynced);
    return () => {
      window.removeEventListener(OFFTAKERS_SYNCED_EVENT, handleSynced);
      window.removeEventListener(USER_CHANGED_EVENT, handleSynced);
    };
  }, [refetch]);

  return { offtaker, loading, error, refetch };
}
