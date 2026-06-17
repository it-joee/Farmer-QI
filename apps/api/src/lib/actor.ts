import type { Context } from "hono";
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

  return null;
}

export function requireActor(c: Context): Actor | Response {
  const actor = parseActor(c);
  if (!actor) {
    return c.json({ error: "Authentication required" }, 401);
  }
  return actor;
}
