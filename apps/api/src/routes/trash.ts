import { Hono } from "hono";
import { requireActor } from "../lib/actor.js";
import { query } from "../db.js";

export const trashRoutes = new Hono();

// Require admin access for all trash routes
trashRoutes.use("*", async (c, next) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;
  if (actorResult.role !== "admin") {
    return c.json({ error: "Forbidden: Admins only" }, 403);
  }
  await next();
});

export type TrashedEntity = {
  type: "farmer" | "aggregator" | "offtaker" | "event";
  id: string;
  name: string;
  deleted_at: string;
};

trashRoutes.get("/", async (c) => {
  const page = parseInt(c.req.query("page") ?? "1", 10) || 1;
  const limit = parseInt(c.req.query("limit") ?? "20", 10) || 20;
  const offset = (page - 1) * limit;

  // Union all soft deleted entities
  const trashQuery = `
    SELECT 'farmer' AS type, id, full_name AS name, deleted_at 
    FROM farmers WHERE deleted_at IS NOT NULL
    UNION ALL
    SELECT 'aggregator' AS type, id, full_name AS name, deleted_at 
    FROM aggregators WHERE deleted_at IS NOT NULL
    UNION ALL
    SELECT 'offtaker' AS type, id, company_name AS name, deleted_at 
    FROM offtakers WHERE deleted_at IS NOT NULL
    UNION ALL
    SELECT 'event' AS type, id, title AS name, deleted_at 
    FROM events WHERE deleted_at IS NOT NULL
  `;

  const countResult = await query(`
    SELECT COUNT(*) FROM (${trashQuery}) as trash_items
  `);
  
  const total = parseInt(countResult.rows[0]?.count ?? "0", 10);
  const totalPages = Math.ceil(total / limit);

  const result = await query(`
    SELECT * FROM (${trashQuery}) as trash_items
    ORDER BY deleted_at DESC
    LIMIT $1 OFFSET $2
  `, [limit, offset]);

  return c.json({
    data: result.rows,
    total,
    page,
    limit,
    totalPages,
  });
});

trashRoutes.post("/restore", async (c) => {
  const body = await c.req.json();
  const { type, id } = body as { type: string; id: string };

  if (!type || !id) {
    return c.json({ error: "Missing type or id" }, 400);
  }

  let tableName = "";
  if (type === "farmer") tableName = "farmers";
  else if (type === "aggregator") tableName = "aggregators";
  else if (type === "offtaker") tableName = "offtakers";
  else if (type === "event") tableName = "events";
  else return c.json({ error: "Invalid type" }, 400);

  const result = await query(`UPDATE ${tableName} SET deleted_at = NULL WHERE id = $1 RETURNING id`, [id]);
  
  if (result.rowCount === 0) {
    return c.json({ error: "Item not found in trash" }, 404);
  }

  return c.json({ ok: true });
});

trashRoutes.delete("/permanent", async (c) => {
  const body = await c.req.json();
  const { type, id } = body as { type: string; id: string };

  if (!type || !id) {
    return c.json({ error: "Missing type or id" }, 400);
  }

  let tableName = "";
  if (type === "farmer") tableName = "farmers";
  else if (type === "aggregator") tableName = "aggregators";
  else if (type === "offtaker") tableName = "offtakers";
  else if (type === "event") tableName = "events";
  else return c.json({ error: "Invalid type" }, 400);

  const result = await query(`DELETE FROM ${tableName} WHERE id = $1 AND deleted_at IS NOT NULL RETURNING id`, [id]);
  
  if (result.rowCount === 0) {
    return c.json({ error: "Item not found in trash" }, 404);
  }

  return c.json({ ok: true });
});

trashRoutes.delete("/empty", async (c) => {
  // Hard delete all items with deleted_at IS NOT NULL
  await query("DELETE FROM farmers WHERE deleted_at IS NOT NULL");
  await query("DELETE FROM aggregators WHERE deleted_at IS NOT NULL");
  await query("DELETE FROM offtakers WHERE deleted_at IS NOT NULL");
  await query("DELETE FROM events WHERE deleted_at IS NOT NULL");
  
  // Note: event_attendees have ON DELETE CASCADE to events, but what if they were soft-deleted individually?
  // We can just permanently delete soft-deleted attendees too.
  await query("DELETE FROM event_attendees WHERE deleted_at IS NOT NULL");

  return c.json({ ok: true });
});
