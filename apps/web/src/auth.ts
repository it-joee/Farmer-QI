import type { User, UserRole } from "@farmeriq/shared";

/** Set VITE_SKIP_AUTH=true in .env.local to browse the UI without logging in. */
export const SKIP_AUTH = import.meta.env.VITE_SKIP_AUTH === "true";

export const DEV_OFFICE_ID = "00000000-0000-0000-0000-000000000001";

export const DEMO_USERS: User[] = [
  {
    id: "00000000-0000-0000-0000-000000000010",
    email: "agent@farmeriq.local",
    full_name: "Pilot Agent",
    role: "agent",
    office_id: DEV_OFFICE_ID,
  },
  {
    id: "00000000-0000-0000-0000-000000000011",
    email: "lead@farmeriq.local",
    full_name: "Pilot Team Lead",
    role: "team_lead",
    office_id: DEV_OFFICE_ID,
  },
  {
    id: "00000000-0000-0000-0000-000000000012",
    email: "admin@farmeriq.local",
    full_name: "System Admin",
    role: "admin",
    office_id: null,
  },
];

const DEV_USER_KEY = "farmeriq_dev_user_id";

export const USER_CHANGED_EVENT = "farmeriq:user-changed";

export function getDemoUserByRole(role: UserRole): User {
  return DEMO_USERS.find((user) => user.role === role) ?? DEMO_USERS[0];
}

export function getCurrentUser(): User | null {
  if (SKIP_AUTH) {
    const savedId = localStorage.getItem(DEV_USER_KEY);
    return DEMO_USERS.find((user) => user.id === savedId) ?? DEMO_USERS[0];
  }

  const raw = localStorage.getItem("farmeriq_user");
  return raw ? JSON.parse(raw) : null;
}

export function setDevUser(userId: string): void {
  if (!SKIP_AUTH) return;
  localStorage.setItem(DEV_USER_KEY, userId);
  window.dispatchEvent(new Event(USER_CHANGED_EVENT));
}

export function clearSession() {
  if (!SKIP_AUTH) {
    localStorage.removeItem("farmeriq_user");
  }
}

export function canResolveConflicts(user: User): boolean {
  return user.role === "team_lead" || user.role === "admin";
}

export function canManageUsers(user: User): boolean {
  return user.role === "admin";
}

export function canRegisterFarmers(user: User): boolean {
  return user.role === "agent";
}

export function farmersScopeLabel(user: User): string {
  if (user.role === "admin") return "All farmers";
  if (user.role === "team_lead") return "Office farmers";
  return "Your farmers";
}
