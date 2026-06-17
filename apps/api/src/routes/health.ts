import { Hono } from "hono";
import { query } from "../db.js";

export const healthRoutes = new Hono();

healthRoutes.get("/", async (c) => {
  try {
    await query("SELECT 1");
    return c.json({ status: "ok", database: "connected" });
  } catch {
    return c.json({ status: "degraded", database: "disconnected" }, 503);
  }
});
