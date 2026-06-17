import type { CreateCropCycleRequest, CropCycle, FarmPlotDetail } from "@farmeriq/shared";
import { COMMODITIES, SEASON_EXAMPLES } from "@farmeriq/shared";
import { FormEvent, useState } from "react";
import { DateField } from "./fields/DateField";
import { SelectField } from "./fields/SelectField";
import { getCurrentUser } from "../auth";
import { createCropCycle } from "../lib/crop-cycles";

interface CropCycleSectionProps {
  farmerId: string;
  plots: FarmPlotDetail[];
  cropCycles: CropCycle[];
  onUpdated: () => void;
}

const EMPTY_FORM = {
  crop_type: "",
  variety: "",
  season: "",
  plot_id: "",
  planting_date: "",
  expected_harvest: "",
  actual_harvest: "",
  yield_outcome: "",
};

export function CropCycleSection({ farmerId, plots, cropCycles, onUpdated }: CropCycleSectionProps) {
  const user = getCurrentUser();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;

    if (!form.crop_type || !form.season) {
      setError("Crop and season are required.");
      return;
    }

    setSaving(true);
    setError("");

    const payload: CreateCropCycleRequest & { created_by: string } = {
      crop_type: form.crop_type,
      season: form.season,
      created_by: user.id,
    };

    if (form.variety) payload.variety = form.variety;
    if (form.plot_id) payload.plot_id = form.plot_id;
    if (form.planting_date) payload.planting_date = form.planting_date;
    if (form.expected_harvest) payload.expected_harvest = form.expected_harvest;
    if (form.actual_harvest) payload.actual_harvest = form.actual_harvest;
    if (form.yield_outcome) payload.yield_outcome = form.yield_outcome;

    try {
      await createCropCycle(farmerId, payload);
      setForm(EMPTY_FORM);
      setShowForm(false);
      onUpdated();
    } catch {
      setError("Could not save crop cycle.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card">
      <div className="section-toolbar">
        <div>
          <h3 className="card-title">Crop cycles</h3>
          <p className="card-desc">Planting and harvest history per season</p>
        </div>
        {!showForm && (
          <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Log crop cycle
          </button>
        )}
      </div>

      {showForm && (
        <form className="crop-cycle-form" onSubmit={handleSubmit}>
          {error && <p className="error">{error}</p>}
          <div className="form-grid form-grid--2">
            <div className="form-group">
              <label htmlFor="crop_type">Crop</label>
              <SelectField
                id="crop_type"
                value={form.crop_type}
                onChange={(value) => setForm((f) => ({ ...f, crop_type: value }))}
                placeholder="Select"
                required
                options={[
                  { value: "", label: "Select" },
                  ...COMMODITIES.map((crop) => ({ value: crop, label: crop })),
                ]}
              />
            </div>
            <div className="form-group">
              <label htmlFor="season">Season</label>
              <input
                id="season"
                list="season-examples"
                value={form.season}
                onChange={(e) => setForm((f) => ({ ...f, season: e.target.value }))}
                placeholder="e.g. 2025 Major"
                required
              />
              <datalist id="season-examples">
                {SEASON_EXAMPLES.map((season) => (
                  <option key={season} value={season} />
                ))}
              </datalist>
            </div>
            <div className="form-group">
              <label htmlFor="variety">Variety (optional)</label>
              <input
                id="variety"
                value={form.variety}
                onChange={(e) => setForm((f) => ({ ...f, variety: e.target.value }))}
              />
            </div>
            {plots.length > 0 && (
              <div className="form-group">
                <label htmlFor="plot_id">Plot (optional)</label>
                <SelectField
                  id="plot_id"
                  value={form.plot_id}
                  onChange={(value) => setForm((f) => ({ ...f, plot_id: value }))}
                  placeholder="Whole farm"
                  options={[
                    { value: "", label: "Whole farm" },
                    ...plots.map((plot) => ({
                      value: plot.id,
                      label: `Plot · ${plot.area_hectares ?? "?"} ha`,
                    })),
                  ]}
                />
              </div>
            )}
            <div className="form-group">
              <label htmlFor="planting_date">Planting date (optional)</label>
              <DateField
                id="planting_date"
                value={form.planting_date}
                onChange={(value) => setForm((f) => ({ ...f, planting_date: value }))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="expected_harvest">Expected harvest (optional)</label>
              <DateField
                id="expected_harvest"
                value={form.expected_harvest}
                onChange={(value) => setForm((f) => ({ ...f, expected_harvest: value }))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="actual_harvest">Actual harvest (optional)</label>
              <DateField
                id="actual_harvest"
                value={form.actual_harvest}
                onChange={(value) => setForm((f) => ({ ...f, actual_harvest: value }))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="yield_outcome">Yield outcome (optional)</label>
              <input
                id="yield_outcome"
                value={form.yield_outcome}
                onChange={(e) => setForm((f) => ({ ...f, yield_outcome: e.target.value }))}
                placeholder="e.g. Good, Average, Poor"
              />
            </div>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowForm(false);
                setError("");
              }}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save crop cycle"}
            </button>
          </div>
        </form>
      )}

      {cropCycles.length > 0 ? (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Season</th>
                <th>Crop</th>
                <th>Variety</th>
                <th>Planted</th>
                <th>Expected harvest</th>
                <th>Actual harvest</th>
                <th>Yield</th>
              </tr>
            </thead>
            <tbody>
              {cropCycles.map((cycle) => (
                <tr key={cycle.id}>
                  <td>{cycle.season}</td>
                  <td>{cycle.crop_type}</td>
                  <td>{cycle.variety ?? "—"}</td>
                  <td>{cycle.planting_date ?? "—"}</td>
                  <td>{cycle.expected_harvest ?? "—"}</td>
                  <td>{cycle.actual_harvest ?? "—"}</td>
                  <td>{cycle.yield_outcome ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !showForm && <p className="muted">No crop cycles logged yet.</p>
      )}
    </section>
  );
}
