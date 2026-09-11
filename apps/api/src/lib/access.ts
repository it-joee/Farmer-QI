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

export function canRegisterOfftakers(actor: Actor): boolean {
  return actor.role === "agent" || actor.role === "team_lead" || actor.role === "admin";
}

export function canRegisterAggregators(actor: Actor): boolean {
  return actor.role === "agent";
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
