import { query } from "../db.js";
import type { Actor } from "./actor.js";
import { ensureUsersOperationsSupport } from "./users-schema.js";

export function canResolveConflicts(actor: Actor): boolean {
  return actor.role === "team_lead" || actor.role === "admin";
}

export function canManageUsers(actor: Actor): boolean {
  return actor.role === "admin";
}

export function canRegisterFarmers(actor: Actor): boolean {
  return actor.role === "agent" || actor.role === "team_lead";
}

export function canAccessOperations(actor: Actor): boolean {
  return (
    actor.role === "admin" ||
    actor.role === "operations" ||
    Boolean(actor.can_access_operations)
  );
}

/** Verifies operations access from token first, falling back to DB so role/toggle updates apply immediately. */
export async function hasOperationsAccess(actor: Actor): Promise<boolean> {
  if (canAccessOperations(actor)) return true;
  await ensureUsersOperationsSupport();
  const result = await query<{ role: string; can_access_operations: boolean }>(
    `SELECT role, can_access_operations
     FROM users
     WHERE id = $1 AND is_active = true AND deleted_at IS NULL`,
    [actor.id]
  );
  const row = result.rows[0];
  if (!row) return false;
  return (
    row.role === "admin" ||
    row.role === "operations" ||
    Boolean(row.can_access_operations)
  );
}

export function canAccessOfftakers(actor: Actor): boolean {
  return actor.role === "team_lead" || canAccessOperations(actor);
}

export function canAccessDrivers(actor: Actor): boolean {
  return actor.role === "team_lead" || canAccessOperations(actor);
}

export function canRegisterOfftakers(actor: Actor): boolean {
  return actor.role === "team_lead" || canAccessOperations(actor);
}

export function canAccessReports(actor: Actor): boolean {
  return actor.role === "team_lead" || actor.role === "admin";
}

export function canRegisterAggregators(actor: Actor): boolean {
  return actor.role === "agent" || actor.role === "team_lead";
}

export interface ScopeClause {
  sql: string;
  params: unknown[];
  nextIndex: number;
}

export function farmerScopeClause(_actor: Actor, _alias = "f", startIndex = 1): ScopeClause {
  return { sql: "1=1", params: [], nextIndex: startIndex };
}

export function offtakerScopeClause(user: Actor, tableAlias = "o", actorParamIndex = 1) {
  return aggregatorScopeClause(user, tableAlias, actorParamIndex);
}

export function aggregatorScopeClause(_actor: Actor, _alias = "a", startIndex = 1): ScopeClause {
  return { sql: "1=1", params: [], nextIndex: startIndex };
}

export function eventScopeClause(_actor: Actor, _alias = "e", startIndex = 1): ScopeClause {
  return { sql: "1=1", params: [], nextIndex: startIndex };
}
