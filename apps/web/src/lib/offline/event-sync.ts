import type { CreateEventRequest, EventAttendeeGender } from "@farmeriq/shared";
import { apiFetch } from "../api-client";
import { addEventAttendee } from "../events";
import {
  addPendingEvent,
  getPendingEvent,
  listPendingEvents,
  listPendingServerAttendees,
  removePendingEvent,
  removePendingServerAttendee,
  updatePendingEvent,
  upsertPendingServerAttendee,
} from "./store";
import type {
  PendingEventAttendee,
  PendingEventRecord,
  PendingServerAttendeeAdd,
  SubmitEventAttendeeInput,
  SubmitEventInput,
  SyncSummary,
} from "./types";

export type SubmitResult = "synced" | "queued";

export const EVENTS_SYNCED_EVENT = "farmeriq:events-synced";

class SubmitError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean
  ) {
    super(message);
    this.name = "SubmitError";
  }
}

function isFetchNetworkError(error: unknown): boolean {
  return error instanceof TypeError;
}

function buildPendingEvent(input: SubmitEventInput): PendingEventRecord {
  return {
    localId: crypto.randomUUID(),
    createdBy: input.agentId,
    createdAt: new Date().toISOString(),
    status: "pending",
    title: input.title.trim(),
    description: input.description?.trim() || null,
    event_date: input.event_date,
    location: input.location?.trim() || null,
    community: input.community?.trim() || null,
    district: input.district?.trim() || null,
    mofa_officer: input.mofa_officer?.trim() || null,
    attendees: [],
  };
}

function toCreatePayload(record: PendingEventRecord): CreateEventRequest {
  return {
    title: record.title,
    event_date: record.event_date,
    description: record.description ?? undefined,
    location: record.location ?? undefined,
    community: record.community ?? undefined,
    district: record.district ?? undefined,
    mofa_officer: record.mofa_officer ?? undefined,
  };
}

async function createEventOnServer(record: PendingEventRecord) {
  try {
    const res = await apiFetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...toCreatePayload(record), created_by: record.createdBy }),
    });
    if (!res.ok) {
      throw new SubmitError(
        res.status >= 500 ? "Server error while saving event" : "Could not save event",
        res.status >= 500
      );
    }
    const data = await res.json();
    return data.event;
  } catch (error) {
    if (error instanceof SubmitError) throw error;
    if (isFetchNetworkError(error)) {
      throw new SubmitError("Network unavailable", true);
    }
    throw error;
  }
}

async function syncPendingEventRecord(record: PendingEventRecord): Promise<void> {
  let serverId = record.serverId;

  if (!serverId) {
    const created = await createEventOnServer(record);
    serverId = created.id as string;
  }

  const updatedAttendees: PendingEventAttendee[] = [];

  for (const attendee of record.attendees) {
    if (attendee.serverId) {
      updatedAttendees.push(attendee);
      continue;
    }

    try {
      if (attendee.gender !== "male" && attendee.gender !== "female") {
        updatedAttendees.push(attendee);
        continue;
      }

      const created = await addEventAttendee(
        serverId,
        {
          full_name: attendee.full_name,
          phone: attendee.phone ?? "",
          community: attendee.community ?? "",
          gender: attendee.gender,
          age: attendee.age ?? 1,
        },
        record.createdBy
      );
      updatedAttendees.push({ ...attendee, serverId: created.id });
    } catch (error) {
      if (isFetchNetworkError(error)) {
        throw new SubmitError("Network unavailable during attendee sync", true);
      }
      updatedAttendees.push(attendee);
    }
  }

  if (updatedAttendees.some((a) => !a.serverId)) {
    await updatePendingEvent({
      ...record,
      serverId,
      attendees: updatedAttendees,
      status: "pending",
      lastError: undefined,
    });
    return;
  }

  await removePendingEvent(record.localId);
}

export async function submitEventOnline(input: SubmitEventInput) {
  const record = buildPendingEvent(input);
  return createEventOnServer(record);
}

export async function queueEventSubmission(input: SubmitEventInput): Promise<string> {
  const record = buildPendingEvent(input);
  await addPendingEvent(record);
  return record.localId;
}

export async function submitEvent(
  input: SubmitEventInput
): Promise<{ result: SubmitResult; localId?: string; eventId?: string }> {
  if (!navigator.onLine) {
    const localId = await queueEventSubmission(input);
    return { result: "queued", localId };
  }

  try {
    const event = await submitEventOnline(input);
    return { result: "synced", eventId: event.id };
  } catch (error) {
    if (error instanceof SubmitError && error.retryable) {
      const localId = await queueEventSubmission(input);
      return { result: "queued", localId };
    }
    if (isFetchNetworkError(error)) {
      const localId = await queueEventSubmission(input);
      return { result: "queued", localId };
    }
    throw error;
  }
}

export async function updatePendingEventDetails(
  localId: string,
  input: Omit<SubmitEventInput, "agentId">
): Promise<PendingEventRecord> {
  const record = await getPendingEvent(localId);
  if (!record) throw new Error("Pending event not found");

  const updated: PendingEventRecord = {
    ...record,
    title: input.title.trim(),
    event_date: input.event_date,
    description: input.description?.trim() || null,
    location: input.location?.trim() || null,
    community: input.community?.trim() || null,
    district: input.district?.trim() || null,
    mofa_officer: input.mofa_officer?.trim() || null,
    status: "pending",
    lastError: undefined,
  };
  await updatePendingEvent(updated);
  return updated;
}

