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

export const pool = new Pool({
  connectionString,
  ssl: connectionString?.includes("supabase.com")
    ? { rejectUnauthorized: false }
    : undefined,
  // Evict idle connections after 30s so stale clients from a Supabase
  // pause/resume cycle don't block queries indefinitely.
  idleTimeoutMillis: 30_000,
  // Fail fast if the DB is still waking up, so callers get a clear error.
  connectionTimeoutMillis: 10_000,
  max: 5,
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
