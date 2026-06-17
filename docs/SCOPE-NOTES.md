# Scope notes

Clarifications beyond the original scope document (v1.1).

## Farmer identity

- **System-generated UUID is the primary key** for every farmer.
- Ghana Card is optional. Not all farmers have one.
- Ghana Card is used for matching and conflict flagging when present, never as a hard requirement to register.
- Situations where farmers lack Ghana Cards must not block data capture.

## Field agents

- Agents log in with their own credentials.
- Each agent gets a **dashboard**: farmers they added, forms, add-new-farmer flow.
- The platform assists agents in capturing data — the form is the core interaction.
- Profile fields can be expanded over time without rebuilding the platform.

## User roles

- Farmers do not use the platform.
- Field agents are the primary operators.
- Team leads handle conflicts and reporting.
- Admins manage users and full registry access.

## UI direction

- Professional, government-appropriate design.
- Modern but plain — **no gradients**.
- Suitable for government review and formal reporting.
- High contrast, large touch targets for field use.
- See [UI.md](UI.md).

## Platform type

- **Responsive web application** in the browser.
- Works on phone, tablet, and laptop — same app, not a native mobile app.
- Offline support comes via PWA techniques in phase 2, not a separate app store build.

## Deferred features

| Feature | Status |
|---------|--------|
| Voice transcription | Out of scope for now |
| OCR (paper digitization) | After core platform is fully working |
| Hosting provider | Not decided |
| MFA for admins | After core login works |

## Data sovereignty (unchanged from scope doc)

- Company owns codebase, infrastructure, and all records.
- No third-party SaaS processes farmer data.