export async function addPendingEventAttendee(
  localId: string,
  input: SubmitEventAttendeeInput
): Promise<PendingEventAttendee> {
  const record = await getPendingEvent(localId);
  if (!record) throw new Error("Pending event not found");

  const attendee: PendingEventAttendee = {
    localId: crypto.randomUUID(),
    full_name: input.full_name.trim(),
    phone: input.phone.trim(),
    community: input.community.trim(),
    gender: input.gender,
    age: input.age,
  };

  const updated: PendingEventRecord = {
    ...record,
    attendees: [...record.attendees, attendee],
    status: "pending",
    lastError: undefined,
  };
  await updatePendingEvent(updated);
  return attendee;
}

export async function removePendingEventAttendee(localId: string, attendeeLocalId: string): Promise<void> {
  const record = await getPendingEvent(localId);
  if (!record) throw new Error("Pending event not found");

  await updatePendingEvent({
    ...record,
    attendees: record.attendees.filter((a) => a.localId !== attendeeLocalId),
    status: "pending",
    lastError: undefined,
  });
}

export async function addServerEventAttendeeWithOffline(
  eventId: string,
  input: SubmitEventAttendeeInput,
  markedBy: string
): Promise<{ attendee?: PendingEventAttendee; queued: boolean }> {
  const payload = {
    full_name: input.full_name.trim(),
    phone: input.phone.trim(),
    community: input.community.trim(),
    gender: input.gender,
    age: input.age,
  };

  if (!navigator.onLine) {
    const queued: PendingServerAttendeeAdd = {
      id: crypto.randomUUID(),
      eventId,
      ...payload,
      markedBy,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    await upsertPendingServerAttendee(queued);
    return {
      attendee: {
        localId: queued.id,
        full_name: payload.full_name,
        phone: payload.phone,
        community: payload.community,
        gender: payload.gender,
        age: payload.age,
      },
      queued: true,
    };
  }

  try {
    const created = await addEventAttendee(eventId, {
      full_name: payload.full_name,
      phone: payload.phone,
      community: payload.community,
      gender: payload.gender as EventAttendeeGender,
      age: payload.age,
    }, markedBy);
    return {
      attendee: {
        localId: created.id,
        serverId: created.id,
        full_name: created.full_name,
        phone: created.phone,
        community: created.community,
        gender: created.gender,
        age: created.age,
      },
      queued: false,
    };
  } catch (error) {
    if (isFetchNetworkError(error)) {
      const queued: PendingServerAttendeeAdd = {
        id: crypto.randomUUID(),
        eventId,
        ...payload,
        markedBy,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      await upsertPendingServerAttendee(queued);
      return {
        attendee: {
          localId: queued.id,
          full_name: payload.full_name,
          phone: payload.phone,
          community: payload.community,
          gender: payload.gender,
          age: payload.age,
        },
        queued: true,
      };
    }
    throw error;
  }
}

export async function syncPendingEvents(createdBy: string): Promise<SyncSummary> {
  if (!navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const pending = await listPendingEvents(createdBy);
  let synced = 0;
  let failed = 0;

  for (const record of pending) {
    if (record.status === "syncing") continue;

    const syncing: PendingEventRecord = { ...record, status: "syncing", lastError: undefined };
    await updatePendingEvent(syncing);

    try {
      await syncPendingEventRecord(syncing);
      if (!(await getPendingEvent(syncing.localId))) {
        synced += 1;
      }
    } catch (error) {
      const message =
        error instanceof SubmitError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Sync failed";
      await updatePendingEvent({
        ...syncing,
        status: "failed",
        lastError: message,
      });
      failed += 1;
    }
  }

  return { synced, failed };
}

export async function syncPendingServerAttendees(createdBy: string): Promise<SyncSummary> {
  if (!navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const queue = await listPendingServerAttendees(createdBy);
  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    if (item.status === "syncing") continue;

    const syncing: PendingServerAttendeeAdd = { ...item, status: "syncing", lastError: undefined };
    await upsertPendingServerAttendee(syncing);

    try {
      if (item.gender !== "male" && item.gender !== "female") {
        await upsertPendingServerAttendee({
          ...syncing,
          status: "failed",
          lastError: "Gender is required",
        });
        failed += 1;
        continue;
      }

      await addEventAttendee(item.eventId, {
        full_name: item.full_name,
        phone: item.phone ?? "",
        community: item.community ?? "",
        gender: item.gender,
        age: item.age ?? 1,
      }, item.markedBy);
      await removePendingServerAttendee(item.id);
      synced += 1;
    } catch (error) {
      const message =
        error instanceof SubmitError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Sync failed";
      await upsertPendingServerAttendee({
        ...syncing,
        status: "failed",
        lastError: message,
      });
      failed += 1;
    }
  }

  return { synced, failed };
}

export { getPendingEvent, listPendingEvents } from "./store";
