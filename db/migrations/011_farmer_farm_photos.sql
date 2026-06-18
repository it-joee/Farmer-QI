-- Allow farm photos in farmer_photos (schema.sql already includes farm for fresh installs).

ALTER TABLE farmer_photos DROP CONSTRAINT IF EXISTS farmer_photos_photo_type_check;
ALTER TABLE farmer_photos
  ADD CONSTRAINT farmer_photos_photo_type_check
  CHECK (photo_type IN ('ghana_card', 'portrait', 'farm'));
