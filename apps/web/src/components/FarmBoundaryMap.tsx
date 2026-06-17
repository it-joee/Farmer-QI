import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { GpsPin } from "@farmeriq/shared";
import { closeRing } from "../lib/geo";

const GHANA_CENTER: [number, number] = [-1.0232, 7.9465];

const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

interface FarmBoundaryMapProps {
  boundary?: {
    type: "Polygon";
    coordinates: number[][][];
  } | null;
  pins?: GpsPin[];
}

export function FarmBoundaryMap({ boundary, pins = [] }: FarmBoundaryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const center = pins[0]
      ? ([pins[0].lng, pins[0].lat] as [number, number])
      : boundary?.coordinates[0]?.[0]
        ? ([boundary.coordinates[0][0][0], boundary.coordinates[0][0][1]] as [number, number])
        : GHANA_CENTER;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center,
      zoom: pins.length || boundary ? 16 : 6,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const draw = () => {
      const sourceId = "farm-boundary-view";
      const lineId = "farm-boundary-view-line";
      const fillId = "farm-boundary-view-fill";

      if (map.getLayer(fillId)) map.removeLayer(fillId);
      if (map.getLayer(lineId)) map.removeLayer(lineId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);

      let geometry: GeoJSON.Geometry | null = null;

      if (boundary?.coordinates?.length) {
        geometry = boundary;
      } else if (pins.length >= 2) {
        const lineCoords = pins.map((p) => [p.lng, p.lat] as [number, number]);
        if (pins.length >= 3) {
          geometry = {
            type: "Polygon",
            coordinates: [closeRing(lineCoords)],
          };
        } else {
          geometry = { type: "LineString", coordinates: lineCoords };
        }
      }

      if (!geometry) return;

      map.addSource(sourceId, {
        type: "geojson",
        data: { type: "Feature", geometry, properties: {} },
      });

      map.addLayer({
        id: lineId,
        type: "line",
        source: sourceId,
        paint: { "line-color": "#8fd066", "line-width": 3 },
      });

      if (geometry.type === "Polygon") {
        map.addLayer({
          id: fillId,
          type: "fill",
          source: sourceId,
          paint: { "fill-color": "#b0ec80", "fill-opacity": 0.35 },
        });
      }

      const bounds = new maplibregl.LngLatBounds();
      const coords =
        geometry.type === "Polygon"
          ? geometry.coordinates[0]
          : geometry.coordinates;

      coords.forEach((coord) => bounds.extend([coord[0], coord[1]]));
      map.fitBounds(bounds, { padding: 48, maxZoom: 18, duration: 500 });
    };

    if (map.isStyleLoaded()) {
      draw();
    } else {
      map.once("load", draw);
    }
  }, [boundary, pins]);

  return <div ref={mapContainerRef} className="boundary-map" />;
}
