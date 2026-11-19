-- FarmerIQ database schema
-- Requires PostgreSQL 16+ and PostGIS

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ---------------------------------------------------------------------------
-- Offices
-- ---------------------------------------------------------------------------

CREATE TABLE offices (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  region     TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Users (agents, team leads, admins)
-- ---------------------------------------------------------------------------

CREATE TYPE user_role AS ENUM ('agent', 'team_lead', 'operations', 'admin');

CREATE TABLE users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 TEXT NOT NULL UNIQUE,
  password_hash         TEXT NOT NULL,
  full_name             TEXT NOT NULL,
  role                  user_role NOT NULL DEFAULT 'agent',
  office_id             UUID REFERENCES offices(id),
  can_access_operations BOOLEAN NOT NULL DEFAULT false,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  must_set_password     BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_users_office ON users(office_id);
CREATE INDEX idx_users_role ON users(role);

-- ---------------------------------------------------------------------------
-- Refresh tokens
-- ---------------------------------------------------------------------------

CREATE TABLE refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

-- ---------------------------------------------------------------------------
-- Farmers — system UUID is the primary key; Ghana Card is optional
-- ---------------------------------------------------------------------------

CREATE TABLE farmers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id        TEXT NOT NULL UNIQUE,
  ghana_card          TEXT,
  full_name           TEXT NOT NULL,
  gender              TEXT,
  date_of_birth       DATE,
  age                 SMALLINT,
  phone               TEXT,
  email               TEXT,
  region              TEXT,
  district            TEXT,
  community           TEXT NOT NULL,
  digital_address     TEXT,
  farm_address        TEXT,
  household_size      SMALLINT,
  farming_dependency  TEXT,
  years_farming       SMALLINT,
  primary_crops       TEXT[] NOT NULL DEFAULT '{}',
  bank_name           TEXT,
  bank_branch         TEXT,
  bank_account        TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}',
  created_by          UUID NOT NULL REFERENCES users(id),
  office_id           UUID REFERENCES offices(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_farmers_ghana_card ON farmers(ghana_card) WHERE ghana_card IS NOT NULL;
CREATE INDEX idx_farmers_reference_id ON farmers(reference_id);
CREATE INDEX idx_farmers_community ON farmers(community);
CREATE INDEX idx_farmers_created_by ON farmers(created_by);
CREATE INDEX idx_farmers_office ON farmers(office_id);

-- ---------------------------------------------------------------------------
-- Farmer photos (Ghana Card images, farmer portrait)
-- ---------------------------------------------------------------------------

CREATE TABLE farmer_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id   UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  photo_type  TEXT NOT NULL CHECK (photo_type IN ('ghana_card', 'portrait', 'farm')),
  file_name   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_farmer_photos_farmer ON farmer_photos(farmer_id);
CREATE INDEX idx_farmer_photos_type ON farmer_photos(farmer_id, photo_type);

-- ---------------------------------------------------------------------------
-- Farm plots (boundary filled in phase 2)
-- ---------------------------------------------------------------------------

CREATE TABLE farm_plots (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id           UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  boundary            GEOMETRY(Polygon, 4326),
  area_acres          NUMERIC(12, 4),
  area_hectares       NUMERIC(12, 4),
  gps_accuracy_notes  JSONB,
  created_by          UUID NOT NULL REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_farm_plots_farmer ON farm_plots(farmer_id);
CREATE INDEX idx_farm_plots_boundary ON farm_plots USING GIST(boundary);

-- ---------------------------------------------------------------------------
-- Crop cycles
-- ---------------------------------------------------------------------------

CREATE TABLE crop_cycles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id         UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  plot_id           UUID REFERENCES farm_plots(id) ON DELETE SET NULL,
  crop_type         TEXT NOT NULL,
  variety           TEXT,
  season            TEXT NOT NULL,
  planting_date     DATE,
  expected_harvest    DATE,
  actual_harvest    DATE,
  yield_outcome     TEXT,
  created_by        UUID NOT NULL REFERENCES users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crop_cycles_farmer ON crop_cycles(farmer_id);
CREATE INDEX idx_crop_cycles_plot ON crop_cycles(plot_id);

-- ---------------------------------------------------------------------------
-- Audit log (immutable)
-- ---------------------------------------------------------------------------

CREATE TABLE audit_log (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    UUID REFERENCES users(id),
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  changes     JSONB,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- ---------------------------------------------------------------------------
-- Conflict flags (phase 2)
-- ---------------------------------------------------------------------------

CREATE TABLE conflict_flags (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type  TEXT NOT NULL,
  entity_id    UUID NOT NULL,
  flag_type    TEXT NOT NULL,
  details      JSONB NOT NULL DEFAULT '{}',
  status       TEXT NOT NULL DEFAULT 'open',
  resolved_by  UUID REFERENCES users(id),
  resolved_at  TIMESTAMPTZ,
  reason       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conflict_flags_status ON conflict_flags(status);

-- ---------------------------------------------------------------------------
-- Submission records (compliance spine — who, when, device)
-- ---------------------------------------------------------------------------

CREATE TABLE submission_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  agent_id    UUID NOT NULL REFERENCES users(id),
  device_id   TEXT,
  captured_at TIMESTAMPTZ NOT NULL,
  synced_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_submission_records_entity ON submission_records(entity_type, entity_id);
CREATE INDEX idx_submission_records_agent ON submission_records(agent_id);
CREATE INDEX idx_submission_records_captured ON submission_records(captured_at DESC);

-- ---------------------------------------------------------------------------
-- Events & attendance
-- ---------------------------------------------------------------------------

CREATE TABLE events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  event_date  DATE NOT NULL,
  location    TEXT,
  community   TEXT,
  district    TEXT,
  mofa_officer TEXT,
  created_by  UUID NOT NULL REFERENCES users(id),
  office_id   UUID REFERENCES offices(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE event_attendees (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  phone       TEXT,
  community   TEXT,
  gender      TEXT,
  age         INTEGER,
  marked_by   UUID NOT NULL REFERENCES users(id),
  marked_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_events_event_date ON events(event_date DESC);
CREATE INDEX idx_event_attendees_event ON event_attendees(event_id);

-- ---------------------------------------------------------------------------
-- Aggregators
-- ---------------------------------------------------------------------------

CREATE TABLE aggregators (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id        TEXT NOT NULL UNIQUE,
  full_name           TEXT NOT NULL,
  age                 SMALLINT,
  phone               TEXT,
  town                TEXT,
  ghana_card          TEXT,
  business_name       TEXT,
  commodities         TEXT[] NOT NULL DEFAULT '{}',
  metadata            JSONB NOT NULL DEFAULT '{}',
  created_by          UUID NOT NULL REFERENCES users(id),
  office_id           UUID REFERENCES offices(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_aggregators_reference_id ON aggregators(reference_id);
CREATE INDEX idx_aggregators_ghana_card ON aggregators(ghana_card) WHERE ghana_card IS NOT NULL;
CREATE INDEX idx_aggregators_town ON aggregators(town);
CREATE INDEX idx_aggregators_created_by ON aggregators(created_by);
CREATE INDEX idx_aggregators_office ON aggregators(office_id);

-- ---------------------------------------------------------------------------
-- Aggregator photos (Ghana Card, portrait)
-- ---------------------------------------------------------------------------

CREATE TABLE aggregator_photos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregator_id   UUID NOT NULL REFERENCES aggregators(id) ON DELETE CASCADE,
  photo_type      TEXT NOT NULL CHECK (photo_type IN ('ghana_card', 'portrait')),
  file_name       TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_aggregator_photos_aggregator ON aggregator_photos(aggregator_id);
CREATE INDEX idx_aggregator_photos_type ON aggregator_photos(aggregator_id, photo_type);

-- ---------------------------------------------------------------------------
-- Offtakers & Offtaker photos
-- ---------------------------------------------------------------------------

CREATE TABLE offtakers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id      TEXT NOT NULL UNIQUE,
  company_name      TEXT NOT NULL,
  contact_person    TEXT,
  contact           TEXT,
  designation       TEXT,
  official_email    TEXT,
  target_products   TEXT[] NOT NULL DEFAULT '{}',
  payment_terms     TEXT,
  delivery_location TEXT,
  metadata          JSONB NOT NULL DEFAULT '{}',
  created_by        UUID NOT NULL,
  office_id         UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_offtakers_reference_id ON offtakers(reference_id);
CREATE INDEX idx_offtakers_official_email ON offtakers(official_email) WHERE official_email IS NOT NULL;
CREATE INDEX idx_offtakers_delivery_location ON offtakers(delivery_location);
CREATE INDEX idx_offtakers_created_by ON offtakers(created_by);
CREATE INDEX idx_offtakers_office ON offtakers(office_id);
CREATE INDEX idx_offtakers_deleted_at ON offtakers(deleted_at);

CREATE TABLE offtaker_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offtaker_id UUID NOT NULL REFERENCES offtakers(id) ON DELETE CASCADE,
  photo_type  TEXT NOT NULL CHECK (photo_type IN ('ghana_card', 'portrait')),
  file_name   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_offtaker_photos_offtaker ON offtaker_photos(offtaker_id);
CREATE INDEX idx_offtaker_photos_type ON offtaker_photos(offtaker_id, photo_type);

-- ---------------------------------------------------------------------------
-- Drivers
-- ---------------------------------------------------------------------------

CREATE TABLE drivers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id      TEXT,
  full_name         TEXT NOT NULL,
  phone             TEXT,
  license_number    TEXT,
  vehicle_type      TEXT,
  vehicle_plate     TEXT,
  assigned_location TEXT,
  status            TEXT NOT NULL DEFAULT 'active',
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  office_id         UUID REFERENCES offices(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ DEFAULT NULL
);

-- ---------------------------------------------------------------------------
-- Waybills & Waybill photos (Operations)
-- ---------------------------------------------------------------------------

CREATE TABLE waybills (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id        TEXT,
  waybill_number      TEXT NOT NULL,
  issued_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  status              TEXT NOT NULL DEFAULT 'in_transit' CHECK (status IN ('in_transit', 'delivered', 'cancelled')),
  offtaker_id         UUID REFERENCES offtakers(id) ON DELETE SET NULL,
  buyer_name          TEXT,
  aggregator_id       UUID REFERENCES aggregators(id) ON DELETE SET NULL,
  aggregator_name     TEXT,
  loading_location    TEXT,
  loading_region      TEXT,
  discharge_location  TEXT,
  product_name        TEXT,
  product_description TEXT,
  bag_count           INTEGER,
  bag_unit            TEXT DEFAULT 'Bags',
  weight_kg           NUMERIC(12, 2),
  received_weight_kg  NUMERIC(12, 2),
  driver_id           UUID,
  driver_name         TEXT,
  driver_phone        TEXT,
  truck_number        TEXT,
  notes               TEXT,
  created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
  office_id           UUID REFERENCES offices(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX idx_waybills_number ON waybills(waybill_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_waybills_reference_id ON waybills(reference_id);
CREATE INDEX idx_waybills_issued_date ON waybills(issued_date DESC);
CREATE INDEX idx_waybills_status ON waybills(status);
CREATE INDEX idx_waybills_offtaker ON waybills(offtaker_id);
CREATE INDEX idx_waybills_aggregator ON waybills(aggregator_id);
CREATE INDEX idx_waybills_deleted_at ON waybills(deleted_at);

CREATE TABLE waybill_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waybill_id  UUID NOT NULL REFERENCES waybills(id) ON DELETE CASCADE,
  photo_type  TEXT NOT NULL CHECK (photo_type IN ('truck', 'waybill_doc')),
  file_name   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_waybill_photos_waybill ON waybill_photos(waybill_id);
CREATE INDEX idx_waybill_photos_type ON waybill_photos(waybill_id, photo_type);

ALTER TABLE waybills ENABLE ROW LEVEL SECURITY;
ALTER TABLE waybill_photos ENABLE ROW LEVEL SECURITY;
