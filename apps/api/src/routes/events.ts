import { Hono } from "hono";
import {
  CreateEventAttendeeRequest,
  CreateEventRequest,
  UpdateEventRequest,
} from "@farmeriq/shared";
import { SKIP_AUTH } from "../config.js";
import { requireActor } from "../lib/actor.js";
import { canRegisterFarmers, eventScopeClause } from "../lib/access.js";
import { query } from "../db.js";

export const eventRoutes = new Hono();

const eventListSelect = `
  SELECT e.*,
    (SELECT COUNT(*)::int FROM event_attendees ea WHERE ea.event_id = e.id) AS attendance_count
  FROM events e
`;

async function assertEventInScope(eventId: string, actor: import("../lib/actor.js").Actor) {
  const scope = eventScopeClause(actor, "e", 2);
  const result = await query(
    `SELECT e.id FROM events e WHERE e.id = $1 AND ${scope.sql}`,
    [eventId, ...scope.params]
  );
  return (result.rowCount ?? 0) > 0;
}

eventRoutes.get("/", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;

  const scope = eventScopeClause(actorResult, "e", 1);
  const result = await query(
    `${eventListSelect} WHERE ${scope.sql} ORDER BY e.event_date DESC, e.created_at DESC`,
    scope.params
  );

  return c.json({ events: result.rows });
});

eventRoutes.post("/", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;
  const actor = actorResult;

  if (!canRegisterFarmers(actor)) {
    return c.json({ error: "Only field agents can create events" }, 403);
  }

  const body = await c.req.json();
  const parsed = CreateEventRequest.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const createdBy = SKIP_AUTH ? actor.id : (body as { created_by?: string }).created_by;
  if (!createdBy) {
    return c.json({ error: "Authentication required" }, 401);
  }

  const officeId = actor.office_id;

  const result = await query(
    `INSERT INTO events (title, description, event_date, location, community, district, mofa_officer, created_by, office_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      parsed.data.title.trim(),
      parsed.data.description?.trim() || null,
      parsed.data.event_date,
      parsed.data.location?.trim() || null,
      parsed.data.community?.trim() || null,
      parsed.data.district?.trim() || null,
      parsed.data.mofa_officer?.trim() || null,
      createdBy,
      officeId,
    ]
  );

  const event = result.rows[0];

  await query(
    `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes)
     VALUES ($1, 'create', 'event', $2, $3)`,
    [createdBy, event.id, JSON.stringify(event)]
  );

  return c.json({ event: { ...event, attendance_count: 0 } }, 201);
});

eventRoutes.get("/:id", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;

  const id = c.req.param("id");
  if (!(await assertEventInScope(id, actorResult))) {
    return c.json({ error: "Event not found" }, 404);
  }

  const eventResult = await query(`${eventListSelect} WHERE e.id = $1`, [id]);

  const attendeesResult = await query(
    `SELECT * FROM event_attendees WHERE event_id = $1 ORDER BY marked_at ASC`,
    [id]
  );

  return c.json({
    event: {
      ...eventResult.rows[0],
      attendees: attendeesResult.rows,
    },
  });
});

eventRoutes.put("/:id", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;

  const id = c.req.param("id");
  if (!(await assertEventInScope(id, actorResult))) {
    return c.json({ error: "Event not found" }, 404);
  }

  const existingResult = await query(
    "SELECT event_date FROM events WHERE id = $1",
    [id]
  );
  if (existingResult.rows.length === 0) {
    return c.json({ error: "Event not found" }, 404);
  }

  const existingDate = existingResult.rows[0].event_date as Date | string;
  const existingDateStr =
    existingDate instanceof Date
      ? existingDate.toISOString().slice(0, 10)
      : String(existingDate).slice(0, 10);
  const todayStr = new Date().toISOString().slice(0, 10);
  if (existingDateStr < todayStr) {
    return c.json({ error: "Past events cannot be edited" }, 403);
  }

  const body = await c.req.json();
  const parsed = UpdateEventRequest.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const updatedBy = SKIP_AUTH ? actorResult.id : (body as { updated_by?: string }).updated_by;
  if (!updatedBy) {
    return c.json({ error: "Authentication required" }, 401);
  }

  const result = await query(
    `UPDATE events
     SET title = $1,
         description = $2,
         event_date = $3,
         location = $4,
         community = $5,
         district = $6,
         mofa_officer = $7,
         updated_at = now()
     WHERE id = $8
     RETURNING *`,
    [
      parsed.data.title.trim(),
      parsed.data.description?.trim() || null,
      parsed.data.event_date,
      parsed.data.location?.trim() || null,
      parsed.data.community?.trim() || null,
      parsed.data.district?.trim() || null,
      parsed.data.mofa_officer?.trim() || null,
      id,
    ]
  );

  const event = result.rows[0];

  await query(
    `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes)
     VALUES ($1, 'update', 'event', $2, $3)`,
    [updatedBy, event.id, JSON.stringify(event)]
  );

  const countResult = await query(
    "SELECT COUNT(*)::int AS attendance_count FROM event_attendees WHERE event_id = $1",
    [id]
  );

  return c.json({
    event: { ...event, attendance_count: countResult.rows[0].attendance_count },
  });
});

eventRoutes.post("/:id/attendees", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;

  const eventId = c.req.param("id");
  if (!(await assertEventInScope(eventId, actorResult))) {
    return c.json({ error: "Event not found" }, 404);
  }

  const body = await c.req.json();
  const parsed = CreateEventAttendeeRequest.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const markedBy = SKIP_AUTH ? actorResult.id : (body as { marked_by?: string }).marked_by;
  if (!markedBy) {
    return c.json({ error: "Authentication required" }, 401);
  }

  const result = await query(
    `INSERT INTO event_attendees (event_id, full_name, phone, community, gender, age, marked_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      eventId,
      parsed.data.full_name.trim(),
      parsed.data.phone.trim(),
      parsed.data.community.trim(),
      parsed.data.gender,
      parsed.data.age,
      markedBy,
    ]
  );

  const countResult = await query(
    "SELECT COUNT(*)::int AS attendance_count FROM event_attendees WHERE event_id = $1",
    [eventId]
  );

  return c.json(
    {
      attendee: result.rows[0],
      attendance_count: countResult.rows[0].attendance_count,
    },
    201
  );
});

