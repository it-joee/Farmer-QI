import { query } from "../db.js";

export async function recordSubmission(input: {
  entityType: string;
  entityId: string;
  agentId: string;
  capturedAt: string;
  deviceId?: string | null;
}) {
  await query(
    `INSERT INTO submission_records (entity_type, entity_id, agent_id, device_id, captured_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      input.entityType,
      input.entityId,
      input.agentId,
      input.deviceId?.trim() || null,
      input.capturedAt,
    ]
  );
}
