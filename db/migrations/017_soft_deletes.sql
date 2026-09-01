-- Add deleted_at to farmers
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_farmers_deleted_at ON farmers(deleted_at);

-- Add deleted_at to aggregators
ALTER TABLE aggregators ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_aggregators_deleted_at ON aggregators(deleted_at);

-- Add deleted_at to offtakers
ALTER TABLE offtakers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_offtakers_deleted_at ON offtakers(deleted_at);

-- Add deleted_at to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_events_deleted_at ON events(deleted_at);

-- Add deleted_at to event_attendees
ALTER TABLE event_attendees ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_event_attendees_deleted_at ON event_attendees(deleted_at);
