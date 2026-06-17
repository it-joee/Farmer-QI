import type { ConflictFlag, FarmerExportRow, ReportFilters, ReportSummary } from "@farmeriq/shared";
import { apiFetch } from "./api-client";

export interface ReportFilterOptions {
  regions: string[];
  districts: string[];
  commodities: string[];
}

export interface FarmerReportResponse {
  farmers: FarmerExportRow[];
  summary: ReportSummary;
}

function toQueryString(filters: ReportFilters): string {
  const params = new URLSearchParams();
  if (filters.region) params.set("region", filters.region);
  if (filters.district) params.set("district", filters.district);
  if (filters.commodity) params.set("commodity", filters.commodity);
  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);
  if (filters.created_by) params.set("created_by", filters.created_by);
  return params.toString();
}

export async function fetchReportFilterOptions(): Promise<ReportFilterOptions> {
  const res = await apiFetch("/api/reports/filter-options");
  if (!res.ok) throw new Error("Failed to load filter options");
  return res.json();
}

export async function fetchFarmerReport(filters: ReportFilters): Promise<FarmerReportResponse> {
  const qs = toQueryString(filters);
  const res = await apiFetch(`/api/reports/farmers?${qs}`);
  if (!res.ok) throw new Error("Failed to load report");
  return res.json();
}

export async function fetchConflictReport(
  filters: ReportFilters
): Promise<(ConflictFlag & { farmer_name?: string; farmer_id?: string })[]> {
  const qs = toQueryString(filters);
  const res = await apiFetch(`/api/reports/conflicts?${qs}&status=open`);
  if (!res.ok) throw new Error("Failed to load conflicts");
  const data = await res.json();
  return data.conflicts ?? [];
}

const EXPORT_COLUMNS: { key: keyof FarmerExportRow | "commodities"; label: string }[] = [
  { key: "full_name", label: "Full name" },
  { key: "ghana_card", label: "Ghana Card" },
  { key: "phone", label: "Phone" },
  { key: "gender", label: "Gender" },
  { key: "community", label: "Community" },
  { key: "district", label: "District" },
  { key: "region", label: "Region" },
  { key: "commodities", label: "Commodities" },
  { key: "household_size", label: "Household size" },
  { key: "years_farming", label: "Years farming" },
  { key: "farming_dependency", label: "Farming dependency" },
  { key: "has_boundary", label: "Has boundary" },
  { key: "created_at", label: "Registered" },
  { key: "id", label: "System ID" },
];

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function rowValue(farmer: FarmerExportRow, key: (typeof EXPORT_COLUMNS)[number]["key"]): string {
  if (key === "commodities") {
    return (farmer.primary_crops ?? []).join("; ");
  }
  if (key === "has_boundary") {
    return farmer.has_boundary ? "Yes" : "No";
  }
  const value = farmer[key];
  if (value == null) return "";
  if (Array.isArray(value)) return value.join("; ");
  return String(value);
}

export function farmersToCsv(farmers: FarmerExportRow[]): string {
  const header = EXPORT_COLUMNS.map((col) => escapeCsv(col.label)).join(",");
  const rows = farmers.map((farmer) =>
    EXPORT_COLUMNS.map((col) => escapeCsv(rowValue(farmer, col.key))).join(",")
  );
  return [header, ...rows].join("\n");
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function printFarmerReport(
  farmers: FarmerExportRow[],
  summary: ReportSummary,
  filtersLabel: string
) {
  const rows = farmers
    .map(
      (farmer) => `
      <tr>
        <td>${farmer.full_name}</td>
        <td>${farmer.community}</td>
        <td>${farmer.district ?? "—"}</td>
        <td>${farmer.region ?? "—"}</td>
        <td>${(farmer.primary_crops ?? []).join(", ") || "—"}</td>
        <td>${farmer.phone ?? "—"}</td>
        <td>${farmer.ghana_card ?? "—"}</td>
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>FarmerIQ Report</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #1a1a1a; padding: 24px; }
    h1 { font-size: 1.25rem; margin: 0 0 4px; }
    .meta { color: #555; font-size: 0.875rem; margin-bottom: 16px; }
    .summary { display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 20px; font-size: 0.875rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
    th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
  </style>
</head>
<body>
  <h1>Farmer registry report</h1>
  <p class="meta">${filtersLabel}</p>
  <div class="summary">
    <span><strong>${summary.total_farmers}</strong> farmers</span>
    <span><strong>${summary.with_ghana_card}</strong> with Ghana Card</span>
    <span><strong>${summary.with_boundary}</strong> with boundary</span>
    <span><strong>${summary.open_conflicts}</strong> open flags</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Community</th>
        <th>District</th>
        <th>Region</th>
        <th>Commodities</th>
        <th>Phone</th>
        <th>Ghana Card</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
