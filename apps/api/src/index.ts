import "./load-env.js";
import { serve } from "@hono/node-server";
import app from "./app.js";

/** Vercel detects and runs this Hono app as a serverless function. */
export default app;

if (!process.env.VERCEL) {
  const port = Number(process.env.PORT ?? 3001);

  if (process.env.SKIP_AUTH === "true") {
    console.warn("SKIP_AUTH is enabled — do not use in production");
  }

  serve({ fetch: app.fetch, port }, () => {
    console.log(`FarmerIQ API running on http://localhost:${port}`);
  });
}
