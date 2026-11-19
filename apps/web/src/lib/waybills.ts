import type {
  ConflictFlag,
  CreateWaybillRequest,
  UpdateWaybillRequest,
  Waybill,
  WaybillConflictCheckResponse,
  WaybillPhoto,
  WaybillStatus,
  WaybillSummary,
} from "@farmeriq/shared";
import { getWaybillDisplayId } from "@farmeriq/shared";
import { apiAssetUrl } from "./api-url";
import { apiFetch } from "./api-client";
import type { CapturedPhoto } from "./photos";
import { downloadCsv } from "./reports";

export interface WaybillFilters {
  search?: string;
  product?: string;
  status?: string;
  buyer?: string;
  date_from?: string;
  date_to?: string;
}

export function formatWaybillStatus(status: WaybillStatus): string {
  if (status === "delivered") return "Delivered";
  if (status === "cancelled") return "Cancelled";
  return "In Transit";
}

export function waybillStatusBadgeClass(status: WaybillStatus): string {
  if (status === "delivered") return "sync-badge sync-badge--synced";
  if (status === "cancelled") return "sync-badge sync-badge--failed";
  return "sync-badge sync-badge--pending";
}

export function formatWeightSummary(weightKg: number | null | undefined): string {
  if (weightKg == null || !Number.isFinite(weightKg)) return "—";
  const tons = weightKg / 1000;
  return `${weightKg.toLocaleString("en-US", { maximumFractionDigits: 2 })} kg (${tons.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  })} MT)`;
}

