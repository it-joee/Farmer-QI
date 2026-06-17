-- Event attendees: simple per-event records (not linked to farmers table)

DROP TABLE IF EXISTS event_attendance;

CREATE TABLE event_attendees (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  phone       TEXT,
  community   TEXT,
  marked_by   UUID NOT NULL REFERENCES users(id),
  marked_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_attendees_event ON event_attendees(event_id);
