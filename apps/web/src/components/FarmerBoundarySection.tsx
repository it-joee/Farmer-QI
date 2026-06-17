import { useState } from "react";
import type { FarmPlotDetail, GpsPin } from "@farmeriq/shared";
import { getCurrentUser } from "../auth";
import { FarmBoundaryCapture } from "./FarmBoundaryCapture";
import { FarmBoundaryMap } from "./FarmBoundaryMap";
import { updateFarmPlot, uploadFarmPlot } from "../lib/plots";

interface FarmerBoundarySectionProps {
  farmerId: string;
  plots: FarmPlotDetail[];
  onUpdated: () => void;
}

export function FarmerBoundarySection({ farmerId, plots, onUpdated }: FarmerBoundarySectionProps) {
  const plot = plots[0] ?? null;
  const user = getCurrentUser();

  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pins, setPins] = useState<GpsPin[]>(plot?.gps_accuracy_notes ?? []);
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function startEdit() {
    setPins(plot?.gps_accuracy_notes ?? []);
    setEnabled(true);
    setEditing(true);
    setAdding(false);
    setError("");
  }

  function startAdd() {
    setPins([]);
    setEnabled(true);
    setAdding(true);
    setEditing(false);
    setError("");
  }

  function cancel() {
    setEditing(false);
    setAdding(false);
    setError("");
  }

  async function save() {
    if (!user) return;
    if (pins.length < 3) {
      setError("Drop at least 3 GPS points to define the farm boundary.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (plot) {
        await updateFarmPlot(farmerId, plot.id, pins, user.id);
      } else {
        await uploadFarmPlot(farmerId, pins, user.id);
      }
      setEditing(false);
      setAdding(false);
      onUpdated();
    } catch {
      setError("Could not save boundary. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const showCapture = editing || adding;
  const hasBoundary = plot?.boundary || (plot?.gps_accuracy_notes?.length ?? 0) >= 3;

  return (
    <section className="card">
      <div className="section-toolbar">
        <div>
          <h3 className="card-title">Farm boundary</h3>
          <p className="card-desc">GPS polygon for this farmer&apos;s plot</p>
        </div>
        {!showCapture && (
          <div className="section-toolbar__actions">
            {hasBoundary ? (
              <button type="button" className="btn btn-secondary" onClick={startEdit}>
                Edit boundary
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={startAdd}>
                Add boundary
              </button>
            )}
          </div>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {showCapture ? (
        <>
          <FarmBoundaryCapture
            enabled={enabled}
            onEnabledChange={setEnabled}
            pins={pins}
            onPinsChange={setPins}
            showToggle={false}
          />
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={cancel} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save boundary"}
            </button>
          </div>
        </>
      ) : hasBoundary ? (
        <>
          <FarmBoundaryMap boundary={plot?.boundary} pins={plot?.gps_accuracy_notes ?? []} />
          {plot && (
            <div className="boundary-summary">
              <p>
                <strong>{plot.area_acres ?? "—"}</strong> acres ·{" "}
                <strong>{plot.area_hectares ?? "—"}</strong> hectares
              </p>
              <p className="muted">
                {(plot.gps_accuracy_notes?.length ?? 0)} GPS point
                {(plot.gps_accuracy_notes?.length ?? 0) === 1 ? "" : "s"} recorded
              </p>
            </div>
          )}
        </>
      ) : (
        <p className="muted">No boundary captured yet.</p>
      )}
    </section>
  );
}
