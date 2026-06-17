import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { GpsPin } from "@farmeriq/shared";
import {
  accuracyLabel,
  accuracyLevel,
  averageAccuracy,
  calculateAreas,
  closeRing,
} from "../lib/geo";

interface FarmBoundaryCaptureProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  pins: GpsPin[];
  onPinsChange: (pins: GpsPin[]) => void;
  showToggle?: boolean;
}

interface LivePosition {
  lat: number;
  lng: number;
  accuracy: number;
}

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

export function FarmBoundaryCapture({
  enabled,
  onEnabledChange,
  pins,
  onPinsChange,
  showToggle = true,
}: FarmBoundaryCaptureProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const [livePosition, setLivePosition] = useState<LivePosition | null>(null);
  const [gpsError, setGpsError] = useState("");
  const [watching, setWatching] = useState(false);

  useEffect(() => {
    if (!enabled || !mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center: pins[0] ? [pins[0].lng, pins[0].lat] : GHANA_CENTER,
      zoom: pins[0] ? 16 : 6,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    if (!navigator.geolocation) {
      setGpsError("GPS is not available on this device.");
      return;
    }

    setWatching(true);
    setGpsError("");

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setLivePosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setGpsError("");
      },
      () => {
        setGpsError("Could not read GPS. Enable location access and try again.");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      setWatching(false);
    };
  }, [enabled]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !enabled) return;

    const draw = () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      pins.forEach((pin, index) => {
        const marker = new maplibregl.Marker({ color: "#8fd066" })
          .setLngLat([pin.lng, pin.lat])
          .setPopup(new maplibregl.Popup().setText(`Point ${index + 1} · ${accuracyLabel(pin.accuracy)}`))
          .addTo(map);
        markersRef.current.push(marker);
      });

      const sourceId = "farm-boundary";
      const lineId = "farm-boundary-line";
      const fillId = "farm-boundary-fill";

      if (map.getLayer(fillId)) map.removeLayer(fillId);
      if (map.getLayer(lineId)) map.removeLayer(lineId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);

      if (pins.length >= 2) {
        const lineCoords = pins.map((p) => [p.lng, p.lat] as [number, number]);
        if (pins.length >= 3) lineCoords.push([pins[0].lng, pins[0].lat]);

        map.addSource(sourceId, {
          type: "geojson",
          data: {
            type: "Feature",
            geometry:
              pins.length >= 3
                ? { type: "Polygon", coordinates: [closeRing(pins.map((p) => [p.lng, p.lat] as [number, number]))] }
                : { type: "LineString", coordinates: lineCoords },
            properties: {},
          },
        });

        map.addLayer({
          id: lineId,
          type: "line",
          source: sourceId,
          paint: { "line-color": "#8fd066", "line-width": 3 },
        });

        if (pins.length >= 3) {
          map.addLayer({
            id: fillId,
            type: "fill",
            source: sourceId,
            paint: { "fill-color": "#b0ec80", "fill-opacity": 0.35 },
          });
        }
      }

      if (pins.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        pins.forEach((p) => bounds.extend([p.lng, p.lat]));
        map.fitBounds(bounds, { padding: 48, maxZoom: 18, duration: 500 });
      }
    };

    if (map.isStyleLoaded()) {
      draw();
    } else {
      map.once("load", draw);
    }
  }, [pins, enabled]);

  function dropPin() {
    if (!livePosition) {
      setGpsError("Waiting for GPS fix. Stand in open sky and try again.");
      return;
    }

    if (livePosition.accuracy > 30) {
      const proceed = window.confirm(
        `GPS accuracy is ±${livePosition.accuracy.toFixed(1)} m, which is low. Drop this point anyway?`
      );
      if (!proceed) return;
    }

    const pin: GpsPin = {
      lat: livePosition.lat,
      lng: livePosition.lng,
      accuracy: livePosition.accuracy,
      captured_at: new Date().toISOString(),
    };

    onPinsChange([...pins, pin]);
  }

  function undoLast() {
    onPinsChange(pins.slice(0, -1));
  }

  function clearAll() {
    onPinsChange([]);
  }

  const areas = pins.length >= 3 ? calculateAreas(pins) : null;
  const avgAccuracy = averageAccuracy(pins);
  const liveLevel = livePosition ? accuracyLevel(livePosition.accuracy) : null;

  return (
    <div className="boundary-capture">
      {showToggle && (
        <label className="boundary-capture__toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
          />
          Capture farm boundary now (optional)
        </label>
      )}

      {(showToggle ? enabled : true) && (
        <>
          <p className="field-hint">
            Walk the farm perimeter. At each corner or boundary change, stand still and drop a GPS point.
          </p>

          <div className="boundary-capture__status">
            <div>
              <strong>GPS status:</strong>{" "}
              {watching ? (livePosition ? "Active" : "Searching for signal…") : "Off"}
            </div>
            {livePosition && (
              <div className={`boundary-accuracy boundary-accuracy--${liveLevel}`}>
                Current accuracy: {accuracyLabel(livePosition.accuracy)}
              </div>
            )}
            {gpsError && <p className="error">{gpsError}</p>}
          </div>

          <div ref={mapContainerRef} className="boundary-map" />

          <div className="boundary-capture__actions">
            <button type="button" className="btn btn-primary" onClick={dropPin} disabled={!livePosition}>
              Drop GPS point
            </button>
            <button type="button" className="btn btn-secondary" onClick={undoLast} disabled={pins.length === 0}>
              Undo last
            </button>
            <button type="button" className="btn btn-secondary" onClick={clearAll} disabled={pins.length === 0}>
              Clear all
            </button>
          </div>

          {pins.length > 0 && (
            <div className="boundary-points card">
              <h4 className="card-title">GPS points ({pins.length})</h4>
              <ul className="boundary-points__list">
                {pins.map((pin, index) => (
                  <li key={`${pin.captured_at}-${index}`}>
                    Point {index + 1}: {pin.lat.toFixed(6)}, {pin.lng.toFixed(6)} ·{" "}
                    {accuracyLabel(pin.accuracy)}
                  </li>
                ))}
              </ul>
              {pins.length < 3 && (
                <p className="field-hint">Drop at least 3 points to close the boundary.</p>
              )}
            </div>
          )}

          {areas && (
            <div className="boundary-summary card">
              <h4 className="card-title">Calculated farm size</h4>
              <p>
                <strong>{areas.area_acres}</strong> acres · <strong>{areas.area_hectares}</strong> hectares
              </p>
              <p className="field-hint">
                Average GPS accuracy: {accuracyLabel(avgAccuracy)}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
