# Data model

## Identity rules

### Farmer ID

- Every farmer gets a **system-generated UUID** at creation. This is the **primary key**.
- The UUID is always present. It cannot collide across agents or offices.
- Farmers **without** a Ghana Card are fully supported. Registration is never blocked.

### Ghana Card

- **Optional** field, not a unique constraint.
- When provided, indexed for duplicate **flagging** (not hard rejection).
- Multiple records with the same Ghana Card should raise a conflict for team lead review.

### Deduplication strategy

| Signal | Use |
|--------|-----|
| System UUID | Authoritative primary key — no duplicates by design |
| Ghana Card (if present) | Soft match → flag for review |
| Name + community + phone | Soft match → flag for review |

## Entities

### User

Field agents, team leads, and admins.

| Field | Notes |
|-------|-------|
| `id` | UUID, primary key |
| `email` | Login identifier |
| `password_hash` | Argon2id |
| `full_name` | Display name |
| `role` | `agent` \| `team_lead` \| `admin` |
| `office_id` | Links agent to a field office |
| `is_active` | Soft disable without deleting history |

### Office

Field office or regional unit. Agents belong to one office.

| Field | Notes |
|-------|-------|
| `id` | UUID |
| `name` | e.g. "Kumasi North Field Office" |
| `region` | Administrative region |

### Farmer

Central record. Grows richer over multiple visits.

| Field | Notes |
|-------|-------|
| `id` | UUID, system-generated, **primary key** |
| `ghana_card` | Optional |
| `full_name` | Required |
| `age` | Optional |
| `gender` | Optional |
| `phone` | Optional |
| `community` | Village / community name |
| `household_size` | Optional |
| `farming_dependency` | Optional |
| `years_farming` | Optional |
| `created_by` | User ID of registering agent |
| `office_id` | Office at time of registration |

Additional profile fields can be added over time without changing the primary key.

### Farm plot

One contiguous piece of land belonging to a farmer.

| Field | Notes |
|-------|-------|
| `id` | UUID |
| `farmer_id` | FK → farmers |
| `boundary` | PostGIS polygon (phase 2) |
| `area_acres` | Calculated from polygon |
| `area_hectares` | Calculated from polygon |
| `gps_accuracy_notes` | Per-pin confidence metadata (phase 2) |

A farmer may have multiple plots.

### Crop cycle

Crop planted on a plot in a given season.

| Field | Notes |
|-------|-------|
| `id` | UUID |
| `farmer_id` | FK → farmers |
| `plot_id` | FK → farm_plots |
| `crop_type` | e.g. cocoa, maize |
| `variety` | Optional |
| `season` | e.g. 2025 main season |
| `planting_date` | Optional |
| `expected_harvest` | Optional |
| `actual_harvest` | Optional |
| `yield_outcome` | Optional |

### Submission record

Metadata for every field submission. Compliance spine.

| Field | Notes |
|-------|-------|
| `id` | UUID |
| `entity_type` | farmer, plot, crop_cycle |
| `entity_id` | FK to entity |
| `agent_id` | Submitting user |
| `device_id` | Browser/device fingerprint (phase 2) |
| `captured_at` | When agent saved locally |
| `synced_at` | When record reached server |

### Audit log

Immutable. Every create, update, conflict resolution.

| Field | Notes |
|-------|-------|
| `id` | Big serial |
| `actor_id` | User or null for system |
| `action` | create, update, merge, discard |
| `entity_type` | |
| `entity_id` | |
| `changes` | JSON diff |
| `reason` | Required for merge/discard |
| `created_at` | UTC timestamp |

## Relationships

```
Office ──< User (agent | team_lead | admin)
User ──< Farmer (created_by)
Farmer ──< FarmPlot
FarmPlot ──< CropCycle
Farmer ──< CropCycle
```

## Extensibility

New farmer profile fields should be added as nullable columns or a `metadata JSONB` column on `farmers`. The intake form reads field definitions from a config so the UI can grow without a full redesign.
