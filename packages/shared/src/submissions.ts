import { z } from "zod";

export const SubmissionMetadata = z.object({
  captured_at: z.string().min(1),
  device_id: z.string().min(1).max(128).optional(),
});
export type SubmissionMetadata = z.infer<typeof SubmissionMetadata>;

export interface SubmissionRecord {
  id: string;
  entity_type: string;
  entity_id: string;
  agent_id: string;
  device_id: string | null;
  captured_at: string;
  synced_at: string;
  created_at: string;
}
