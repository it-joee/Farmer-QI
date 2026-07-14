import type { Context } from "hono";
import jwt from "jsonwebtoken";
import type { UserRole } from "@farmeriq/shared";
import { DEV_OFFICE_ID, DEV_USER_ID, SKIP_AUTH } from "../config.js";

export interface Actor {
  id: string;
  role: UserRole;
  office_id: string | null;
}

const VALID_ROLES: UserRole[] = ["agent", "team_lead", "admin"];

function parseRole(value: string | undefined): UserRole {
  if (value && VALID_ROLES.includes(value as UserRole)) {
    return value as UserRole;
  }
  return "agent";
}

export function parseActor(c: Context): Actor | null {
  if (SKIP_AUTH) {
    const id = c.req.header("X-Actor-Id") ?? DEV_USER_ID;
    const role = parseRole(c.req.header("X-Actor-Role") ?? undefined);
    const officeHeader = c.req.header("X-Actor-Office-Id");
    const office_id =
      role === "admin" ? officeHeader || null : officeHeader || DEV_OFFICE_ID;
    return { id, role, office_id };
  }

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
