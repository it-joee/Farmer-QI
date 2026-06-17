import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRoutes } from "./routes/auth.js";
import { conflictRoutes } from "./routes/conflicts.js";
import { farmerRoutes } from "./routes/farmers.js";
import { healthRoutes } from "./routes/health.js";
import { reportRoutes } from "./routes/reports.js";
import { farmerPhotoRoutes, uploadFileRoute } from "./routes/photos.js";
import { eventRoutes } from "./routes/events.js";
import { userRoutes } from "./routes/users.js";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  })
);

app.get("/", (c) =>
  c.json({
    name: "FarmerIQ API",
    health: "/health",
  })
);

app.route("/health", healthRoutes);
app.route("/reports", reportRoutes);
app.route("/auth", authRoutes);
app.route("/conflicts", conflictRoutes);
app.route("/users", userRoutes);
app.route("/farmers", farmerRoutes);
app.route("/farmers", farmerPhotoRoutes);
app.route("/events", eventRoutes);
app.route("/uploads", uploadFileRoute);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
