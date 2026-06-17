# Environment variables

Create a **`.env.local`** file in the repo root (gitignored). Never commit env files to git.

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

- Use **direct connection** (port 5432) for running migrations.
- Use **pooler** (port 6543) for deployed/serverless API.

## Vercel

Set the same variables in the Vercel project dashboard — not in git.

See also [TEST-DEPLOYMENT.md](TEST-DEPLOYMENT.md).
