-- Events and farmer attendance tracking

CREATE TABLE events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  event_date  DATE NOT NULL,
  location    TEXT,
  created_by  UUID NOT NULL REFERENCES users(id),
  office_id   UUID REFERENCES offices(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE event_attendance (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  farmer_id  UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  marked_by  UUID NOT NULL REFERENCES users(id),
  marked_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, farmer_id)
);

CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_events_event_date ON events(event_date DESC);
CREATE INDEX idx_event_attendance_event ON event_attendance(event_id);
CREATE INDEX idx_event_attendance_farmer ON event_attendance(farmer_id);
