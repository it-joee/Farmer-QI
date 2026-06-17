import type { Actor } from "./actor.js";

export function canResolveConflicts(actor: Actor): boolean {
  return actor.role === "team_lead" || actor.role === "admin";
}

export function canManageUsers(actor: Actor): boolean {
  return actor.role === "admin";
}

export function canRegisterFarmers(actor: Actor): boolean {
  return actor.role === "agent";
}

export interface ScopeClause {
  sql: string;
  params: unknown[];
  nextIndex: number;
}

export function farmerScopeClause(actor: Actor, alias = "f", startIndex = 1): ScopeClause {
  if (actor.role === "admin") {
    return { sql: "1=1", params: [], nextIndex: startIndex };
  }

  if (actor.role === "team_lead") {
    if (!actor.office_id) {
      return { sql: "1=0", params: [], nextIndex: startIndex };
    }
    return {
      sql: `${alias}.office_id = $${startIndex}`,
      params: [actor.office_id],
      nextIndex: startIndex + 1,
    };
  }

  return {
    sql: `${alias}.created_by = $${startIndex}`,
    params: [actor.id],
    nextIndex: startIndex + 1,
  };
}

export function eventScopeClause(actor: Actor, alias = "e", startIndex = 1): ScopeClause {
  if (actor.role === "admin") {
    return { sql: "1=1", params: [], nextIndex: startIndex };
  }

  if (actor.role === "team_lead") {
    if (!actor.office_id) {
      return { sql: "1=0", params: [], nextIndex: startIndex };
    }
    return {
      sql: `${alias}.office_id = $${startIndex}`,
      params: [actor.office_id],
      nextIndex: startIndex + 1,
    };
  }

  return {
    sql: `${alias}.created_by = $${startIndex}`,
    params: [actor.id],
    nextIndex: startIndex + 1,
  };
}
