import { Hono } from "hono";
import { LoginRequest } from "@farmeriq/shared";
import { query } from "../db.js";
import * as argon2 from "argon2";
import jwt from "jsonwebtoken";

// Auth routes — JWT implementation in next build step
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

  let result = await query<{
    id: string;
    email: string;
    full_name: string;
    role: string;
    office_id: string | null;
    password_hash: string;
  }>("SELECT id, email, full_name, role, office_id, password_hash FROM users WHERE LOWER(email) = $1 AND is_active = true", [
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

authRoutes.post("/logout", (c) => c.json({ ok: true }));
authRoutes.post("/refresh", (c) => c.json({ message: "Not implemented yet" }, 501));
