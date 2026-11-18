import { apiFetch } from "./api-client";

export interface AppNotification {
  id: string;
  category: "user" | "conflict" | "event" | "sync";
  title: string;
  message: string;
  created_at: string;
  link?: string;
}

const READ_STORAGE_PREFIX = "farmeriq_read_notifications_";
const MAX_STORED_READ_IDS = 100;

export async function fetchNotifications(): Promise<AppNotification[]> {
  const res = await apiFetch("/api/notifications");
  if (!res.ok) {
    throw new Error("Failed to load notifications");
  }
  const data = (await res.json()) as { notifications?: AppNotification[] };
  return data.notifications ?? [];
}

export function getReadNotificationIds(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`${READ_STORAGE_PREFIX}${userId}`);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((x) => typeof x === "string")) : new Set();
  } catch {
    return new Set();
  }
}

export function saveReadNotificationIds(userId: string, ids: Set<string>): void {
  try {
    const list = [...ids].slice(-MAX_STORED_READ_IDS);
    localStorage.setItem(`${READ_STORAGE_PREFIX}${userId}`, JSON.stringify(list));
  } catch {
    /* ignore storage quota errors */
  }
}

export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
