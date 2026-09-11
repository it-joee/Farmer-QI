import "./load-env.js";
import pg from "pg";

const { Pool } = pg;

function resolveDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url?.includes("supabase.com") || url.includes("uselibpqcompat=")) {
    return url;
  }
  // pg v8 treats sslmode=require as verify-full unless libpq compat is enabled.
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}uselibpqcompat=true`;
}

const connectionString = resolveDatabaseUrl();

// IMPORTANT: For Vercel serverless, DATABASE_URL should point to Supabase's
// Transaction Mode pooler (port 6543, not 5432). This avoids EMAXCONNSESSION
// errors because transaction mode does not hold connections between queries.
// In Supabase dashboard: Project Settings → Database → Connection Pooling →
// set Mode to "Transaction" and copy the pooler connection string.
export const pool = new Pool({
  connectionString,
  ssl: connectionString?.includes("supabase.com")
    ? { rejectUnauthorized: false }
    : undefined,
  // Serverless: keep the per-instance pool tiny. Each Vercel function only
  // needs 1–2 connections. A large pool * many concurrent invocations = pool
  // exhaustion on Supabase's session-mode limit (EMAXCONNSESSION).
  max: 2,
  // Release idle connections quickly so Supabase doesn't hold slots open
  // across concurrent serverless invocations.
  idleTimeoutMillis: 10_000,
  // Fail fast if the DB is unreachable.
  connectionTimeoutMillis: 10_000,
});

// Prevent unhandled 'error' events from crashing the process when
// a pooled connection is dropped (e.g. after Supabase pause/resume).
pool.on("error", (err) => {
  console.error("[db] idle client error — connection will be evicted:", err.message);
});

export async function query<T extends pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}

// Gracefully close pool on exit to prevent connection leaks during hot-reloads
function cleanup() {
  pool.end().catch(() => {});
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
