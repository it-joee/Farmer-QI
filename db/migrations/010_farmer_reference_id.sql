-- Short display reference for farmers (jni-fm-XXXXXXXXXX).
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS reference_id TEXT;

UPDATE farmers
SET reference_id = 'jni-fm-' || lower(substr(replace(id::text, '-', ''), 1, 10))
WHERE reference_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_farmers_reference_id ON farmers(reference_id);

ALTER TABLE farmers ALTER COLUMN reference_id SET NOT NULL;
