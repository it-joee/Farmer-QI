-- Remove legacy seeded pilot/admin users that have no dependent records,
-- and ensure must_set_password defaults to true for newly created users.

ALTER TABLE users ALTER COLUMN must_set_password SET DEFAULT true;

DELETE FROM users
WHERE id IN (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000011'
)
OR email IN (
  'pilot.agent@jniagri.ag',
  'pilot.lead@jniagri.ag',
  'agent@farmeriq.local',
  'lead@farmeriq.local',
  'admin@farmeriq.local'
);

