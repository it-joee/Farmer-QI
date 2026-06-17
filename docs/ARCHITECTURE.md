# Architecture

## Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (any device)                   │
│  ┌───────────────────────────────────────────────────┐  │
│  │  apps/web — React responsive web app               │  │
│  │  • Agent dashboard + farmer intake forms           │  │
│  │  • Admin / team lead views (role-gated)             │  │
│  │  • Offline layer added in phase 2                  │  │
│  └───────────────────────┬───────────────────────────┘  │
└──────────────────────────┼──────────────────────────────┘
                           │ HTTPS / REST
┌──────────────────────────▼──────────────────────────────┐
│  apps/api — Hono REST API                                │
│  • Auth (login, refresh, logout)                         │
│  • Farmers, plots, crop cycles                           │
│  • Sync endpoint (phase 2)                               │
│  • Conflict detection (phase 2)                          │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  PostgreSQL + PostGIS                                    │
│  • All records, audit log, refresh tokens                │
└─────────────────────────────────────────────────────────┘
```

## User access

Farmers never log in. All interaction goes through field agents.

| Role | Access |
|------|--------|
| `agent` | Login, own dashboard, add/edit farmers they registered, intake forms |
| `team_lead` | Agent access plus conflict queue and regional oversight |
| `admin` | Full registry, user management, reports |

## Module boundaries (from scope)

### Phase 1 — Core platform (current)

- User accounts and login
- Agent dashboard
- Farmer profile intake (system-generated ID, optional Ghana Card)
- Farmer list filtered by agent / office

### Phase 2 — Field operations

- Offline-first local storage and background sync
- GPS polygon boundary capture
- Crop and season logging per plot
- Automated duplicate and overlap flagging

### Phase 3 — Intelligence and reporting

- OCR photo-to-form pipeline
- Data cleaning at sync (units, seasons, community names)
- Dashboard reports and Excel/PDF export

## Data flow — add farmer (phase 1)

```
Agent logs in
  → JWT issued, stored in browser
  → Agent opens "Add farmer" form
  → Submits profile (Ghana Card optional)
  → API generates farmer UUID
  → Record saved with created_by = agent user ID
  → Farmer appears on agent dashboard
```

## Data sovereignty

- Codebase is proprietary and self-hosted
- Database runs on infrastructure the company controls
- No third-party platform stores or processes farmer records
- OCR provider (when added) must be evaluated against compliance requirements

## Audit

Every write to the database logs:

- `who` — user ID or `system`
- `what` — entity type, entity ID, field changes
- `when` — UTC timestamp

Immutable audit log. No deletes without a logged reason.
