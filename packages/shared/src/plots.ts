import { z } from "zod";

export const GpsPinSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  accuracy: z.number(),
  captured_at: z.string(),
});

export type GpsPin = z.infer<typeof GpsPinSchema>;

export const GeoJsonPolygonSchema = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(z.array(z.tuple([z.number(), z.number()]))),
});

export const CreatePlotRequest = z.object({
  boundary: GeoJsonPolygonSchema,
  area_acres: z.number().positive(),
  area_hectares: z.number().positive(),
  gps_accuracy_notes: z.array(GpsPinSchema),
});

export type CreatePlotRequest = z.infer<typeof CreatePlotRequest>;

export interface FarmPlot {
  id: string;
  farmer_id: string;
  area_acres: number | null;
  area_hectares: number | null;
  gps_accuracy_notes: GpsPin[] | null;
  created_at: string;
}

export interface FarmPlotDetail extends FarmPlot {
  boundary: {
    type: "Polygon";
    coordinates: number[][][];
  } | null;
}
