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
import { aggregatorRoutes } from "./routes/aggregators.js";
import { offtakerRoutes } from "./routes/offtakers.js";
import { trashRoutes } from "./routes/trash.js";

const app = new Hono();

function allowedOrigins(): string[] {
  const origins = new Set<string>([
    "http://localhost:5173",
    "http://localhost:3000",
    "https://farmeriq.jniagri.ag",
    "https://www.farmeriq.jniagri.ag",
  ]);
  const configured = process.env.WEB_ORIGIN?.split(",").map((o) => o.trim()) ?? [];
  for (const origin of configured) {
    if (origin) origins.add(origin);
  }
  return [...origins];
}

app.use(
  "*",
  cors({
    origin: (origin) => {
      const allowed = allowedOrigins();
      if (!origin) return allowed[0];
      return allowed.includes(origin) ? origin : null;
    },
    allowHeaders: ["Content-Type", "Authorization", "X-Actor-Id", "X-Actor-Role", "X-Actor-Office-Id"],
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
app.route("/aggregators", aggregatorRoutes);
app.route("/offtakers", offtakerRoutes);
app.route("/events", eventRoutes);
app.route("/uploads", uploadFileRoute);
app.route("/trash", trashRoutes);

app.onError((err, c) => {
  console.error("[api error]", err);
  return c.json(
    {
      error: err.message || "Internal server error",
      details: process.env.NODE_ENV === "production" ? undefined : String(err),
    },
    500
  );
});

export default app;
