import type { User } from "@farmeriq/shared";

export const SKIP_AUTH = false;

export const USER_CHANGED_EVENT = "farmeriq:user-changed";

export function getCurrentUser(): User | null {
  const token = localStorage.getItem("farmeriq_token");
  const raw = localStorage.getItem("farmeriq_user");
  if (!token || !raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem("farmeriq_user");
  localStorage.removeItem("farmeriq_token");
  localStorage.removeItem("farmeriq_dev_user_id");
  window.dispatchEvent(new Event(USER_CHANGED_EVENT));
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

export function canRegisterAggregators(user: User): boolean {
  return user.role === "agent";
}

export function farmersScopeLabel(user: User): string {
  if (user.role === "admin") return "Farmers";
  if (user.role === "team_lead") return "Office farmers";
  return "My farmers";
}

export function aggregatorsScopeLabel(user: User): string {
  if (user.role === "admin") return "Aggregators";
  if (user.role === "team_lead") return "Office aggregators";
  return "My aggregators";
}

export function canRegisterOfftakers(user: User | null | undefined): boolean {
  return user?.role === "team_lead" || user?.role === "admin";
}

export function canAccessOfftakers(user: User | null | undefined): boolean {
  return user?.role === "team_lead" || user?.role === "admin";
}

export function canAccessDrivers(user: User | null | undefined): boolean {
  return user?.role === "team_lead" || user?.role === "admin";
}

export function canRegisterDrivers(user: User | null | undefined): boolean {
  return user?.role === "team_lead" || user?.role === "admin";
}

export function driversScopeLabel(user: User) {
  if (user.role === "admin") return "Drivers";
  if (user.role === "team_lead") return "Office drivers";
  return "Drivers";
}

export function canAccessReports(user: User | null | undefined): boolean {
  return user?.role === "team_lead" || user?.role === "admin";
}

export function offtakersScopeLabel(user: User) {
  if (user.role === "admin") return "Offtakers";
  if (user.role === "team_lead") return "Office offtakers";
  return "Offtakers";
}