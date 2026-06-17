# Environment variables

Create **`env.local`** in the repo root (gitignored). Never commit env files to git.

Both the API and web dev server load, in order: `.env` → `.env.local` → **`env.local`** (highest priority).

## Required for local dev with database

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string. Local: `postgresql://farmeriq:farmeriq@localhost:5432/farmeriq`. Supabase: URI from project settings + `?sslmode=require` |
| `SKIP_AUTH` | `true` to bypass login during UI dev; `false` for real auth testing |
| `VITE_SKIP_AUTH` | Same as `SKIP_AUTH` — must match at web build time |
| `JWT_SECRET` | Long random string for JWT signing |
| `JWT_ACCESS_EXPIRES` | e.g. `15m` |
| `JWT_REFRESH_EXPIRES` | e.g. `14d` |

## Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | API port |
| `VITE_API_URL` | `http://localhost:3001` | API URL for web (local dev uses Vite proxy if unset) |
| `WEB_ORIGIN` | `http://localhost:5173` | CORS origin for API |
| `UPLOAD_DIR` | `apps/api/uploads` | Farmer photo storage (local dev) |

## Supabase testing notes

- Use **direct connection** (port 5432, `db.xxx.supabase.co`) for SQL Editor only.
- For **local dev on Windows** and **Vercel**, use the **Session pooler** URI from Supabase → **Connect** → Connection string → **Session pooler** (host looks like `aws-0-xxx.pooler.supabase.com`, port **5432** or **6543**).

If save/sync fails and `/health` shows `ENOTFOUND` for `db.xxx.supabase.co`, your machine cannot reach Supabase’s direct host — switch to the **pooler** connection string in `env.local`.

## Vercel (API project — `apps/api`)

Add these in **Vercel → Project → Settings → Environment Variables** (Production + Preview):

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Supabase **pooler** URI (port 6543) + `?sslmode=require` |
| `SKIP_AUTH` | Yes | `true` for testing without login |
| `JWT_SECRET` | Yes | Any long random string |
| `WEB_ORIGIN` | Yes | Your web app URL, e.g. `https://your-web.vercel.app` |

Redeploy after adding variables. Visit `/health` to confirm the API is up.

See also [TEST-DEPLOYMENT.md](TEST-DEPLOYMENT.md).
