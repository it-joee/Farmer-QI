-- Seed data for local development
-- Default password: changeme123 (replace hash before production)

INSERT INTO offices (id, name, region)
VALUES ('00000000-0000-0000-0000-000000000001', 'Pilot Field Office', 'Ashanti')
ON CONFLICT DO NOTHING;

-- Generate a real Argon2id hash with: npm run seed:hash -w @farmeriq/api
-- Placeholder hash below — replace after running seed script
INSERT INTO users (id, email, password_hash, full_name, role, office_id)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  'agent@farmeriq.local',
  '$argon2id$v=19$m=65536,t=3,p=4$REPLACE_ME',
  'Pilot Agent',
  'agent',
  '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, email, password_hash, full_name, role, office_id)
VALUES (
  '00000000-0000-0000-0000-000000000011',
  'lead@farmeriq.local',
  '$argon2id$v=19$m=65536,t=3,p=4$REPLACE_ME',
  'Pilot Team Lead',
  'team_lead',
  '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, email, password_hash, full_name, role, office_id)
VALUES (
  '00000000-0000-0000-0000-000000000012',
  'admin@farmeriq.local',
  '$argon2id$v=19$m=65536,t=3,p=4$REPLACE_ME',
  'System Admin',
  'admin',
  NULL
)
ON CONFLICT (email) DO NOTHING;
