# Technology stack

Plain, self-hosted stack. No third-party SaaS between the application and farmer data.

> **Testing period notice**  
> For quick field testing we are temporarily using **Supabase (PostgreSQL only)** and **Vercel (hosting)**. The application code and long-term target stack are unchanged. See [TEST-DEPLOYMENT.md](TEST-DEPLOYMENT.md) for setup steps and limitations.

## In use (V1 foundation)

| Layer | Choice | Why |
|-------|--------|-----|
| Language | TypeScript | Shared types across API and web |
| API | Hono on Node.js | Small, fast, easy to read |
| Web app | React + Vite | Single responsive web app for agents and admins |
| Database | PostgreSQL + PostGIS | Relational data + farm polygon storage |
| Auth | Self-hosted JWT + refresh tokens | Data sovereignty, offline-friendly sessions |
| Validation | Zod | Shared schemas in `packages/shared` |
| Password hashing | Argon2id | Industry standard |

## Planned (not built yet)

| Layer | Choice | When |
|-------|--------|------|
| Offline storage | RxDB or IndexedDB wrapper | After core online flow works |
| Background sync | Workbox service worker | With offline storage |
| Maps | MapLibre GL JS + OpenStreetMap | GPS boundary module |
| Area calculation | Turf.js | Client-side, works offline |
| OCR | Tesseract or Google Vision API | After platform is fully working |
| Hosting | DigitalOcean or Hetzner VPS | TBD (Vercel used temporarily for testing — see [TEST-DEPLOYMENT.md](TEST-DEPLOYMENT.md)) |

## Explicitly excluded (production)

- Auth0, Clerk, Firebase Auth — third-party auth SaaS
- Vercel, Netlify, managed PaaS — third-party deployment layer *(exception: temporary test hosting — see [TEST-DEPLOYMENT.md](TEST-DEPLOYMENT.md))*
- Supabase Auth, Storage, Realtime — we use Supabase as Postgres host only during testing
- Native iOS/Android apps — responsive web app covers all devices
- Voice transcription — deferred indefinitely for now
- Gradient-heavy or decorative UI — see [UI.md](UI.md)

## Monorepo

npm workspaces with three packages:

- `apps/api`
- `apps/web`
- `packages/shared`

No Turborepo or Nx unless the repo outgrows this layout.
