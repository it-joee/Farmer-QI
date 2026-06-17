-- Run on existing databases created before multi-step farmer fields were added

ALTER TABLE farmers ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS digital_address TEXT;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS farm_address TEXT;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS bank_branch TEXT;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS bank_account TEXT;
