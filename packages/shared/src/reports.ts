import { z } from "zod";

export const ReportFiltersSchema = z.object({
  region: z.string().optional(),
  district: z.string().optional(),
  commodity: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  created_by: z.string().uuid().optional(),
});

export type ReportFilters = z.infer<typeof ReportFiltersSchema>;

export interface ReportSummary {
  total_farmers: number;
  with_ghana_card: number;
  with_phone: number;
  with_boundary: number;
  open_conflicts: number;
  regions: number;
  districts: number;
}

export interface FarmerExportRow {
  id: string;
  reference_id?: string | null;
  full_name: string;
  ghana_card: string | null;
  phone: string | null;
  gender: string | null;
  community: string;
  district: string | null;
  region: string | null;
  primary_crops: string[];
  household_size: number | null;
  years_farming: number | null;
  farming_dependency: string | null;
  created_at: string;
  has_boundary: boolean;
}
