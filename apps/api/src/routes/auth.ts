import { Hono } from "hono";
import { LoginRequest } from "@farmeriq/shared";
import { query } from "../db.js";

// Auth routes — JWT implementation in next build step
export const authRoutes = new Hono();

authRoutes.post("/login", async (c) => {
  const body = await c.req.json();
  const parsed = LoginRequest.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid email or password format" }, 400);
  }

  const result = await query<{
    id: string;
    email: string;
    full_name: string;
    role: string;
    office_id: string | null;
    password_hash: string;
  }>("SELECT id, email, full_name, role, office_id, password_hash FROM users WHERE email = $1 AND is_active = true", [
    parsed.data.email,
  ]);

  if (result.rowCount === 0) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  // TODO: verify password with argon2, issue JWT + refresh token
  return c.json({
    message: "Login endpoint ready — wire Argon2 + JWT next",
    user: {
      id: result.rows[0].id,
      email: result.rows[0].email,
      full_name: result.rows[0].full_name,
      role: result.rows[0].role,
      office_id: result.rows[0].office_id,
    },
  });
});

authRoutes.post("/logout", (c) => c.json({ ok: true }));
authRoutes.post("/refresh", (c) => c.json({ message: "Not implemented yet" }, 501));
