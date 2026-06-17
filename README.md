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

## Prerequisites

- Node.js 20+
- PostgreSQL 16+ with PostGIS extension

## Quick start

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your keys — this file is gitignored and never pushed

# SKIP_AUTH=true is on by default — browse UI without login or Postgres

# When ready for real data:
# 1. Set SKIP_AUTH=false and VITE_SKIP_AUTH=false in .env.local
# 2. Set up PostgreSQL and run: psql $DATABASE_URL -f db/schema.sql

# Start API and web app
npm run dev
```

- API: http://localhost:3001
- Web: http://localhost:5173

## Git and secrets

When you initialize git in this folder, `.gitignore` is already set up to exclude `.env.local`, other env files, and credential files. Only commit `.env.example` (placeholders, no real keys).

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
