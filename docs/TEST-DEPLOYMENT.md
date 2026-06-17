# Test deployment — Supabase + Vercel

> **Important notice (testing period only)**  
> For quick field testing, we are temporarily using **Supabase for PostgreSQL only** and **Vercel for hosting**.  
> This does **not** change the long-term stack: self-hosted API, company-controlled PostgreSQL + PostGIS, and VPS deployment (see [STACK.md](STACK.md)).

Use this guide to stand up a shared test environment. When testing is done, migrate to the production stack and decommission the test Supabase project.

---

## What changes vs the main stack

| Layer | Production target | Testing period |
|-------|-------------------|----------------|
| Database | PostgreSQL + PostGIS on company VPS | **Supabase Postgres** (PostGIS enabled) |
| Web hosting | VPS / reverse proxy | **Vercel** (static build of `apps/web`) |
| API hosting | Same VPS as DB or adjacent Node process | **Vercel serverless** (Hono) *or* same Vercel project via rewrites |
| Auth | Self-hosted JWT + Argon2 | Same code — still self-hosted in our API (not Supabase Auth) |
| Farmer photos | Local disk on VPS | **Not supported on Vercel serverless** without extra storage (see [Limitations](#limitations)) |

**What we do not use from Supabase:** Auth, Storage, Realtime, Edge Functions, or the Supabase client SDK. Supabase is a managed Postgres host only.

**What we do not use from Vercel:** Vercel Postgres, Vercel KV, or third-party auth integrations.

---

## Architecture (testing period)

```
Browser
   │
   ▼
Vercel  ── HTTPS ──►  apps/web (React static build)
   │
   │  /api/* rewrites
   ▼
Vercel serverless  ──►  apps/api (Hono)
   │
   │  DATABASE_URL (SSL)
   ▼
Supabase PostgreSQL + PostGIS
```

The application code (`apps/api`, `apps/web`, `packages/shared`) stays the same. Only infrastructure and environment variables change.

---

## Step 1 — Supabase (database only)

### 1. Create a project

1. Sign in at [supabase.com](https://supabase.com) and create a new project.
2. Choose a region close to your testers (e.g. EU or US East).
3. Save the database password securely.

### 2. Enable PostGIS

FarmerIQ requires PostGIS for farm boundary polygons. In the Supabase **SQL Editor**, run:

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";
```

(`schema.sql` also runs these — safe to run twice.)

### 3. Apply schema and migrations

From your machine (with `psql` installed), using the **direct connection** string from Supabase → **Project Settings → Database → Connection string → URI**:

```bash
# Direct connection (port 5432) — use for one-off schema setup
psql "postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres?sslmode=require" \
  -f db/schema.sql

# Then apply migrations in order
for f in db/migrations/*.sql; do psql "$DATABASE_URL" -f "$f"; done

# Optional: seed pilot users and office
psql "$DATABASE_URL" -f db/seed.sql
```

Alternatively, paste the contents of each file into the Supabase SQL Editor and run them in order:

1. `db/schema.sql`
2. `db/migrations/001_farmer_extended_fields.sql` through `008_submission_records.sql`
3. `db/seed.sql` (optional)

### 4. Connection strings for the API

Supabase provides two URLs:

| Type | When to use |
|------|-------------|
| **Direct** (port 5432) | Local dev, running migrations, long-lived Node server |
| **Pooler — Transaction mode** (port 6543) | Vercel serverless (recommended for deployed API) |

Set `DATABASE_URL` in Vercel to the **pooler** URI and append `?sslmode=require` if not already present:

```
postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require
```

Our API uses the `pg` Pool with `connectionString` only — no code changes needed for Supabase.

---

## Step 2 — Vercel (hosting)

### Recommended layout: one Vercel project

Deploy the **web app** as the primary output and route `/api/*` to a **serverless Hono handler** so the browser can keep using relative paths like `/api/farmers` (same as local Vite proxy).

#### Environment variables (Vercel dashboard)

Set these for **Production** and **Preview**:

| Variable | Example / notes |
|----------|-----------------|
| `DATABASE_URL` | Supabase pooler URI (see above) |
| `SKIP_AUTH` | `false` when testing with real users, or `true` for UI-only smoke tests |
| `JWT_SECRET` | Long random string |
| `WEB_ORIGIN` | `https://your-app.vercel.app` (your Vercel web URL) |
| `VITE_SKIP_AUTH` | Must match `SKIP_AUTH` at **build time** |
| `VITE_API_URL` | Leave empty or same origin if using rewrites (see below) |

For the web build, Vite reads env from the repo root (`envDir` in `vite.config.ts`), so set `VITE_*` vars in Vercel before deploying.

#### Build settings

| Setting | Value |
|---------|-------|
| Root directory | Repository root |
| Install command | `npm install` |
| Build command | `npm run build -w @farmeriq/web` |
| Output directory | `apps/web/dist` |

#### API on Vercel (required code change — not done yet)

Today `apps/api/src/index.ts` calls `serve()` for a long-running Node process. Vercel needs a **serverless entry** that exports the Hono app without `serve()`:

1. Split the Hono `app` into something like `apps/api/src/app.ts`.
2. Add a Vercel handler, e.g. `api/index.ts` at the repo root:

   ```typescript
   import { handle } from "hono/vercel";
   import app from "../apps/api/src/app";

   export default handle(app);
   export const config = { runtime: "nodejs20.x" };
   ```

3. Add `vercel.json` rewrites so `/api/*` hits the serverless function and strips the prefix (matching local dev):

   ```json
   {
     "rewrites": [
       { "source": "/api/(.*)", "destination": "/api" },
       { "source": "/uploads/(.*)", "destination": "/api" }
     ]
   }
   ```

Until that entry point exists, you can still test **database + web UI** by:

- Running the API locally with `DATABASE_URL` pointing at Supabase, and  
- Deploying only the web to Vercel with `VITE_API_URL` set to a tunnel (ngrok) or a temporary API host.

---

## Step 3 — Local dev against Supabase (fastest first test)

Before deploying to Vercel, confirm the database works from your machine:

```bash
cp env.example .env.local
```

Edit `.env.local` (gitignored — put Supabase URI and secrets here):

```env
DATABASE_URL=postgresql://postgres.[ref]:[password]@...supabase.com:5432/postgres?sslmode=require
SKIP_AUTH=false
VITE_SKIP_AUTH=false
```

Then:

```bash
npm install
npm run dev
```

Open http://localhost:5173 — the Vite dev server proxies `/api` to the local API, which reads/writes Supabase.

---

## Step 4 — Smoke-test checklist

After deploy (or local + Supabase):

- [ ] `GET /health` returns OK
- [ ] Dashboard loads with KPIs from real data
- [ ] Add farmer → record appears in Supabase **Table Editor** (`farmers`)
- [ ] Draw or save a farm boundary (confirms PostGIS)
- [ ] Reports page loads filter options
- [ ] Events list/create works
- [ ] Turn off `SKIP_AUTH` and verify login flow once JWT is wired

---

## Limitations during testing

### Farmer photo uploads

Photos are stored on the API server filesystem (`apps/api/uploads/`). **Vercel serverless has no persistent disk**, so photo upload/sync will not work on a serverless-only API deployment.

Options for the test period:

1. **Skip photos** — test registry, boundaries, reports, and events without portraits.
2. **Run API locally or on a VPS** with disk storage while web is on Vercel (hybrid).
3. **Add object storage later** (e.g. Supabase Storage or S3) — out of scope for “database only” unless you explicitly expand.

### Data location

During testing, farmer records live on Supabase infrastructure. Treat this as **non-production data** unless compliance approves Supabase for the pilot. Plan migration to self-hosted Postgres before go-live.

### Offline sync

Offline queue (IndexedDB) still works in the browser. Sync requires the deployed API to be reachable when back online.

### CORS

Set `WEB_ORIGIN` to your exact Vercel URL (including `https://`). Update it when you add a custom domain.

---

## Migration back to production stack

When testing ends:

1. Export data from Supabase (`pg_dump` or Supabase backup).
2. Restore into self-hosted PostgreSQL + PostGIS on VPS.
3. Deploy `apps/api` and `apps/web` on company infrastructure.
4. Point DNS at the VPS; remove or archive the Vercel project.
5. Delete or pause the Supabase test project.
6. Update `.env.local` / deployment secrets to production values.

The application schema and migrations in `db/` are the same for both environments — no forked data model.

---

## Related docs

- [STACK.md](STACK.md) — long-term technology choices
- [ARCHITECTURE.md](ARCHITECTURE.md) — system overview
- [AUTH.md](AUTH.md) — auth model (unchanged; not Supabase Auth)
- [BUILD-PHASES.md](BUILD-PHASES.md) — feature completion status
