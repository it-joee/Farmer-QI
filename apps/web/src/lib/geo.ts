import area from "@turf/area";
import { polygon } from "@turf/helpers";
import type { GpsPin } from "@farmeriq/shared";

const SQ_METERS_PER_ACRE = 4046.8564224;
const SQ_METERS_PER_HECTARE = 10000;

export function closeRing(coords: [number, number][]): [number, number][] {
  if (coords.length === 0) return coords;
  const first = coords[0];
  const last = coords[coords.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return coords;
  return [...coords, first];
}

export function pinsToPolygon(pins: GpsPin[]) {
  const ring = closeRing(pins.map((p) => [p.lng, p.lat] as [number, number]));
  return {
    type: "Polygon" as const,
    coordinates: [ring],
  };
}

export function calculateAreas(pins: GpsPin[]) {
  if (pins.length < 3) {
    return { area_acres: 0, area_hectares: 0 };
  }

  const poly = polygon([closeRing(pins.map((p) => [p.lng, p.lat] as [number, number]))]);
  const sqMeters = area(poly);
  const hectares = sqMeters / SQ_METERS_PER_HECTARE;
  const acres = sqMeters / SQ_METERS_PER_ACRE;

  return {
    area_acres: Math.round(acres * 10000) / 10000,
    area_hectares: Math.round(hectares * 10000) / 10000,
  };
}

export function accuracyLevel(meters: number): "good" | "fair" | "poor" {
  if (meters <= 10) return "good";
  if (meters <= 20) return "fair";
  return "poor";
}

export function accuracyLabel(meters: number) {
  const level = accuracyLevel(meters);
  if (level === "good") return `±${meters.toFixed(1)} m (good)`;
  if (level === "fair") return `±${meters.toFixed(1)} m (fair)`;
  return `±${meters.toFixed(1)} m (poor — move to open sky)`;
}

export function averageAccuracy(pins: GpsPin[]) {
  if (pins.length === 0) return 0;
  return pins.reduce((sum, pin) => sum + pin.accuracy, 0) / pins.length;
}