export function formatWaybillDate(dateValue: string | null | undefined): string {
  if (!dateValue) return "—";
  const parts = dateValue.slice(0, 10).split("-").map(Number);
  if (parts.length === 3 && parts.every((n) => !Number.isNaN(n) && n > 0)) {
    const dt = new Date(parts[0], parts[1] - 1, parts[2]);
    return dt.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  const dt = new Date(dateValue);
  if (Number.isNaN(dt.getTime())) return dateValue;
  return dt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export async function fetchWaybill(waybillId: string): Promise<Waybill> {
  const res = await apiFetch(`/api/waybills/${waybillId}`);
  if (!res.ok) throw new Error("Waybill not found");
  const data = (await res.json()) as { waybill: Waybill };
  return data.waybill;
}

export async function createWaybill(payload: CreateWaybillRequest): Promise<{ waybill: Waybill }> {
  const res = await apiFetch("/api/waybills", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(typeof err.error === "string" ? err.error : "Could not create waybill");
  }
  return res.json() as Promise<{ waybill: Waybill }>;
}

export async function updateWaybill(
  waybillId: string,
  payload: UpdateWaybillRequest
): Promise<{ waybill: Waybill }> {
  const res = await apiFetch(`/api/waybills/${waybillId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(typeof err.error === "string" ? err.error : "Could not update waybill");
  }
  return res.json() as Promise<{ waybill: Waybill }>;
}

export async function deleteWaybill(waybillId: string): Promise<void> {
  const res = await apiFetch(`/api/waybills/${waybillId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("Could not delete waybill");
  }
}

export async function checkWaybillConflicts(
  payload: Partial<CreateWaybillRequest>,
  excludeId?: string
): Promise<WaybillConflictCheckResponse> {
  const res = await apiFetch("/api/waybills/check-conflicts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, exclude_id: excludeId }),
  });
  if (!res.ok) {
    return { duplicate_number: null, warnings: [] };
  }
  return res.json() as Promise<WaybillConflictCheckResponse>;
}

export async function fetchWaybillConflicts(waybillId: string): Promise<ConflictFlag[]> {
  const res = await apiFetch(`/api/waybills/${waybillId}/conflicts`);
  if (!res.ok) return [];
  const data = (await res.json()) as { conflicts?: ConflictFlag[] };
  return data.conflicts ?? [];
}

export async function resolveWaybillConflict(
  waybillId: string,
  conflictId: string,
  status: "resolved" | "dismissed",
  reason?: string
): Promise<void> {
  const res = await apiFetch(`/api/waybills/${waybillId}/conflicts/${conflictId}/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, ...(reason ? { reason } : {}) }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Could not update conflict");
  }
}

export function existingWaybillPhotoToCaptured(photo: WaybillPhoto): CapturedPhoto {
  const previewUrl = photo.url.startsWith("http") ? photo.url : apiAssetUrl(photo.url);
  return {
    id: photo.id,
    previewUrl,
    serverPhotoId: photo.id,
    fileName: photo.file_name,
  };
}

export function isWaybillPdf(photo: WaybillPhoto): boolean {
  const target = (photo.file_name || photo.url || "").split("?")[0].toLowerCase();
  return target.endsWith(".pdf");
}

export async function fetchWaybillPhotos(waybillId: string): Promise<WaybillPhoto[]> {
  const res = await apiFetch(`/api/waybills/${waybillId}/photos`);
  if (!res.ok) return [];
  const data = (await res.json()) as { photos?: WaybillPhoto[] };
  return data.photos ?? [];
}

export async function deleteWaybillPhoto(photoId: string): Promise<void> {
  const res = await apiFetch(`/api/waybills/photos/${photoId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("Failed to delete photo");
  }
}

export async function uploadWaybillPhotos(
  waybillId: string,
  truckPhotos: CapturedPhoto[],
  docPhotos: CapturedPhoto[]
): Promise<void> {
  const truckUploads = truckPhotos.filter((photo) => photo.file);
  const docUploads = docPhotos.filter((photo) => photo.file);

  if (truckUploads.length === 0 && docUploads.length === 0) return;

  const formData = new FormData();
  for (const photo of truckUploads) {
    formData.append("truck", photo.file!);
  }
  for (const photo of docUploads) {
    formData.append("waybill_doc", photo.file!);
  }

  const res = await apiFetch(`/api/waybills/${waybillId}/photos`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Photo upload failed");
  }

  const data = (await res.json()) as { photos?: unknown[] };
  const expectedCount = truckUploads.length + docUploads.length;
  if ((data.photos?.length ?? 0) < expectedCount) {
    throw new Error("Photo upload failed — not all files were saved");
  }
}

export async function syncWaybillPhotoChanges(
  waybillId: string,
  truckPhotos: CapturedPhoto[],
  docPhotos: CapturedPhoto[],
  removedPhotoIds: string[]
): Promise<void> {
  for (const photoId of removedPhotoIds) {
    await deleteWaybillPhoto(photoId);
  }
  await uploadWaybillPhotos(waybillId, truckPhotos, docPhotos);
}

export async function fetchWaybillsExport(
  filters: WaybillFilters
): Promise<{ data: Waybill[]; summary: WaybillSummary }> {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.product) params.set("product", filters.product);
  if (filters.status) params.set("status", filters.status);
  if (filters.buyer) params.set("buyer", filters.buyer);
  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);

  const res = await apiFetch(`/api/waybills/export?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to export waybills");
  return res.json() as Promise<{ data: Waybill[]; summary: WaybillSummary }>;
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function escapeHtml(value: string | number | null | undefined): string {
  if (value == null) return "—";
  const text = String(value);
  if (!text.trim()) return "—";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function waybillsToCsv(waybills: Waybill[]): string {
  const headers = [
    "Waybill No.",
    "Date Issued",
    "Status",
    "Waybill To (Buyer)",
    "Aggregator",
    "Place of Loading",
    "Loading Region",
    "Place of Discharge",
    "Product",
    "Description",
    "Quantity (Bags)",
    "Packaging Unit",
    "Loading Weight (kg)",
    "Loading Weight (MT)",
    "Received Weight (kg)",
    "Driver Name",
    "Driver Contact",
    "Truck Number",
    "Notes",
    "Reference ID",
  ];

  const rows = waybills.map((w) => {
    const tons =
      w.weight_kg != null && Number.isFinite(w.weight_kg)
        ? (w.weight_kg / 1000).toFixed(3)
        : "";
    const values = [
      w.waybill_number,
      w.issued_date?.slice(0, 10) ?? "",
      formatWaybillStatus(w.status),
      w.buyer_name ?? "",
      w.aggregator_name ?? "",
      w.loading_location ?? "",
      w.loading_region ?? "",
      w.discharge_location ?? "",
      w.product_name ?? "",
      w.product_description ?? "",
      w.bag_count != null ? String(w.bag_count) : "",
      w.bag_unit ?? "",
      w.weight_kg != null ? String(w.weight_kg) : "",
      tons,
      w.received_weight_kg != null ? String(w.received_weight_kg) : "",
      w.driver_name ?? "",
      w.driver_phone ?? "",
      w.truck_number ?? "",
      w.notes ?? "",
      getWaybillDisplayId(w),
    ];
    return values.map((v) => escapeCsv(v)).join(",");
  });

  return [headers.map(escapeCsv).join(","), ...rows].join("\n");
}

export function exportWaybillsCsv(waybills: Waybill[]) {
  const date = new Date().toISOString().slice(0, 10);
  downloadCsv(`farmeriq-waybills-${date}.csv`, waybillsToCsv(waybills));
}

function printFontStyles(): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `
    @font-face {
      font-family: "Libre Franklin";
      src: url("${origin}/libre%20font/LibreFranklin-Regular.ttf") format("truetype");
      font-weight: 400;
      font-style: normal;
    }
    @font-face {
      font-family: "Libre Franklin";
      src: url("${origin}/libre%20font/LibreFranklin-Medium.ttf") format("truetype");
      font-weight: 500;
      font-style: normal;
    }
    @font-face {
      font-family: "Libre Franklin";
      src: url("${origin}/libre%20font/LibreFranklin-SemiBold.ttf") format("truetype");
      font-weight: 600;
      font-style: normal;
    }
    @font-face {
      font-family: "Libre Franklin";
      src: url("${origin}/libre%20font/LibreFranklin-Bold.ttf") format("truetype");
      font-weight: 700;
      font-style: normal;
    }
  `;
}

export function printWaybillsReport(
  waybills: Waybill[],
  summary: WaybillSummary,
  filtersLabel: string
) {
  const rows = waybills
    .map((w) => {
      const tons =
        w.weight_kg != null ? (w.weight_kg / 1000).toFixed(2) : "—";
      const kg =
        w.weight_kg != null ? w.weight_kg.toLocaleString("en-US") : "—";
      return `
      <tr>
        <td>${escapeHtml(w.waybill_number)}</td>
        <td>${escapeHtml(formatWaybillDate(w.issued_date))}</td>
        <td>${escapeHtml(w.buyer_name)}</td>
        <td>${escapeHtml(w.aggregator_name)}</td>
        <td>${escapeHtml([w.loading_location, w.discharge_location].filter(Boolean).join(" → "))}</td>
        <td>${escapeHtml(w.product_name)}</td>
        <td>${w.bag_count != null ? `${w.bag_count} ${escapeHtml(w.bag_unit ?? "Bags")}` : "—"}</td>
        <td>${kg} kg (${tons} MT)</td>
        <td>${escapeHtml([w.driver_name, w.truck_number].filter(Boolean).join(" · "))}</td>
        <td>${escapeHtml(formatWaybillStatus(w.status))}</td>
      </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>JNI Operations — Waybills Report</title>
  <style>
    ${printFontStyles()}
    body { font-family: "Libre Franklin", system-ui, -apple-system, sans-serif; color: #1a1a1a; padding: 24px; }
    h1 { font-size: 1.25rem; margin: 0 0 4px; }
    .meta { color: #555; font-size: 0.875rem; margin-bottom: 16px; }
    .summary { display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 20px; font-size: 0.875rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
    th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
  </style>
</head>
<body>
  <h1>Operations Waybills Report</h1>
  <p class="meta">${escapeHtml(filtersLabel)}</p>
  <div class="summary">
    <span><strong>${summary.total_waybills}</strong> waybills</span>
    <span><strong>${summary.total_weight_tons.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT</strong> (${summary.total_weight_kg.toLocaleString("en-US")} kg)</span>
    <span><strong>${summary.total_bags.toLocaleString("en-US")}</strong> bags</span>
    <span><strong>${summary.in_transit_count}</strong> in transit · <strong>${summary.delivered_count}</strong> delivered</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>Waybill No.</th>
        <th>Date</th>
        <th>Buyer</th>
        <th>Aggregator</th>
        <th>Route</th>
        <th>Product</th>
        <th>Quantity</th>
        <th>Weight</th>
        <th>Driver / Truck</th>
        <th>Status</th>
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

export function printSingleWaybill(waybill: Waybill) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Waybill ${escapeHtml(waybill.waybill_number)}</title>
  <style>
    ${printFontStyles()}
    body { font-family: "Libre Franklin", system-ui, -apple-system, sans-serif; color: #1a1a1a; padding: 28px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #15803d; padding-bottom: 12px; margin-bottom: 20px; }
    h1 { font-size: 1.375rem; margin: 0 0 4px; }
    .sub { color: #555; font-size: 0.875rem; margin: 0; }
    .badge { padding: 4px 10px; border-radius: 999px; background: #ecfdf3; color: #067647; font-size: 0.75rem; font-weight: 600; }
    h2 { font-size: 1rem; margin: 20px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px 24px; }
    .label { font-size: 0.75rem; color: #666; text-transform: uppercase; font-weight: 600; }
    .val { font-size: 0.9375rem; margin-top: 2px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Waybill #${escapeHtml(waybill.waybill_number)}</h1>
      <p class="sub">Issued: ${escapeHtml(formatWaybillDate(waybill.issued_date))} · Ref: ${escapeHtml(getWaybillDisplayId(waybill))}</p>
    </div>
    <span class="badge">${escapeHtml(formatWaybillStatus(waybill.status))}</span>
  </div>

  <h2>Buyer &amp; Route Details</h2>
  <div class="grid">
    <div><div class="label">Waybill To (Buyer)</div><div class="val">${escapeHtml(waybill.buyer_name)}</div></div>
    <div><div class="label">Aggregator</div><div class="val">${escapeHtml(waybill.aggregator_name)}</div></div>
    <div><div class="label">Place of Loading</div><div class="val">${escapeHtml(waybill.loading_location)}${waybill.loading_region ? ` (${escapeHtml(waybill.loading_region)})` : ""}</div></div>
    <div><div class="label">Place of Discharge</div><div class="val">${escapeHtml(waybill.discharge_location)}</div></div>
  </div>

  <h2>Commodity, Quantity &amp; Weight</h2>
  <div class="grid">
    <div><div class="label">Product</div><div class="val">${escapeHtml(waybill.product_name)}</div></div>
    <div><div class="label">Description</div><div class="val">${escapeHtml(waybill.product_description)}</div></div>
    <div><div class="label">Quantity</div><div class="val">${waybill.bag_count != null ? `${waybill.bag_count.toLocaleString("en-US")} ${escapeHtml(waybill.bag_unit ?? "Bags")}` : "—"}</div></div>
    <div><div class="label">Loading Weight</div><div class="val">${escapeHtml(formatWeightSummary(waybill.weight_kg))}</div></div>
    <div><div class="label">Received Weight</div><div class="val">${escapeHtml(formatWeightSummary(waybill.received_weight_kg))}</div></div>
  </div>

  <h2>Driver &amp; Transport Details</h2>
  <div class="grid">
    <div><div class="label">Driver Name</div><div class="val">${escapeHtml(waybill.driver_name)}</div></div>
    <div><div class="label">Driver Contact</div><div class="val">${escapeHtml(waybill.driver_phone)}</div></div>
    <div><div class="label">Truck Number</div><div class="val">${escapeHtml(waybill.truck_number)}</div></div>
    <div><div class="label">Notes</div><div class="val">${escapeHtml(waybill.notes)}</div></div>
  </div>
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
