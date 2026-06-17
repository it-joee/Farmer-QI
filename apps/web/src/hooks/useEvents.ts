import { useCallback, useEffect, useState } from "react";
import type { EventRecord } from "@farmeriq/shared";
import { getCurrentUser, USER_CHANGED_EVENT } from "../auth";
import { EVENTS_SYNCED_EVENT } from "../lib/offline/event-sync";
import { listPendingEvents } from "../lib/offline/store";
import { fetchEvents } from "../lib/events";

export function useEvents() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refetch = useCallback(async () => {
    const user = getCurrentUser();
    if (!user) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await fetchEvents();
      setEvents(data);
    } catch {
      setError("Could not load events from server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    function handleSynced() {
      void refetch();
    }

    window.addEventListener(EVENTS_SYNCED_EVENT, handleSynced);
    window.addEventListener(USER_CHANGED_EVENT, handleSynced);
    return () => {
      window.removeEventListener(EVENTS_SYNCED_EVENT, handleSynced);
      window.removeEventListener(USER_CHANGED_EVENT, handleSynced);
    };
  }, [refetch]);
  return { events, loading, error, refetch };
}

export function usePendingEventsList() {
  const [pendingEvents, setPendingEvents] = useState<Awaited<ReturnType<typeof listPendingEvents>>>([]);

  const refresh = useCallback(async () => {
    const user = getCurrentUser();
    if (!user) {
      setPendingEvents([]);
      return;
    }
    setPendingEvents(await listPendingEvents(user.id));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    function handleSynced() {
      void refresh();
    }

    window.addEventListener(EVENTS_SYNCED_EVENT, handleSynced);
    return () => window.removeEventListener(EVENTS_SYNCED_EVENT, handleSynced);
  }, [refresh]);

  return { pendingEvents, refreshPendingEvents: refresh };
}
