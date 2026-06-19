import { useCallback, useEffect, useRef, useState } from "react";
import { FARMERS_SYNCED_EVENT } from "./useFarmers";
import { EVENTS_SYNCED_EVENT } from "../lib/offline/event-sync";
import {
  countAllPending,
  listPendingEvents,
  listPendingFarmers,
} from "../lib/offline/store";
import { syncPendingEvents, syncPendingServerAttendees } from "../lib/offline/event-sync";
import { syncPendingFarmers } from "../lib/offline/sync";
import type { PendingEventRecord, PendingFarmerRecord } from "../lib/offline/types";

export function useOfflineSync(createdBy: string | undefined) {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingFarmers, setPendingFarmers] = useState<PendingFarmerRecord[]>([]);
  const [pendingEvents, setPendingEvents] = useState<PendingEventRecord[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const syncingRef = useRef(false);

  const refreshPending = useCallback(async () => {
    if (!createdBy) {
      setPendingCount(0);
      setPendingFarmers([]);
      setPendingEvents([]);
      return;
    }

    const [farmersResult, eventsResult, countResult] = await Promise.allSettled([
      listPendingFarmers(createdBy),
      listPendingEvents(createdBy),
      countAllPending(createdBy),
    ]);

    const farmers = farmersResult.status === "fulfilled" ? farmersResult.value : [];
    const events = eventsResult.status === "fulfilled" ? eventsResult.value : [];
    const count =
      countResult.status === "fulfilled"
        ? countResult.value
        : farmers.filter((r) => r.status === "pending" || r.status === "failed").length +
          events.filter((r) => r.status === "pending" || r.status === "failed").length;

    setPendingCount(count);
    setPendingFarmers(farmers);
    setPendingEvents(events);
  }, [createdBy]);

  const runSync = useCallback(async () => {
    if (!createdBy || !navigator.onLine || syncingRef.current) return;

    syncingRef.current = true;
    setSyncing(true);
    setLastSyncError(null);

    try {
      const farmerResult = await syncPendingFarmers(createdBy);
      if (farmerResult.synced > 0) {
        window.dispatchEvent(new CustomEvent(FARMERS_SYNCED_EVENT));
      }

      const eventResult = await syncPendingEvents(createdBy);

      let attendeeResult = { synced: 0, failed: 0 };
      try {
        attendeeResult = await syncPendingServerAttendees(createdBy);
      } catch {
        // Server attendee queue is optional — don't block farmer/event sync.
      }

      const totalSynced = farmerResult.synced + eventResult.synced + attendeeResult.synced;
      const totalFailed = farmerResult.failed + eventResult.failed + attendeeResult.failed;

      if (totalSynced > 0) {
        window.dispatchEvent(new CustomEvent(EVENTS_SYNCED_EVENT));
      }
      if (totalFailed > 0) {
        setLastSyncError(`${totalFailed} record${totalFailed === 1 ? "" : "s"} could not sync`);
      }
    } catch (error) {
      setLastSyncError(error instanceof Error ? error.message : "Sync failed");
    } finally {
      syncingRef.current = false;
      setSyncing(false);
      await refreshPending();
    }
  }, [createdBy, refreshPending]);

  useEffect(() => {
    refreshPending();
  }, [refreshPending]);

  useEffect(() => {
    function handleOnline() {
      setOnline(true);
      void runSync();
    }

    function handleOffline() {
      setOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [runSync]);

  useEffect(() => {
    if (!navigator.onLine || !createdBy) return;

    void countAllPending(createdBy).then((count) => {
      if (count > 0) void runSync();
    });
  }, [createdBy, runSync]);

  return {
    online,
    pendingCount,
    pendingFarmers,
    pendingEvents,
    syncing,
    lastSyncError,
    refreshPending,
    runSync,
  };
}
