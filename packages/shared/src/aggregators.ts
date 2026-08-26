import { z } from "zod";

export const CreateAggregatorRequest = z.object({
  full_name: z.string().min(1, "Full name is required"),
  age: z.number().int().positive().optional().nullable(),
  phone: z.string().optional().nullable(),
  town: z.string().optional().nullable(),
  ghana_card: z.string().optional().nullable(),
  business_name: z.string().optional().nullable(),
  commodities: z.array(z.string()).optional().default([]),
  captured_at: z.string().min(1).optional(),
  device_id: z.string().min(1).max(128).optional(),
  client_local_id: z.string().min(1).max(128).optional(),
});
export type CreateAggregatorRequest = z.infer<typeof CreateAggregatorRequest>;

export const UpdateAggregatorRequest = CreateAggregatorRequest;
export type UpdateAggregatorRequest = z.infer<typeof UpdateAggregatorRequest>;

export type AggregatorPhotoType = "ghana_card" | "portrait";

export interface AggregatorPhoto {
  id: string;
  aggregator_id: string;
  photo_type: AggregatorPhotoType;
  file_name: string;
  url: string;
  created_at: string;
}

export interface Aggregator {
  id: string;
  reference_id?: string | null;
  full_name: string;
  age: number | null;
  phone: string | null;
  town: string | null;
  ghana_card: string | null;
  business_name: string | null;
  commodities: string[];
  created_by: string;
  office_id: string | null;
  created_at: string;
  updated_at: string;
}

const AGGREGATOR_REF_PREFIX = "jni-ag-";

function hashSuffix(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return String(hash % 1_000_000_000).padStart(9, "0");
}

export function createAggregatorReferenceId(): string {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-10);
  return `${AGGREGATOR_REF_PREFIX}${suffix}`;
}

export function formatAggregatorReferenceId(id: string): string {
  if (id.startsWith(AGGREGATOR_REF_PREFIX)) return id;
  return `${AGGREGATOR_REF_PREFIX}${hashSuffix(id)}`;
}

export function getAggregatorDisplayId(aggregator: {
  id: string;
  reference_id?: string | null;
}): string {
  return aggregator.reference_id?.trim() || formatAggregatorReferenceId(aggregator.id);
}
