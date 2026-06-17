-- Gender and age for event attendees

ALTER TABLE event_attendees
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS age INTEGER;
