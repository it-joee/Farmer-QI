import { Hono } from "hono";
import { ResolveConflictRequest } from "@farmeriq/shared";
import { parseActor, requireActor } from "../lib/actor.js";
import { canResolveConflicts, farmerScopeClause } from "../lib/access.js";
import {
  farmerIdForConflict,
  getConflictFlag,
  resolveConflictFlag,
} from "../lib/conflicts.js";
import { query } from "../db.js";

export const conflictRoutes = new Hono();

conflictRoutes.post("/:id/resolve", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;
  const actor = actorResult;

  if (!canResolveConflicts(actor)) {
    return c.json({ error: "Only team leads and admins can resolve conflicts" }, 403);
  }

  const body = await c.req.json();
  const parsed = ResolveConflictRequest.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const conflictId = c.req.param("id");
  const flag = await getConflictFlag(conflictId);
  if (!flag) {
    return c.json({ error: "Conflict not found" }, 404);
  }

  if (flag.status !== "open") {
    return c.json({ error: "Conflict is already closed" }, 409);
  }

  const farmerId = await farmerIdForConflict(flag as { entity_type: string; entity_id: string });
  if (!farmerId) {
    return c.json({ error: "Conflict is not linked to a farmer" }, 400);
  }

  const scope = farmerScopeClause(actor, "f", 2);
  const access = await query(
    `SELECT f.id FROM farmers f WHERE f.id = $1 AND ${scope.sql}`,
    [farmerId, ...scope.params]
  );

  if (!access.rowCount) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const resolvedBy = parsed.data.resolved_by ?? actor.id;
  const updated = await resolveConflictFlag({
    conflictId,
    status: parsed.data.status,
    resolvedBy,
    reason: parsed.data.reason ?? null,
  });

  if (!updated) {
    return c.json({ error: "Could not resolve conflict" }, 409);
  }

  await query(
    `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes, reason)
     VALUES ($1, 'resolve_conflict', 'conflict_flag', $2, $3, $4)`,
    [
      resolvedBy,
      conflictId,
      JSON.stringify({ status: parsed.data.status, farmer_id: farmerId }),
      parsed.data.reason ?? null,
    ]
  );

  return c.json({ conflict: updated });
});
