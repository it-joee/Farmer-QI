# Build phases

Track what is built vs planned. Update this file as work completes.

## Phase 1 — Core platform (mostly done; auth deferred)

| Item | Status | Notes |
|------|--------|-------|
| Monorepo scaffold | Done | `apps/api`, `apps/web`, `packages/shared` |
| Documentation | Done | `docs/` folder |
| Database schema | Done | `db/schema.sql` — system UUID, optional Ghana Card |
| Shared types (Zod) | Done | `packages/shared` |
| API health check | Done | `GET /health` |
| API farmer CRUD (basic) | Done | Create + list + get + update |
| Web login page | Done | Plain UI, no gradients |
| Agent dashboard | Done | KPIs, charts, farmer list |
| Add farmer form | Done | Multi-step, system ID on save, Ghana Card optional |
| Edit farmer form | Done | 3-step edit flow from farmer detail |
| Farmer detail page | Done | Profile, photos, boundary, crop cycles |
| Farmer photos | Done | Capture, upload, view on detail |
| Header profile menu | Done | Name, role, logout dropdown |
| API auth (login) | Deferred | Argon2 verify + JWT |
| JWT middleware | Deferred | Protect `/farmers` routes |
| Seed user script | Deferred | Argon2 hash for dev login |

## Phase 2 — Field operations (done)

| Item | Status | Notes |
|------|--------|-------|
| Offline local storage | Done | IndexedDB queue for farmer submissions + photos |
| Background sync | Done | Auto-sync on reconnect + manual retry banner |
| GPS polygon mapping | Done | View/edit on farmer detail page |
| Crop cycle logging | Done | API + log form on farmer detail |
| Conflict flagging | Done | Ghana Card duplicate + boundary overlap on save |

## Phase 3 — Intelligence and reporting (mostly done)

| Item | Status | Notes |
|------|--------|-------|
| Filterable reports UI | Done | Region, district, commodity, date range |
| Report export (CSV) | Done | Opens in Excel |
| Report export (PDF) | Done | Print-to-PDF via browser |
| Conflict report view | Done | Open flags on Reports page |
| OCR paper digitization | Deferred | After platform stabilizes |
| Voice transcription | Out of scope | |
| MFA for admin/team lead | Deferred | With auth |
| Hosting setup | Testing | Supabase (DB) + Vercel — see [TEST-DEPLOYMENT.md](TEST-DEPLOYMENT.md); production VPS TBD |
| Auth hardening | Deferred | JWT, Argon2, route protection |

## Deferred until production readiness

Auth, MFA, and hosting are intentionally skipped until the core registry workflow is complete in the field.
