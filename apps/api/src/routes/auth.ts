import { Hono } from "hono";
import { LoginRequest } from "@farmeriq/shared";
import { query } from "../db.js";
import * as argon2 from "argon2";
import jwt from "jsonwebtoken";
import { requireActor } from "../lib/actor.js";
import { z } from "zod";

export const authRoutes = new Hono();

authRoutes.post("/login", async (c) => {
  const body = await c.req.json();
  const parsed = LoginRequest.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid email or password format" }, 400);
  }

  const cleanEmail = parsed.data.email.trim().toLowerCase();

  if (!cleanEmail.endsWith("@jniagri.ag") && !cleanEmail.endsWith("@farmeriq.local")) {
    return c.json({ error: "Only @jniagri.ag accounts are allowed" }, 403);
  }

  const result = await query<{
    id: string;
    email: string;
    full_name: string;
    role: string;
    office_id: string | null;
    password_hash: string;
    must_set_password: boolean;
  }>("SELECT id, email, full_name, role, office_id, password_hash, must_set_password FROM users WHERE LOWER(email) = $1 AND is_active = true", [
    cleanEmail,
  ]);

  if (result.rowCount === 0) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const user = result.rows[0];

  const validPassword = await argon2.verify(user.password_hash, parsed.data.password);
  if (!validPassword) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  // Block login if account has not been activated via invite link
  if (user.must_set_password) {
    return c.json({ error: "You must set your password using the invite link sent to you before you can log in." }, 403);
  }

  const secret = process.env.JWT_SECRET || "fallback-secret";
  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
      office_id: user.office_id,
    },
    secret,
    { expiresIn: "14d" }
  );

  return c.json({
    message: "Login successful",
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      office_id: user.office_id,
    },
  });
});

/** POST /auth/set-password — validates invite token, sets the user's password */
authRoutes.post("/set-password", async (c) => {
  const body = await c.req.json();
  const parsed = z.object({
    token: z.string().min(1),
    password: z.string().min(8),
  }).safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Token and a password of at least 8 characters are required." }, 400);
  }

  const { token, password } = parsed.data;

  const tokenResult = await query<{
    id: string;
    user_id: string;
    expires_at: string;
    used_at: string | null;
  }>(
    `SELECT id, user_id, expires_at, used_at FROM password_reset_tokens
     WHERE token = $1`,
    [token]
  );

  if (tokenResult.rowCount === 0) {
    return c.json({ error: "Invalid or expired link." }, 400);
  }

  const row = tokenResult.rows[0];

  if (row.used_at) {
    return c.json({ error: "This link has already been used." }, 400);
  }

  if (new Date(row.expires_at) < new Date()) {
    return c.json({ error: "This link has expired. Ask your admin to resend the invite." }, 400);
  }

  const hash = await argon2.hash(password);

  await query(
    `UPDATE users SET password_hash = $1, must_set_password = false, updated_at = now() WHERE id = $2`,
    [hash, row.user_id]
  );

  await query(
    `UPDATE password_reset_tokens SET used_at = now() WHERE id = $1`,
    [row.id]
  );

  return c.json({ ok: true, message: "Password set successfully. You can now log in." });
});

/** POST /auth/change-password — for logged-in users to change their own password */
authRoutes.post("/change-password", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;
  const actor = actorResult;

  const body = await c.req.json();
  const parsed = z.object({
    current_password: z.string().min(1),
    new_password: z.string().min(8),
  }).safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Current password and new password (min 8 characters) are required." }, 400);
  }

  const { current_password, new_password } = parsed.data;

  const result = await query<{ password_hash: string }>(
    "SELECT password_hash FROM users WHERE id = $1",
    [actor.id]
  );

  if (result.rowCount === 0) {
    return c.json({ error: "User not found." }, 404);
  }

  const valid = await argon2.verify(result.rows[0].password_hash, current_password);
  if (!valid) {
    return c.json({ error: "Current password is incorrect." }, 400);
  }

  const hash = await argon2.hash(new_password);
  await query(
    `UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2`,
    [hash, actor.id]
  );

  return c.json({ ok: true, message: "Password changed successfully." });
});

authRoutes.post("/logout", (c) => c.json({ ok: true }));
authRoutes.post("/refresh", (c) => c.json({ message: "Not implemented yet" }, 501));
