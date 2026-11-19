import { Hono } from "hono";
import type { UserRole } from "@farmeriq/shared";
import { requireActor } from "../lib/actor.js";
import { query } from "../db.js";

export const notificationRoutes = new Hono();

export interface NotificationItem {
  id: string;
  category: "user" | "conflict" | "event";
  title: string;
  message: string;
  created_at: string;
  link?: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
  agent: "Field Agent",
  team_lead: "Team Lead",
  operations: "Operations",
  admin: "Administrator",
};

const FLAG_TYPE_LABELS: Record<string, string> = {
  duplicate_ghana_card: "Duplicate Ghana Card",
  duplicate_profile: "Possible duplicate profile",
  boundary_overlap: "Farm boundary overlap",
  duplicate_waybill_dispatch: "Duplicate waybill dispatch",
  duplicate_waybill_load: "Duplicate waybill load",
  waybill_weight_discrepancy: "Waybill weight discrepancy",
  ai_data_check: "AI accuracy check",
};

function formatFlagType(flagType: string): string {
  return FLAG_TYPE_LABELS[flagType] ?? flagType.replace(/_/g, " ");
}

function formatEventDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

notificationRoutes.get("/", async (c) => {
  const actorResult = requireActor(c);
  if (actorResult instanceof Response) return actorResult;
  const actor = actorResult;

  const items: NotificationItem[] = [];

  // 1. Admin & Team Lead: new users added in the last 30 days
  if (actor.role === "admin" || actor.role === "team_lead") {
    const officeFilter =
      actor.role === "team_lead" && actor.office_id ? "AND u.office_id = $2" : "";
    const userParams =
      actor.role === "team_lead" && actor.office_id ? [actor.id, actor.office_id] : [actor.id];

    const usersRes = await query<{
      id: string;
      full_name: string;
      role: UserRole;
      created_at: string;
      office_name: string | null;
    }>(
      `SELECT u.id, u.full_name, u.role, u.created_at, o.name AS office_name
       FROM users u
       LEFT JOIN offices o ON o.id = u.office_id
       WHERE u.deleted_at IS NULL
         AND u.id != $1
         AND u.created_at >= now() - interval '30 days'
         ${officeFilter}
       ORDER BY u.created_at DESC
       LIMIT 15`,
      userParams
    );

    for (const u of usersRes.rows) {
      const roleLabel = ROLE_LABELS[u.role] ?? u.role;
      const officeSuffix = u.office_name ? ` · ${u.office_name}` : "";
      items.push({
        id: `user-created-${u.id}`,
        category: "user",
        title: "New user added",
        message: `${u.full_name} (${roleLabel}${officeSuffix})`,
        created_at: new Date(u.created_at).toISOString(),
        link: actor.role === "admin" ? "/users" : undefined,
      });
    }
  }

  // 2. Conflicts:
  //    - Admin & Team Lead: open conflicts across farmers
  //    - Field Agents: open conflicts or recently resolved/dismissed conflicts on farmers they registered
  if (actor.role === "admin" || actor.role === "team_lead") {
    const conflictsRes = await query<{
      id: string;
      flag_type: string;
      created_at: string;
      farmer_id: string;
      farmer_name: string;
    }>(
      `SELECT cf.id,
              cf.flag_type,
              cf.created_at,
              f.id AS farmer_id,
              f.full_name AS farmer_name
       FROM conflict_flags cf
       LEFT JOIN farm_plots fp ON cf.entity_type = 'farm_plot' AND fp.id = cf.entity_id
       JOIN farmers f ON f.id = COALESCE(
         CASE WHEN cf.entity_type = 'farmer' THEN cf.entity_id ELSE NULL END,
         fp.farmer_id
       )
       WHERE cf.status = 'open'
         AND f.deleted_at IS NULL
       ORDER BY cf.created_at DESC
       LIMIT 15`
    );

    for (const cf of conflictsRes.rows) {
      items.push({
        id: `conflict-open-${cf.id}`,
        category: "conflict",
        title: "Conflict flagged",
        message: `${cf.farmer_name} — ${formatFlagType(cf.flag_type)}`,
        created_at: new Date(cf.created_at).toISOString(),
        link: `/farmers/${cf.farmer_id}`,
      });
    }
  } else {
    const agentConflictsRes = await query<{
      id: string;
      flag_type: string;
      status: string;
      reason: string | null;
      created_at: string;
      resolved_at: string | null;
      farmer_id: string;
      farmer_name: string;
    }>(
      `SELECT cf.id,
              cf.flag_type,
              cf.status,
              cf.reason,
              cf.created_at,
              cf.resolved_at,
              f.id AS farmer_id,
              f.full_name AS farmer_name
       FROM conflict_flags cf
       LEFT JOIN farm_plots fp ON cf.entity_type = 'farm_plot' AND fp.id = cf.entity_id
       JOIN farmers f ON f.id = COALESCE(
         CASE WHEN cf.entity_type = 'farmer' THEN cf.entity_id ELSE NULL END,
         fp.farmer_id
       )
       WHERE f.created_by = $1
         AND f.deleted_at IS NULL
         AND (
           cf.status = 'open'
           OR (cf.resolved_at IS NOT NULL AND cf.resolved_at >= now() - interval '14 days')
         )
       ORDER BY COALESCE(cf.resolved_at, cf.created_at) DESC
       LIMIT 15`,
      [actor.id]
    );

    for (const cf of agentConflictsRes.rows) {
      const isOpen = cf.status === "open";
      const timestamp = isOpen ? cf.created_at : (cf.resolved_at ?? cf.created_at);
      items.push({
        id: `conflict-${cf.status}-${cf.id}`,
        category: "conflict",
        title: isOpen
          ? "Conflict on your farmer"
          : cf.status === "resolved"
            ? "Conflict resolved"
            : "Conflict dismissed",
        message: `${cf.farmer_name} — ${formatFlagType(cf.flag_type)}`,
        created_at: new Date(timestamp).toISOString(),
        link: `/farmers/${cf.farmer_id}`,
      });
    }
  }

  // 3. Upcoming field events (today through next 7 days) for all roles
  const eventsRes = await query<{
    id: string;
    title: string;
    event_date: string;
    community: string | null;
    created_at: string;
  }>(
    `SELECT e.id, e.title, e.event_date, e.community, e.created_at
     FROM events e
     WHERE e.deleted_at IS NULL
       AND e.event_date >= CURRENT_DATE
       AND e.event_date <= CURRENT_DATE + interval '7 days'
     ORDER BY e.event_date ASC
     LIMIT 10`
  );

  for (const ev of eventsRes.rows) {
    const communitySuffix = ev.community ? ` · ${ev.community}` : "";
    items.push({
      id: `event-upcoming-${ev.id}`,
      category: "event",
      title: "Upcoming field event",
      message: `${ev.title}${communitySuffix} (${formatEventDate(ev.event_date)})`,
      created_at: new Date(ev.created_at).toISOString(),
      link: `/events/${ev.id}`,
    });
  }

  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return c.json({ notifications: items.slice(0, 25) });
});
