-- Offtakers and Offtaker Photos

CREATE TABLE IF NOT EXISTS offtakers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id        TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  contact TEXT,
  designation TEXT,
  official_email TEXT,
  target_products TEXT[] NOT NULL DEFAULT '{}',
  payment_terms TEXT,
  delivery_location TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}',
  created_by          UUID NOT NULL,
  office_id           UUID,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offtakers_reference_id ON offtakers(reference_id);
CREATE INDEX IF NOT EXISTS idx_offtakers_official_email ON offtakers(official_email) WHERE official_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_offtakers_delivery_location ON offtakers(delivery_location);
CREATE INDEX IF NOT EXISTS idx_offtakers_created_by ON offtakers(created_by);
CREATE INDEX IF NOT EXISTS idx_offtakers_office ON offtakers(office_id);

CREATE TABLE IF NOT EXISTS offtaker_photos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offtaker_id   UUID NOT NULL REFERENCES offtakers(id) ON DELETE CASCADE,
  photo_type      TEXT NOT NULL CHECK (photo_type IN ('ghana_card', 'portrait')),
  file_name       TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offtaker_photos_offtaker ON offtaker_photos(offtaker_id);
CREATE INDEX IF NOT EXISTS idx_offtaker_photos_type ON offtaker_photos(offtaker_id, photo_type);
