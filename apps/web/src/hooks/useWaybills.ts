import { useCallback, useEffect, useState } from "react";
import type { PaginatedResponse, Waybill, WaybillSummary } from "@farmeriq/shared";
import { formatWaybillReferenceId } from "@farmeriq/shared";
import { canAccessOperations, USER_CHANGED_EVENT } from "../auth";
import { apiFetch } from "../lib/api-client";
import type { WaybillFilters } from "../lib/waybills";
import { useAuthUser } from "./useAuth";

export function normalizeWaybill(raw: Waybill): Waybill {
  return {
    ...raw,
    reference_id: raw.reference_id || formatWaybillReferenceId(raw.id),
    bag_count: raw.bag_count != null ? Number(raw.bag_count) : null,
    weight_kg: raw.weight_kg != null ? Number(raw.weight_kg) : null,
    received_weight_kg: raw.received_weight_kg != null ? Number(raw.received_weight_kg) : null,
    truck_photo_count: raw.truck_photo_count != null ? Number(raw.truck_photo_count) : 0,
    doc_photo_count: raw.doc_photo_count != null ? Number(raw.doc_photo_count) : 0,
    open_conflict_count: raw.open_conflict_count != null ? Number(raw.open_conflict_count) : 0,
  };
}

const EMPTY_SUMMARY: WaybillSummary = {
  total_waybills: 0,
  in_transit_count: 0,
  delivered_count: 0,
  cancelled_count: 0,
  total_bags: 0,
  total_weight_kg: 0,
  total_weight_tons: 0,
  total_received_weight_kg: 0,
};

interface WaybillsResponse extends PaginatedResponse<Waybill> {
  summary?: WaybillSummary;
  filter_options?: {
    products: string[];
    buyers: string[];
    loading_locations: string[];
  };
}

export function useWaybills(page = 1, limit = 20, filters: WaybillFilters = {}) {
  const user = useAuthUser();
  const [waybills, setWaybills] = useState<Waybill[]>([]);
  const [summary, setSummary] = useState<WaybillSummary>(EMPTY_SUMMARY);
  const [filterOptions, setFilterOptions] = useState({
    products: [] as string[],
    buyers: [] as string[],
    loading_locations: [] as string[],
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    if (!user || !canAccessOperations(user)) {
      setWaybills([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(filters.search && { search: filters.search }),
      ...(filters.product && { product: filters.product }),
      ...(filters.status && { status: filters.status }),
      ...(filters.buyer && { buyer: filters.buyer }),
      ...(filters.date_from && { date_from: filters.date_from }),
      ...(filters.date_to && { date_to: filters.date_to }),
    });

    apiFetch(`/api/waybills?${params.toString()}`)
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data: WaybillsResponse | null) => {
        if (!data) return;
        if (Array.isArray(data.data)) {
          setWaybills(data.data.map(normalizeWaybill));
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
        if (data.filter_options) {
          setFilterOptions(data.filter_options);
        }
      })
      .catch(() => {
        /* keep cached list */
      })
      .finally(() => setLoading(false));
  }, [
    user?.id,
    user?.role,
    user?.can_access_operations,
    refreshKey,
    page,
    limit,
    filters.search,
    filters.product,
    filters.status,
    filters.buyer,
    filters.date_from,
    filters.date_to,
  ]);

  useEffect(() => {
    function handleChanged() {
      refetch();
    }
    window.addEventListener(USER_CHANGED_EVENT, handleChanged);
    return () => window.removeEventListener(USER_CHANGED_EVENT, handleChanged);
  }, [refetch]);

  return { waybills, summary, filterOptions, pagination, loading, refetch };
}

export function useWaybill(waybillId: string) {
  const user = useAuthUser();
  const [waybill, setWaybill] = useState<Waybill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    if (!user || !canAccessOperations(user) || !waybillId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    apiFetch(`/api/waybills/${waybillId}`)
      .then(async (r) => {
        if (!r.ok) {
          throw new Error("Waybill not found");
        }
        return (await r.json()) as { waybill: Waybill };
      })
      .then((data) => {
        setWaybill(normalizeWaybill(data.waybill));
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error("Failed to load waybill"));
        setWaybill(null);
      })
      .finally(() => setLoading(false));
  }, [user?.id, user?.role, user?.can_access_operations, waybillId, refreshKey]);

  return { waybill, loading, error, refetch };
}
