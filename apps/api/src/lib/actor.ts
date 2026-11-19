import type { Context } from "hono";
import jwt from "jsonwebtoken";
import type { UserRole } from "@farmeriq/shared";

export interface Actor {
  id: string;
  role: UserRole;
  office_id: string | null;
  can_access_operations?: boolean;
}

const VALID_ROLES: UserRole[] = ["agent", "team_lead", "operations", "admin"];

function parseRole(value: string | undefined): UserRole {
  if (value && VALID_ROLES.includes(value as UserRole)) {
    return value as UserRole;
  }
  return "agent";
}

export function parseActor(c: Context): Actor | null {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];
  try {
    const secret = process.env.JWT_SECRET || "fallback-secret";
    const payload = jwt.verify(token, secret) as any;
    return {
      id: payload.id,
      role: parseRole(payload.role),
      office_id: payload.office_id || null,
      can_access_operations: Boolean(payload.can_access_operations),
    };
  } catch (err) {
    return null;
  }
}

export function requireActor(c: Context): Actor | Response {
  const actor = parseActor(c);
  if (!actor) {
    return c.json({ error: "Authentication required" }, 401);
  }
  return actor;
}
