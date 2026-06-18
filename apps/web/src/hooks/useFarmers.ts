import { useCallback, useEffect, useState } from "react";
import type { Farmer } from "@farmeriq/shared";
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

export function useFarmers() {
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
    apiFetch("/api/farmers")
      .then((r) => r.json())
      .then((data) => setFarmers((data.farmers ?? []).map(normalizeFarmer)))
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
