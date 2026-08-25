-- Standardize offices: Head Office in Accra and regional Field Offices.

UPDATE offices
SET name = 'Field', region = 'Ashanti'
WHERE id = '00000000-0000-0000-0000-000000000001';

INSERT INTO offices (id, name, region)
VALUES
  ('00000000-0000-0000-0000-000000000004', 'Head Office', 'Accra'),
  ('00000000-0000-0000-0000-000000000002', 'Field', 'Upper West'),
  ('00000000-0000-0000-0000-000000000003', 'Field', 'Techiman'),
  ('00000000-0000-0000-0000-000000000001', 'Field', 'Ashanti')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, region = EXCLUDED.region;
