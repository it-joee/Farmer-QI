import "./load-env.js";
import { serve } from "@hono/node-server";
import app from "./app.js";

const port = Number(process.env.PORT ?? 3001);

if (process.env.SKIP_AUTH === "true") {
  console.warn("SKIP_AUTH is enabled — do not use in production");
}

serve({ fetch: app.fetch, port }, () => {
  console.log(`FarmerIQ API running on http://localhost:${port}`);
});
