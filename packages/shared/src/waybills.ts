import { z } from "zod";

export const WaybillStatus = z.enum(["in_transit", "delivered", "cancelled"]);
export type WaybillStatus = z.infer<typeof WaybillStatus>;

export const BAG_UNITS = ["Bags", "Jute Bags", "PP Bags", "Sacks", "Boxes"] as const;

export const CreateWaybillRequest = z.object({
  waybill_number: z.string().trim().min(1, "Waybill number is required"),
  issued_date: z.string().trim().min(1, "Date of issuance is required"),
  status: WaybillStatus.optional().default("in_transit"),
  offtaker_id: z.string().uuid().optional().nullable(),
  buyer_name: z.string().optional().nullable(),
  aggregator_id: z.string().uuid().optional().nullable(),
  aggregator_name: z.string().optional().nullable(),
  loading_location: z.string().optional().nullable(),
  loading_region: z.string().optional().nullable(),
  discharge_location: z.string().optional().nullable(),
  product_name: z.string().optional().nullable(),
  product_description: z.string().optional().nullable(),
  bag_count: z.number().int().nonnegative().optional().nullable(),
  bag_unit: z.string().optional().nullable(),
  weight_kg: z.number().nonnegative().optional().nullable(),
  received_weight_kg: z.number().nonnegative().optional().nullable(),
  driver_id: z.string().uuid().optional().nullable(),
  driver_name: z.string().optional().nullable(),
  driver_phone: z.string().optional().nullable(),
  truck_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type CreateWaybillRequest = z.infer<typeof CreateWaybillRequest>;

export const UpdateWaybillRequest = CreateWaybillRequest;
export type UpdateWaybillRequest = z.infer<typeof UpdateWaybillRequest>;

export type WaybillPhotoType = "truck" | "waybill_doc";

export interface WaybillPhoto {
  id: string;
  waybill_id: string;
  photo_type: WaybillPhotoType;
  file_name: string;
  url: string;
  created_at: string;
}

export interface Waybill {
  id: string;
  reference_id?: string | null;
  waybill_number: string;
  issued_date: string;
  status: WaybillStatus;
  offtaker_id: string | null;
  buyer_name: string | null;
  aggregator_id: string | null;
  aggregator_name: string | null;
  loading_location: string | null;
  loading_region: string | null;
  discharge_location: string | null;
  product_name: string | null;
  product_description: string | null;
  bag_count: number | null;
  bag_unit: string | null;
  weight_kg: number | null;
  received_weight_kg: number | null;
  driver_id: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  truck_number: string | null;
  notes: string | null;
  created_by: string | null;
  created_by_name?: string | null;
  office_id: string | null;
  created_at: string;
  updated_at: string;
  truck_photo_count?: number;
  doc_photo_count?: number;
  open_conflict_count?: number;
}

export interface WaybillConflictWarning {
  type:
    | "duplicate_waybill_number"
    | "duplicate_waybill_dispatch"
    | "duplicate_waybill_load"
    | "waybill_weight_discrepancy"
    | "ai_data_check";
  message: string;
  matching_waybill_id?: string;
  matching_waybill_number?: string;
  matching_date?: string;
  matching_buyer?: string | null;
  matching_truck?: string | null;
  matching_weight_kg?: number | null;
}

export interface WaybillConflictCheckResponse {
  duplicate_number: WaybillConflictWarning | null;
  warnings: WaybillConflictWarning[];
}

export interface WaybillSummary {
  total_waybills: number;
  in_transit_count: number;
  delivered_count: number;
  cancelled_count: number;
  total_bags: number;
  total_weight_kg: number;
  total_weight_tons: number;
  total_received_weight_kg: number;
}

const WAYBILL_REF_PREFIX = "jni-wb-";

function hashSuffix(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return String(hash % 1_000_000_000).padStart(9, "0");
}

export function createWaybillReferenceId(): string {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-10);
  return `${WAYBILL_REF_PREFIX}${suffix}`;
}

export function formatWaybillReferenceId(id: string): string {
  if (id.startsWith(WAYBILL_REF_PREFIX)) return id;
  return `${WAYBILL_REF_PREFIX}${hashSuffix(id)}`;
}

export function getWaybillDisplayId(waybill: {
  id: string;
  reference_id?: string | null;
}): string {
  return waybill.reference_id?.trim() || formatWaybillReferenceId(waybill.id);
}
