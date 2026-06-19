import { z } from "zod";
import type { UserRole } from "./roles.js";

export * from "./roles.js";

export const LoginRequest = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginRequest = z.infer<typeof LoginRequest>;

export const GHANA_REGIONS = [
  "Ahafo",
  "Ashanti",
  "Bono",
  "Bono East",
  "Central",
  "Eastern",
  "Greater Accra",
  "North East",
  "Northern",
  "Oti",
  "Savannah",
  "Upper East",
  "Upper West",
  "Volta",
  "Western",
  "Western North",
] as const;

export const FARMING_DEPENDENCY_OPTIONS = [
  "Full-time farmer",
  "Part-time farmer",
  "Supplemental income",
] as const;

export const COMMODITIES = [
  "Shea",
  "Cashew",
  "Sorghum",
  "Soya",
  "Sesame",
  "Coffee",
  "Cocoa",
] as const;

/** @deprecated Use COMMODITIES */
export const GHANA_COMMODITIES = COMMODITIES;

export const OTHER_COMMODITY_OPTION = "Other";

export const CreateFarmerRequest = z.object({
  full_name: z.string().min(1),
  community: z.string().min(1),
  ghana_card: z.string().optional(),
  gender: z.string().optional(),
  date_of_birth: z.string().optional(),
  age: z.number().int().positive().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  household_size: z.number().int().positive().optional(),
  farming_dependency: z.string().optional(),
  years_farming: z.number().int().nonnegative().optional(),
  primary_crops: z.array(z.string()).optional(),
  region: z.string().optional(),
  district: z.string().optional(),
  digital_address: z.string().optional(),
  farm_address: z.string().optional(),
  bank_name: z.string().optional(),
  bank_branch: z.string().optional(),
  bank_account: z.string().optional(),
  captured_at: z.string().min(1).optional(),
  device_id: z.string().min(1).max(128).optional(),
  /** Stable offline queue id — server returns existing farmer on retry instead of inserting again. */
  client_local_id: z.string().min(1).max(128).optional(),
});
export type CreateFarmerRequest = z.infer<typeof CreateFarmerRequest>;

export const UpdateFarmerRequest = CreateFarmerRequest;
export type UpdateFarmerRequest = z.infer<typeof UpdateFarmerRequest>;

export interface StatBucket {
  label: string;
  count: number;
  percentage: number;
}

export interface DashboardOverview {
  totals: {
    farmers: number;
    this_month: number;
    districts: number;
    regions: number;
    with_ghana_card: number;
    with_phone: number;
    with_bank: number;
    with_commodities: number;
  };
  by_commodity: StatBucket[];
  by_district: StatBucket[];
  by_region: StatBucket[];
  by_gender: StatBucket[];
  by_farming_dependency: StatBucket[];
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  office_id: string | null;
}

export interface Farmer {
  id: string;
  reference_id?: string | null;
  ghana_card: string | null;
  full_name: string;
  age: number | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  community: string;
  region: string | null;
  district: string | null;
  digital_address: string | null;
  farm_address: string | null;
  household_size: number | null;
  farming_dependency: string | null;
  years_farming: number | null;
  date_of_birth: string | null;
  bank_name: string | null;
  bank_branch: string | null;
  bank_account: string | null;
  primary_crops: string[];
  created_by: string;
  office_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export type { FarmerPhoto, FarmerPhotoType } from "./photos.js";
export * from "./plots.js";
export * from "./crop-cycles.js";
export * from "./conflicts.js";
export * from "./reports.js";
export * from "./events.js";
export * from "./users.js";
export * from "./normalize.js";
export * from "./submissions.js";
export * from "./farmer-id.js";
