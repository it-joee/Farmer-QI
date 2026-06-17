import type {
  CreateEventAttendeeRequest,
  CreateEventRequest,
  EventAttendee,
  EventDetail,
  EventRecord,
  UpdateEventRequest,
} from "@farmeriq/shared";
import { apiFetch } from "./api-client";

export function isEventUpcoming(eventDate: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return eventDate.slice(0, 10) >= today;
}

export function formatEventMeta(event: {
  location?: string | null;
  community?: string | null;
  district?: string | null;
  mofa_officer?: string | null;
}): string {
  return [
    event.community,
    event.district,
    event.location,
    event.mofa_officer ? `MoFA: ${event.mofa_officer}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export async function fetchEvents(): Promise<EventRecord[]> {
  const res = await apiFetch("/api/events");
  if (!res.ok) throw new Error("Failed to load events");
  const data = await res.json();
  return data.events ?? [];
}

export async function fetchEvent(eventId: string): Promise<EventDetail> {
  const res = await apiFetch(`/api/events/${eventId}`);
  if (!res.ok) throw new Error("Failed to load event");
  const data = await res.json();
  return data.event;
}

export async function createEvent(payload: CreateEventRequest, createdBy: string): Promise<EventRecord> {
  const res = await apiFetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, created_by: createdBy }),
  });
  if (!res.ok) throw new Error("Failed to create event");
  const data = await res.json();
  return data.event;
}

export async function updateEvent(
  eventId: string,
  payload: UpdateEventRequest,
  updatedBy: string
): Promise<EventRecord> {
  const res = await apiFetch(`/api/events/${eventId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, updated_by: updatedBy }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to update event");
  }
  const data = await res.json();
  return data.event;
}

export async function addEventAttendee(
  eventId: string,
  payload: CreateEventAttendeeRequest,
  markedBy: string
): Promise<EventAttendee> {
  const res = await apiFetch(`/api/events/${eventId}/attendees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, marked_by: markedBy }),
  });
  if (!res.ok) throw new Error("Failed to add attendee");
  const data = await res.json();
  return data.attendee;
}

export async function removeEventAttendee(
  eventId: string,
  attendeeId: string,
  deletedBy: string
): Promise<number> {
  const res = await apiFetch(`/api/events/${eventId}/attendees/${attendeeId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deleted_by: deletedBy }),
  });
  if (!res.ok) throw new Error("Failed to remove attendee");
  const data = await res.json();
  return data.attendance_count as number;
}

export function formatEventDate(date: string): string {
  const parsed = new Date(`${date.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
