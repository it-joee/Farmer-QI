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
});

export async function query<T extends pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}
