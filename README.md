# FarmerIQ

Internally owned agricultural data platform for field agent workflows — farmer registry, farm boundaries, crop history, and reporting.

> **Testing period:** We are using **Supabase for database only** and **Vercel for hosting** while we validate the product in the field. The long-term stack remains self-hosted (Node API + PostgreSQL + PostGIS on company infrastructure). See [docs/TEST-DEPLOYMENT.md](docs/TEST-DEPLOYMENT.md).

## Repo layout

```
jni-farmerIQ/
├── apps/
│   ├── api/          # Node.js REST API (Hono)
│   └── web/          # Responsive web app (React + Vite)
├── packages/
│   └── shared/       # Shared TypeScript types and constants
├── docs/             # Architecture, stack, data model, auth
└── db/
    └── schema.sql    # PostgreSQL + PostGIS schema
```

## Documentation

| File | Contents |
|------|----------|
| [docs/STACK.md](docs/STACK.md) | Technology choices and what is deferred |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System overview and module boundaries |
| [docs/DATA-MODEL.md](docs/DATA-MODEL.md) | Entities, IDs, and relationships |
| [docs/AUTH.md](docs/AUTH.md) | Authentication and roles |
| [docs/SCOPE-NOTES.md](docs/SCOPE-NOTES.md) | Scope clarifications from stakeholder input |
| [docs/UI.md](docs/UI.md) | Visual and UX standards |
| [docs/TEST-DEPLOYMENT.md](docs/TEST-DEPLOYMENT.md) | **Testing period:** Supabase DB + Vercel hosting |
| [docs/ENV.md](docs/ENV.md) | Environment variables (create `.env.local` locally) |

## Prerequisites

- Node.js 20+
- PostgreSQL 16+ with PostGIS extension

## Quick start

```bash
npm install
# Create env.local in repo root — see docs/ENV.md (never commit this file)

# Start everything (API + web UI)
npm run dev
```

**Open only:** http://localhost:5173

That one URL is the app. The API runs in the background automatically — you never open port 3001 in the browser.

If `npm run dev` says **port 3001 already in use**, stop any old dev terminals first (or close the extra `npm run dev:api` window), then run `npm run dev` again.

## Git and secrets

`.gitignore` excludes all env files. Variable names are in [docs/ENV.md](docs/ENV.md) — put secrets in **`env.local`** locally only.

```bash
git init
git add .
git status   # confirm .env.local is not listed
```

## Build phases

1. **Now** — Auth, agent dashboard, farmer intake form, system-generated farmer ID
2. **Next** — Offline sync (PWA + local storage), GPS polygon mapping
3. **Later** — OCR for paper forms, advanced conflict resolution, reporting exports

Voice transcription is out of scope for now. Production hosting is TBD (VPS); see [docs/TEST-DEPLOYMENT.md](docs/TEST-DEPLOYMENT.md) for the current test setup on Supabase + Vercel.
