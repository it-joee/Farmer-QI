import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { ConflictFlag, FarmerExportRow, ReportSummary } from "@farmeriq/shared";
import { GHANA_REGIONS } from "@farmeriq/shared";
import { ConflictResolveActions } from "../components/ConflictResolveActions";
import { DateField } from "../components/fields/DateField";
import { SelectField } from "../components/fields/SelectField";
import { useRequireAuth } from "../hooks/useFarmers";
import { useAuthUser } from "../hooks/useAuth";
import { canResolveConflicts } from "../auth";
import {
  downloadCsv,
  farmersToCsv,
  fetchConflictReport,
  fetchFarmerReport,
  fetchReportFilterOptions,
  printFarmerReport,
} from "../lib/reports";

const EMPTY_SUMMARY: ReportSummary = {
  total_farmers: 0,
  with_ghana_card: 0,
  with_phone: 0,
  with_boundary: 0,
  open_conflicts: 0,
  regions: 0,
  districts: 0,
};

export function ReportsPage() {
  const user = useRequireAuth();
  const authUser = useAuthUser();
  const [region, setRegion] = useState("");
  const [district, setDistrict] = useState("");
  const [commodity, setCommodity] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [farmers, setFarmers] = useState<FarmerExportRow[]>([]);
  const [summary, setSummary] = useState<ReportSummary>(EMPTY_SUMMARY);
  const [conflicts, setConflicts] = useState<
    (ConflictFlag & { farmer_name?: string; farmer_id?: string })[]
  >([]);
  const [filterOptions, setFilterOptions] = useState({
    regions: [] as string[],
    districts: [] as string[],
    commodities: [] as string[],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const filters = useMemo(
    () => ({
      region: region || undefined,
      district: district || undefined,
      commodity: commodity || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }),
    [region, district, commodity, dateFrom, dateTo]
  );

  const filtersLabel = useMemo(() => {
    const parts: string[] = [];
    if (region) parts.push(`Region: ${region}`);
    if (district) parts.push(`District: ${district}`);
    if (commodity) parts.push(`Commodity: ${commodity}`);
    if (dateFrom) parts.push(`From: ${dateFrom}`);
    if (dateTo) parts.push(`To: ${dateTo}`);
    return parts.length ? parts.join(" · ") : "All registered farmers";
  }, [region, district, commodity, dateFrom, dateTo]);

  const loadReport = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError("");

    try {
      const [report, conflictRows] = await Promise.all([
        fetchFarmerReport(filters),
        fetchConflictReport(filters),
      ]);
      setFarmers(report.farmers);
      setSummary(report.summary);
      setConflicts(conflictRows);
    } catch {
      setError("Could not load report data.");
      setFarmers([]);
      setSummary(EMPTY_SUMMARY);
      setConflicts([]);
    } finally {
      setLoading(false);
    }
  }, [filters, user]);

  useEffect(() => {
    if (!user) return;
    fetchReportFilterOptions()
      .then(setFilterOptions)
      .catch(() => {
        /* use empty options */
      });
  }, [user]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  function handleExportCsv() {
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(`farmeriq-report-${date}.csv`, farmersToCsv(farmers));
  }

  function handleExportPdf() {
    printFarmerReport(farmers, summary, filtersLabel);
  }

  if (!user) return null;

  const preview = farmers.slice(0, 50);

  return (
    <main className="main main--dashboard">
      <div className="toolbar">
        <div className="page-header" style={{ margin: 0 }}>
          <h2 style={{ margin: 0 }}>Reports</h2>
          <p className="muted" style={{ margin: "0.25rem 0 0" }}>
            {authUser?.role === "admin"
              ? "National registry exports and conflict review"
              : authUser?.role === "team_lead"
                ? "Office registry exports and conflict review"
                : "Filter and export farmer registry data"}
          </p>
        </div>
        <div className="reports-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportCsv}
            disabled={farmers.length === 0}
          >
            Export CSV
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExportPdf}
            disabled={farmers.length === 0}
          >
            Export PDF
          </button>
        </div>
      </div>

      <section className="card reports-filters">
        <h3 className="card-title">Filters</h3>
        <div className="form-grid form-grid--2">
          <div className="form-group">
            <label htmlFor="report-region">Region</label>
            <SelectField
              id="report-region"
              value={region}
              onChange={setRegion}
              placeholder="All regions"
              options={[
                { value: "", label: "All regions" },
                ...GHANA_REGIONS.map((r) => ({ value: r, label: r })),
              ]}
            />
          </div>
          <div className="form-group">
            <label htmlFor="report-district">District</label>
            <SelectField
              id="report-district"
              value={district}
              onChange={setDistrict}
              placeholder="All districts"
              options={[
                { value: "", label: "All districts" },
                ...filterOptions.districts.map((d) => ({ value: d, label: d })),
              ]}
            />
          </div>
          <div className="form-group">
            <label htmlFor="report-commodity">Commodity</label>
            <SelectField
              id="report-commodity"
              value={commodity}
              onChange={setCommodity}
              placeholder="All commodities"
              options={[
                { value: "", label: "All commodities" },
                { value: "Not specified", label: "Not specified" },
                ...filterOptions.commodities.map((c) => ({ value: c, label: c })),
              ]}
            />
          </div>
          <div className="form-group">
            <label htmlFor="report-date-from">Registered from</label>
            <DateField id="report-date-from" value={dateFrom} onChange={setDateFrom} />
          </div>
          <div className="form-group">
            <label htmlFor="report-date-to">Registered to</label>
            <DateField id="report-date-to" value={dateTo} onChange={setDateTo} />
          </div>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => void loadReport()}>
          Apply filters
        </button>
      </section>

      {error && <p className="error">{error}</p>}

      <div className="reports-kpi-grid">
        <div className="card reports-kpi">
          <span className="reports-kpi__value">{loading ? "—" : summary.total_farmers}</span>
          <span className="reports-kpi__label">Farmers</span>
        </div>
        <div className="card reports-kpi">
          <span className="reports-kpi__value">{loading ? "—" : summary.with_ghana_card}</span>
          <span className="reports-kpi__label">With Ghana Card</span>
        </div>
        <div className="card reports-kpi">
          <span className="reports-kpi__value">{loading ? "—" : summary.with_boundary}</span>
          <span className="reports-kpi__label">With boundary</span>
        </div>
        <div className="card reports-kpi">
          <span className="reports-kpi__value">{loading ? "—" : summary.open_conflicts}</span>
          <span className="reports-kpi__label">Open flags</span>
        </div>
      </div>

      {conflicts.length > 0 && (
        <section className="card conflict-alerts">
          <h3 className="card-title">Open conflict flags</h3>
          <ul className="conflict-alerts__list">
            {conflicts.map((flag) => (
              <li key={flag.id} className="conflict-alerts__item">
                <span className="conflict-alerts__badge">Review</span>
                <span>
                  {flag.farmer_name ?? "Farmer"} —{" "}
                  {flag.flag_type === "duplicate_ghana_card"
                    ? "Possible duplicate Ghana Card"
                    : flag.flag_type === "duplicate_profile"
                      ? "Possible duplicate profile (name, community, phone)"
                      : "Boundary overlap"}
                </span>
                {flag.farmer_id && (
                  <Link to={`/farmers/${flag.farmer_id}`} className="link-btn">
                    View farmer
                  </Link>
                )}
                {authUser && canResolveConflicts(authUser) && (
                  <ConflictResolveActions conflictId={flag.id} onResolved={() => void loadReport()} />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h3 className="card-title">Registry preview</h3>
        <p className="card-desc">
          {loading
            ? "Loading…"
            : `${farmers.length} record${farmers.length === 1 ? "" : "s"} match your filters`}
          {farmers.length > 50 && " (showing first 50)"}
        </p>

        {preview.length > 0 && (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Community</th>
                  <th>District</th>
                  <th>Region</th>
                  <th>Commodities</th>
                  <th>Phone</th>
                  <th>Boundary</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((farmer) => (
                  <tr key={farmer.id}>
                    <td>
                      <Link to={`/farmers/${farmer.id}`}>{farmer.full_name}</Link>
                    </td>
                    <td>{farmer.community}</td>
                    <td>{farmer.district ?? "—"}</td>
                    <td>{farmer.region ?? "—"}</td>
                    <td>{(farmer.primary_crops ?? []).join(", ") || "—"}</td>
                    <td>{farmer.phone ?? "—"}</td>
                    <td>{farmer.has_boundary ? "Yes" : "—"}</td>
                    <td>{new Date(farmer.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && farmers.length === 0 && (
          <p className="muted">No farmers match the selected filters.</p>
        )}
      </section>
    </main>
  );
}
