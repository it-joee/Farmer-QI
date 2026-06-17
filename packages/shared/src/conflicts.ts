import { z } from "zod";

export const CONFLICT_FLAG_TYPES = [
  "duplicate_ghana_card",
  "duplicate_profile",
  "boundary_overlap",
] as const;
export type ConflictFlagType = (typeof CONFLICT_FLAG_TYPES)[number];

export const CONFLICT_STATUSES = ["open", "resolved", "dismissed"] as const;
export type ConflictStatus = (typeof CONFLICT_STATUSES)[number];

export interface ConflictFlag {
  id: string;
  entity_type: string;
  entity_id: string;
  flag_type: ConflictFlagType;
  details: Record<string, unknown>;
  status: ConflictStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  reason: string | null;
  created_at: string;
}

export interface ConflictFlagWithFarmer extends ConflictFlag {
  farmer_name?: string;
  farmer_id?: string;
}

export const ResolveConflictRequest = z.object({
  status: z.enum(["resolved", "dismissed"]),
  reason: z.string().min(1).optional(),
  resolved_by: z.string().uuid().optional(),
});
export type ResolveConflictRequest = z.infer<typeof ResolveConflictRequest>;
