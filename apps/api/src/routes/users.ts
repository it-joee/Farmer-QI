import { Hono } from "hono";
import { CreateUserRequest, UpdateUserRequest } from "@farmeriq/shared";
import { requireActor } from "../lib/actor.js";
import { canManageUsers } from "../lib/access.js";
import { query } from "../db.js";

export const userRoutes = new Hono();

const PLACEHOLDER_PASSWORD_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$REPLACE_ME$REPLACE_ME";

userRoutes.get("/", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;
  const actor = actorResult;

  if (!canManageUsers(actor)) {
    return c.json({ error: "Only admins can manage users" }, 403);
  }

  const result = await query(
    `SELECT u.id, u.email, u.full_name, u.role, u.office_id, u.is_active, u.created_at,
            o.name AS office_name
     FROM users u
     LEFT JOIN offices o ON o.id = u.office_id
     ORDER BY u.created_at DESC`
  );

  return c.json({ users: result.rows });
});

userRoutes.post("/", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;
  const actor = actorResult;

  if (!canManageUsers(actor)) {
    return c.json({ error: "Only admins can manage users" }, 403);
  }

  const body = await c.req.json();
  const parsed = CreateUserRequest.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const data = parsed.data;
  const role = data.role;

  if (role !== "admin" && !data.office_id) {
    return c.json({ error: "Agents and team leads require an office" }, 400);
  }

  try {
    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, role, office_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, full_name, role, office_id, is_active, created_at`,
      [
        data.email.toLowerCase(),
        PLACEHOLDER_PASSWORD_HASH,
        data.full_name,
        role,
        role === "admin" ? data.office_id ?? null : data.office_id ?? null,
      ]
    );

    const user = result.rows[0];

    await query(
      `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes)
       VALUES ($1, 'create', 'user', $2, $3)`,
      [actor.id, user.id, JSON.stringify(user)]
    );

    return c.json({ user }, 201);
  } catch (error) {
    if (error instanceof Error && error.message.includes("unique")) {
      return c.json({ error: "Email is already registered" }, 409);
    }
    throw error;
  }
});

userRoutes.patch("/:id", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;
  const actor = actorResult;

  if (!canManageUsers(actor)) {
    return c.json({ error: "Only admins can manage users" }, 403);
  }

  const userId = c.req.param("id");
  const body = await c.req.json();
  const parsed = UpdateUserRequest.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const existing = await query("SELECT * FROM users WHERE id = $1", [userId]);
  if (!existing.rowCount) {
    return c.json({ error: "User not found" }, 404);
  }

  const data = parsed.data;
  const current = existing.rows[0];
  const nextRole = data.role ?? current.role;
  const nextOfficeId =
    data.office_id !== undefined ? data.office_id : current.office_id;

  if (nextRole !== "admin" && !nextOfficeId) {
    return c.json({ error: "Agents and team leads require an office" }, 400);
  }

  const result = await query(
    `UPDATE users SET
      full_name = COALESCE($2, full_name),
      role = COALESCE($3, role),
      office_id = $4,
      is_active = COALESCE($5, is_active),
      updated_at = now()
     WHERE id = $1
     RETURNING id, email, full_name, role, office_id, is_active, created_at`,
    [
      userId,
      data.full_name ?? null,
      data.role ?? null,
      nextOfficeId,
      data.is_active ?? null,
    ]
  );

  const user = result.rows[0];

  await query(
    `INSERT INTO audit_log (actor_id, action, entity_type, entity_id, changes)
     VALUES ($1, 'update', 'user', $2, $3)`,
    [actor.id, userId, JSON.stringify(user)]
  );

  return c.json({ user });
});

userRoutes.get("/offices", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;
  const actor = actorResult;

  if (!canManageUsers(actor)) {
    return c.json({ error: "Only admins can manage users" }, 403);
  }

  const result = await query(`SELECT id, name, region FROM offices ORDER BY name`);
  return c.json({ offices: result.rows });
});
