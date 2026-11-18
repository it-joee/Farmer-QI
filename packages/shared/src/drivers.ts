import { z } from "zod";

export const VEHICLE_TYPES = [
  "Truck",
  "Pickup",
  "Cargo Van",
  "Tricycle (Aboboyaa)",
  "Motorbike",
] as const;

export const DriverStatus = z.enum(["active", "inactive"]);
export type DriverStatus = z.infer<typeof DriverStatus>;

export const CreateDriverRequest = z.object({
  full_name: z.string().trim().min(1, "Full name is required"),
  phone: z.string().optional().nullable(),
  license_number: z.string().optional().nullable(),
  vehicle_type: z.string().optional().nullable(),
  vehicle_plate: z.string().optional().nullable(),
  assigned_location: z.string().optional().nullable(),
  status: DriverStatus.optional().default("active"),
});
export type CreateDriverRequest = z.infer<typeof CreateDriverRequest>;

export const UpdateDriverRequest = CreateDriverRequest;
export type UpdateDriverRequest = z.infer<typeof UpdateDriverRequest>;

export interface Driver {
  id: string;
  reference_id?: string | null;
  full_name: string;
  phone: string | null;
  license_number: string | null;
  vehicle_type: string | null;
  vehicle_plate: string | null;
  assigned_location: string | null;
  status: DriverStatus;
  created_by: string | null;
  created_by_name?: string | null;
  office_id: string | null;
  created_at: string;
  updated_at: string;
}

const DRIVER_REF_PREFIX = "jni-dr-";

function hashSuffix(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return String(hash % 1_000_000_000).padStart(9, "0");
}

export function createDriverReferenceId(): string {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-10);
  return `${DRIVER_REF_PREFIX}${suffix}`;
}

export function formatDriverReferenceId(id: string): string {
  if (id.startsWith(DRIVER_REF_PREFIX)) return id;
  return `${DRIVER_REF_PREFIX}${hashSuffix(id)}`;
}

export function getDriverDisplayId(driver: {
  id: string;
  reference_id?: string | null;
}): string {
  return driver.reference_id?.trim() || formatDriverReferenceId(driver.id);
}
