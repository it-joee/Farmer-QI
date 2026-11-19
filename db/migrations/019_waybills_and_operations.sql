-- ---------------------------------------------------------------------------
-- 019: Operations Role, Access Toggle, Waybills & Waybill Photos
-- Safe to run multiple times (idempotent) in Supabase SQL Editor.
-- ---------------------------------------------------------------------------

-- 1. Add 'operations' value to user_role enum (if user_role enum exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'operations';
  END IF;
END $$;

-- If users.role uses a CHECK constraint instead of an enum, update it safely
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_role_check;
    ALTER TABLE users
      ADD CONSTRAINT users_role_check
      CHECK (role::text IN ('agent', 'team_lead', 'operations', 'admin'));
  END IF;
END $$;

-- 2. Add per-user operations access flag to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS can_access_operations BOOLEAN NOT NULL DEFAULT false;

-- Backfill: ensure existing admins have can_access_operations = true
UPDATE users
SET can_access_operations = true
WHERE role::text = 'admin' AND can_access_operations = false;

-- 3. Waybills table
CREATE TABLE IF NOT EXISTS waybills (
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

CREATE INDEX IF NOT EXISTS idx_waybills_number ON waybills(waybill_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_waybills_reference_id ON waybills(reference_id);
CREATE INDEX IF NOT EXISTS idx_waybills_issued_date ON waybills(issued_date DESC);
CREATE INDEX IF NOT EXISTS idx_waybills_status ON waybills(status);
CREATE INDEX IF NOT EXISTS idx_waybills_offtaker ON waybills(offtaker_id);
CREATE INDEX IF NOT EXISTS idx_waybills_aggregator ON waybills(aggregator_id);
CREATE INDEX IF NOT EXISTS idx_waybills_deleted_at ON waybills(deleted_at);

-- 4. Waybill photos (truck photos & waybill/weighbridge documents)
CREATE TABLE IF NOT EXISTS waybill_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waybill_id  UUID NOT NULL REFERENCES waybills(id) ON DELETE CASCADE,
  photo_type  TEXT NOT NULL CHECK (photo_type IN ('truck', 'waybill_doc')),
  file_name   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waybill_photos_waybill ON waybill_photos(waybill_id);
CREATE INDEX IF NOT EXISTS idx_waybill_photos_type ON waybill_photos(waybill_id, photo_type);

-- 5. Row Level Security (RLS)
-- Locks down direct Supabase PostgREST anon/authenticated client access while
-- allowing the FarmerIQ API (postgres connection & service_role) full access.
ALTER TABLE waybills ENABLE ROW LEVEL SECURITY;
ALTER TABLE waybill_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on waybills" ON waybills;
CREATE POLICY "Service role full access on waybills"
  ON waybills
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on waybill_photos" ON waybill_photos;
CREATE POLICY "Service role full access on waybill_photos"
  ON waybill_photos
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
