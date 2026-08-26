-- Aggregators and Aggregator Photos

CREATE TABLE IF NOT EXISTS aggregators (
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
  created_by          UUID NOT NULL,
  office_id           UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aggregators_reference_id ON aggregators(reference_id);
CREATE INDEX IF NOT EXISTS idx_aggregators_ghana_card ON aggregators(ghana_card) WHERE ghana_card IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aggregators_town ON aggregators(town);
CREATE INDEX IF NOT EXISTS idx_aggregators_created_by ON aggregators(created_by);
CREATE INDEX IF NOT EXISTS idx_aggregators_office ON aggregators(office_id);

CREATE TABLE IF NOT EXISTS aggregator_photos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregator_id   UUID NOT NULL REFERENCES aggregators(id) ON DELETE CASCADE,
  photo_type      TEXT NOT NULL CHECK (photo_type IN ('ghana_card', 'portrait')),
  file_name       TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aggregator_photos_aggregator ON aggregator_photos(aggregator_id);
CREATE INDEX IF NOT EXISTS idx_aggregator_photos_type ON aggregator_photos(aggregator_id, photo_type);