eventRoutes.delete("/:id/attendees/:attendeeId", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;

  const eventId = c.req.param("id");
  if (!(await assertEventInScope(eventId, actorResult))) {
    return c.json({ error: "Event not found" }, 404);
  }

  const attendeeId = c.req.param("attendeeId");

  const result = await query(
    "DELETE FROM event_attendees WHERE id = $1 AND event_id = $2 RETURNING id",
    [attendeeId, eventId]
  );

  if (result.rows.length === 0) {
    return c.json({ error: "Attendee not found" }, 404);
  }

  const countResult = await query(
    "SELECT COUNT(*)::int AS attendance_count FROM event_attendees WHERE event_id = $1",
    [eventId]
  );

  return c.json({ attendance_count: countResult.rows[0].attendance_count });
});

eventRoutes.delete("/:id", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;

  const id = c.req.param("id");
  if (!(await assertEventInScope(id, actorResult))) {
    return c.json({ error: "Event not found" }, 404);
  }

  const body = await c.req.json().catch(() => ({}));
  const deletedBy = SKIP_AUTH ? actorResult.id : (body as { deleted_by?: string }).deleted_by;

  if (!deletedBy) {
    return c.json({ error: "Authentication required" }, 401);
  }

  await query("DELETE FROM events WHERE id = $1 RETURNING id", [id]);

  await query(
    `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes)
     VALUES ($1, 'delete', 'event', $2, $3)`,
    [deletedBy, id, JSON.stringify({ id })]
  );

  return c.json({ ok: true });
});
