# UI standards

Government-facing. Plain and professional.

## Principles

- **No gradients** — solid colors only
- **High contrast** — WCAG AA minimum
- **Large touch targets** — 48px minimum on interactive elements
- **Shallow navigation** — any form field reachable within two clicks
- **Extensible forms** — new farmer fields added without redesigning the layout

## Visual direction

Think standard US government or enterprise web apps:

- White or light gray backgrounds
- Dark text on light surfaces
- One primary accent color (solid blue or green)
- Clear typography (system font stack or Inter)
- Simple cards and tables, no glassmorphism or decorative effects

## Layout — agent dashboard

```
┌──────────────────────────────────────────────┐
│  Logo    FarmerIQ          Agent Name  Logout  │
├──────────────────────────────────────────────┤
│                                              │
│  My Farmers                    [+ Add Farmer] │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ Search...                              │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌──────────┬───────────┬──────────┬─────┐  │
│  │ Name     │ Community │ Phone    │ ... │  │
│  ├──────────┼───────────┼──────────┼─────┤  │
│  │ ...      │ ...       │ ...      │     │  │
│  └──────────┴───────────┴──────────┴─────┘  │
│                                              │
└──────────────────────────────────────────────┘
```

## Layout — add farmer form

Multi-step or single-page form. Core fields first; optional fields clearly marked.

Required at minimum:

- Full name
- Community

Optional (capture when available):

- Ghana Card
- Age, gender, phone
- Household size, years farming

System-generated farmer ID shown after save (read-only).

## CSS approach

- Plain CSS or minimal utility classes
- CSS variables for colors and spacing
- No Tailwind gradient utilities, no animated backgrounds

## Field conditions

- Readable in direct sunlight (high contrast, no low-opacity text)
- Forms work without network spinners blocking input (offline-ready in phase 2)
