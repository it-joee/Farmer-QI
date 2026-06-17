-- Event location details and MoFA officer

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS community TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS mofa_officer TEXT;
