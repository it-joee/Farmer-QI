-- Supabase Storage bucket for farmer photos (Ghana Card + portrait).
-- Run in Supabase SQL Editor or via psql against your project.
-- Safe to run more than once.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'farmer-photos',
  'farmer-photos',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read for testing (Ghana Card images are sensitive — use a private bucket + signed URLs before production).
DROP POLICY IF EXISTS "Public read farmer photos" ON storage.objects;
CREATE POLICY "Public read farmer photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'farmer-photos');
