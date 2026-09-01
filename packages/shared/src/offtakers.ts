import { z } from "zod";

export const CreateOfftakerRequest = z.object({
  company_name: z.string().min(1, "Company name is required"),
  contact_person: z.string().min(1, "Contact person is required"),
  contact: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
  official_email: z.string().email().optional().nullable(),
  target_products: z.array(z.string()).optional().default([]),
  payment_terms: z.string().optional().nullable(),
  delivery_location: z.string().optional().nullable(),
  captured_at: z.string().min(1).optional(),
  device_id: z.string().min(1).max(128).optional(),
  client_local_id: z.string().min(1).max(128).optional(),
});
export type CreateOfftakerRequest = z.infer<typeof CreateOfftakerRequest>;

export const UpdateOfftakerRequest = CreateOfftakerRequest;
export type UpdateOfftakerRequest = z.infer<typeof UpdateOfftakerRequest>;

export type OfftakerPhotoType = "ghana_card" | "portrait";

export interface OfftakerPhoto {
  id: string;
  offtaker_id: string;
  photo_type: OfftakerPhotoType;
  file_name: string;
  url: string;
  created_at: string;
}

export interface Offtaker {
  id: string;
  reference_id?: string | null;
  company_name: string;
  contact_person: string;
  contact: string | null;
  designation: string | null;
  official_email: string | null;
  target_products: string[];
  payment_terms: string | null;
  delivery_location: string | null;
  created_by: string;
  office_id: string | null;
  created_at: string;
  updated_at: string;
}

const OFFTAKER_REF_PREFIX = "jni-ag-";

function hashSuffix(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return String(hash % 1_000_000_000).padStart(9, "0");
}

export function createOfftakerReferenceId(): string {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-10);
  return `${OFFTAKER_REF_PREFIX}${suffix}`;
}

export function formatOfftakerReferenceId(id: string): string {
  if (id.startsWith(OFFTAKER_REF_PREFIX)) return id;
  return `${OFFTAKER_REF_PREFIX}${hashSuffix(id)}`;
}

export function getOfftakerDisplayId(offtaker: {
  id: string;
  reference_id?: string | null;
}): string {
  return offtaker.reference_id?.trim() || formatOfftakerReferenceId(offtaker.id);
}
