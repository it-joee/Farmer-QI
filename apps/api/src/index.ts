import "./load-env.js";
import app from "./app.js";

/** Vercel serverless entry — must not import @hono/node-server here. */
export default app;
