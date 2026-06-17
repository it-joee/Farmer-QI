import { z } from "zod";

export const SEASON_EXAMPLES = ["2025 Major", "2025 Minor", "2026 Major"] as const;

export const CreateCropCycleRequest = z.object({
  plot_id: z.string().uuid().nullable().optional(),
  crop_type: z.string().min(1),
  variety: z.string().optional(),
  season: z.string().min(1),
  planting_date: z.string().optional(),
  expected_harvest: z.string().optional(),
  actual_harvest: z.string().optional(),
  yield_outcome: z.string().optional(),
});

export type CreateCropCycleRequest = z.infer<typeof CreateCropCycleRequest>;

export interface CropCycle {
  id: string;
  farmer_id: string;
  plot_id: string | null;
  crop_type: string;
  variety: string | null;
  season: string;
  planting_date: string | null;
  expected_harvest: string | null;
  actual_harvest: string | null;
  yield_outcome: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}
