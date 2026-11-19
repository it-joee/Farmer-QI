-- Allow PDF uploads alongside images in the farmer-photos Supabase Storage bucket
-- so Waybill / Weighbridge documents (PDF or image) can be stored.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
WHERE id = 'farmer-photos';
