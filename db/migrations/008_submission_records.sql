-- Submission metadata for synced field records

CREATE TABLE submission_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  agent_id    UUID NOT NULL REFERENCES users(id),
  device_id   TEXT,
  captured_at TIMESTAMPTZ NOT NULL,
  synced_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_submission_records_entity ON submission_records(entity_type, entity_id);
CREATE INDEX idx_submission_records_agent ON submission_records(agent_id);
CREATE INDEX idx_submission_records_captured ON submission_records(captured_at DESC);
