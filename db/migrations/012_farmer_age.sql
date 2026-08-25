-- Direct age field for farmers; backfill from date_of_birth if present.

ALTER TABLE farmers ADD COLUMN IF NOT EXISTS age SMALLINT;

UPDATE farmers
SET age = EXTRACT(YEAR FROM age(CURRENT_DATE, date_of_birth))::smallint
WHERE age IS NULL AND date_of_birth IS NOT NULL;
