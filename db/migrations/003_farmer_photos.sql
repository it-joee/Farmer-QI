CREATE TABLE IF NOT EXISTS farmer_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id   UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  photo_type  TEXT NOT NULL CHECK (photo_type IN ('ghana_card', 'portrait')),
  file_name   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_farmer_photos_farmer ON farmer_photos(farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_photos_type ON farmer_photos(farmer_id, photo_type);
