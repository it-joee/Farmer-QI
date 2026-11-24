import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { COMMODITIES, type Waybill } from "@farmeriq/shared";
import { FarmerActionsMenu } from "../components/FarmerActionsMenu";
import { Pagination } from "../components/Pagination";
import { AnimatedNumber } from "../components/dashboard/AnimatedNumber";
import {
  PackageBagIcon,
  ScaleWeightIcon,
  TruckTransitIcon,
  WaybillDocIcon,
} from "../components/dashboard/KpiIcons";
import { DateField } from "../components/fields/DateField";
import { SelectField } from "../components/fields/SelectField";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { useToast } from "../context/ToastContext";
import { useRequireAuth } from "../hooks/useFarmers";
import { useWaybills } from "../hooks/useWaybills";
import {
  deleteWaybill,
  exportWaybillsCsv,
  fetchWaybillsExport,
  formatWaybillDate,
  formatWaybillStatus,
  printWaybillsReport,
  updateWaybill,
  waybillStatusBadgeClass,
} from "../lib/waybills";
import { waybillFormToPayload, waybillToFormData } from "./waybill-form/types";

export function WaybillsPage() {
  const user = useRequireAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [buyerFilter, setBuyerFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [search, productFilter, statusFilter, buyerFilter, dateFrom, dateTo]);

  const activeFilters = useMemo(
    () => ({
      search: search.trim() || undefined,
      product: productFilter === "all" ? undefined : productFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
      buyer: buyerFilter === "all" ? undefined : buyerFilter,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }),
    [search, productFilter, statusFilter, buyerFilter, dateFrom, dateTo]
  );

  const { waybills, summary, filterOptions, pagination, loading, refetch } = useWaybills(
    page,
    20,
    activeFilters
  );

  const { confirm, alert } = useConfirmDialog();
  const { showSuccess } = useToast();

  const productOptions = useMemo(() => {
    const names = new Set<string>([...COMMODITIES, ...filterOptions.products]);
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [filterOptions.products]);

  const buyerOptions = useMemo(
    () => [...filterOptions.buyers].sort((a, b) => a.localeCompare(b)),
    [filterOptions.buyers]
  );

  const hasActiveFilters =
    search.trim() !== "" ||
    productFilter !== "all" ||
    statusFilter !== "all" ||
    buyerFilter !== "all" ||
    dateFrom !== "" ||
    dateTo !== "";

  function clearFilters() {
    setSearch("");
    setProductFilter("all");
    setStatusFilter("all");
    setBuyerFilter("all");
    setDateFrom("");
    setDateTo("");
  }

  const filtersLabel = useMemo(() => {
    const parts: string[] = [];
    if (search.trim()) parts.push(`Search: "${search.trim()}"`);
    if (productFilter !== "all") parts.push(`Product: ${productFilter}`);
    if (statusFilter !== "all") parts.push(`Status: ${statusFilter}`);
    if (buyerFilter !== "all") parts.push(`Buyer: ${buyerFilter}`);
    if (dateFrom) parts.push(`From: ${dateFrom}`);
    if (dateTo) parts.push(`To: ${dateTo}`);
    return parts.length ? parts.join(" · ") : "All recorded waybills";
  }, [search, productFilter, statusFilter, buyerFilter, dateFrom, dateTo]);

  async function handleExport(mode: "csv" | "pdf") {
    setExporting(true);
    try {
      const result = await fetchWaybillsExport(activeFilters);
      if (mode === "csv") {
        exportWaybillsCsv(result.data);
      } else {
        printWaybillsReport(result.data, result.summary, filtersLabel);
      }
    } catch {
      await alert("Could not export waybills report. Please try again.", "Export Error");
    } finally {
      setExporting(false);
    }
  }

  async function handleMarkDelivered(w: Waybill) {
    const confirmed = await confirm({
      title: "Mark Waybill as Delivered",
      message: `Are you sure you want to mark Waybill ${w.waybill_number} as delivered?`,
      confirmText: "Mark Delivered",
      variant: "primary",
    });
    if (!confirmed) return;

    try {
      await updateWaybill(
        w.id,
        waybillFormToPayload({ ...waybillToFormData(w), status: "delivered" })
      );
      showSuccess("Waybill Delivered", `Waybill ${w.waybill_number} marked as delivered.`);
      refetch();
    } catch {
      await alert("Could not update waybill status. Please try again.", "Error");
    }
  }

  async function handleDelete(w: Waybill) {
    const confirmed = await confirm({
      title: "Delete Waybill",
      message: `Are you sure you want to delete Waybill ${w.waybill_number}? It will be moved to the trash bin.`,
      confirmText: "Delete Waybill",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await deleteWaybill(w.id);
      showSuccess("Waybill Deleted", `Waybill ${w.waybill_number} moved to trash.`);
      refetch();
    } catch {
      await alert("Could not delete waybill. Please try again.", "Error");
    }
  }

  if (!user) return null;

  return (
    <main className="main main--dashboard">
      <div className="toolbar">
        <div className="page-header" style={{ margin: 0 }}>
          <h2 style={{ margin: 0 }}>Waybills</h2>
          <p className="muted" style={{ margin: "0.25rem 0 0" }}>
            {pagination.total} waybill{pagination.total === 1 ? "" : "s"} · Commodity dispatch &amp;
            trading records
          </p>
        </div>
        {/* Hidden for now; re-enable when bulk waybill exports are ready */}
        {false && (
          <div className="reports-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => void handleExport("csv")}
              disabled={pagination.total === 0 || exporting}
            >
              Export CSV
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => void handleExport("pdf")}
              disabled={pagination.total === 0 || exporting}
            >
              Export PDF
            </button>
          </div>
        )}
      </div>

      <div className="kpi-grid kpi-grid--4">
        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__value">
              {summary.total_weight_tons.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="kpi-card__icon kpi-card__icon--green" aria-hidden="true">
              <ScaleWeightIcon />
            </span>
          </div>
          <span className="kpi-card__label">
            Total tonnage (MT) · {summary.total_weight_kg.toLocaleString("en-US")} kg
          </span>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__value">
              <AnimatedNumber value={summary.total_bags} />
            </span>
            <span className="kpi-card__icon kpi-card__icon--amber" aria-hidden="true">
              <PackageBagIcon />
            </span>
          </div>
          <span className="kpi-card__label">Total bags</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__value">
              <AnimatedNumber value={summary.total_waybills} />
            </span>
            <span className="kpi-card__icon kpi-card__icon--sky" aria-hidden="true">
              <WaybillDocIcon />
            </span>
          </div>
          <span className="kpi-card__label">Total waybills</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__value">
              <AnimatedNumber value={summary.in_transit_count} />
            </span>
            <span className="kpi-card__icon kpi-card__icon--indigo" aria-hidden="true">
              <TruckTransitIcon />
            </span>
          </div>
          <span className="kpi-card__label">
            In transit · {summary.delivered_count} delivered
          </span>
        </div>
      </div>

      <div className="card">
        <div className="farmers-filters" style={{ flexWrap: "wrap", alignItems: "center" }}>
          <div
            className="form-group"
            style={{ margin: 0, flex: "1 1 240px", maxWidth: "320px", marginRight: "auto" }}
          >
            <label htmlFor="waybill-search" className="sr-only">
              Search waybills
            </label>
            <input
              id="waybill-search"
              type="search"
              placeholder="Search waybill no., buyer, truck, driver…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ margin: 0, minWidth: "150px" }}>
            <label htmlFor="waybill-product-filter" className="sr-only">
              Filter by product
            </label>
            <SelectField
              id="waybill-product-filter"
              variant="compact"
              value={productFilter}
              onChange={setProductFilter}
              options={[
                { value: "all", label: "All products" },
                ...productOptions.map((p) => ({ value: p, label: p })),
                { value: "Not specified", label: "Not specified" },
              ]}
            />
          </div>

          <div className="form-group" style={{ margin: 0, minWidth: "140px" }}>
            <label htmlFor="waybill-status-filter" className="sr-only">
              Filter by status
            </label>
            <SelectField
              id="waybill-status-filter"
              variant="compact"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All statuses" },
                { value: "in_transit", label: "In Transit" },
                { value: "delivered", label: "Delivered" },
                { value: "cancelled", label: "Cancelled" },
              ]}
            />
          </div>

          <div className="form-group" style={{ margin: 0, minWidth: "150px" }}>
            <label htmlFor="waybill-buyer-filter" className="sr-only">
              Filter by buyer
            </label>
            <SelectField
              id="waybill-buyer-filter"
              variant="compact"
              value={buyerFilter}
              onChange={setBuyerFilter}
              options={[
                { value: "all", label: "All buyers" },
                ...buyerOptions.map((b) => ({ value: b, label: b })),
                { value: "Not specified", label: "Not specified" },
              ]}
            />
          </div>

          <div className="form-group" style={{ margin: 0, minWidth: "150px" }}>
            <label htmlFor="waybill-date-from" className="sr-only">
              Issued from date
            </label>
            <DateField
              id="waybill-date-from"
              value={dateFrom}
              onChange={setDateFrom}
              placeholder="From date"
            />
          </div>

          <div className="form-group" style={{ margin: 0, minWidth: "150px" }}>
            <label htmlFor="waybill-date-to" className="sr-only">
              Issued to date
            </label>
            <DateField
              id="waybill-date-to"
              value={dateTo}
              onChange={setDateTo}
              placeholder="To date"
            />
          </div>

          {hasActiveFilters && (
            <button type="button" className="link-btn" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>

        {loading && waybills.length === 0 ? (
          <p className="muted" style={{ padding: "1.5rem 0" }}>
            Loading waybills…
          </p>
        ) : waybills.length > 0 ? (
          <>
            <div className="table-scroll farmer-list--desktop-only">
              <table className="table">
                <thead>
                  <tr>
                    <th>Waybill No.</th>
                    <th>Date</th>
                    <th>Buyer (Offtaker)</th>
                    <th>Product</th>
                    <th>Route</th>
                    <th>Bags</th>
                    <th>Weight</th>
                    <th>Driver / Truck</th>
                    <th className="table__actions-col">More</th>
                  </tr>
                </thead>
                <tbody>
                  {waybills.map((w) => {
                    const routeText = [w.loading_location, w.discharge_location]
                      .filter(Boolean)
                      .join(" → ");
                    const tonsText =
                      w.weight_kg != null
                        ? `${w.weight_kg.toLocaleString("en-US")} kg (${(w.weight_kg / 1000).toFixed(2)} MT)`
                        : "—";
                    return (
                      <tr key={w.id}>
                        <td>
                          <Link to={`/waybills/${w.id}`} style={{ fontWeight: 600 }}>
                            {w.waybill_number}
                          </Link>
                          {(w.open_conflict_count ?? 0) > 0 && (
                            <span
                              className="conflict-alerts__badge"
                              style={{ marginLeft: "0.4rem" }}
                              title="This waybill has open conflict flags for review"
                            >
                              Review
                            </span>
                          )}
                        </td>
                        <td>{formatWaybillDate(w.issued_date)}</td>
                        <td>{w.buyer_name || "—"}</td>
                        <td>{w.product_name || "—"}</td>
                        <td>{routeText || "—"}</td>
                        <td>
                          {w.bag_count != null
                            ? `${w.bag_count.toLocaleString("en-US")} ${w.bag_unit || "Bags"}`
                            : "—"}
                        </td>
                        <td>{tonsText}</td>
                        <td>
                          {[w.driver_name, w.truck_number].filter(Boolean).join(" · ") || "—"}
                        </td>
                        <td className="table__actions-col">
                          <FarmerActionsMenu
                            label={`Actions for Waybill ${w.waybill_number}`}
                            items={[
                              {
                                label: "View details",
                                onClick: () => navigate(`/waybills/${w.id}`),
                              },
                              {
                                label: "Edit waybill",
                                onClick: () => navigate(`/waybills/${w.id}/edit`),
                              },
                              ...(w.status === "in_transit"
                                ? [
                                    {
                                      label: "Mark Delivered",
                                      onClick: () => void handleMarkDelivered(w),
                                    },
                                  ]
                                : []),
                              {
                                label: "Delete",
                                variant: "danger" as const,
                                onClick: () => void handleDelete(w),
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="farmer-list--mobile-only">
              {waybills.map((w) => {
                const routeText = [w.loading_location, w.discharge_location]
                  .filter(Boolean)
                  .join(" → ");
                const weightText =
                  w.weight_kg != null
                    ? `${w.weight_kg.toLocaleString("en-US")} kg (${(w.weight_kg / 1000).toFixed(2)} MT)`
                    : null;
                return (
                  <article key={w.id} className="farmer-list-card">
                    <button
                      type="button"
                      className="farmer-list-card__main"
                      onClick={() => navigate(`/waybills/${w.id}`)}
                    >
                      <div className="farmer-list-card__content">
                        <h3 className="farmer-list-card__name">
                          {w.waybill_number}
                          {w.product_name ? ` · ${w.product_name}` : ""}
                          <span
                            className={waybillStatusBadgeClass(w.status)}
                            style={{ marginLeft: "0.4rem" }}
                          >
                            {formatWaybillStatus(w.status)}
                          </span>
                          {(w.open_conflict_count ?? 0) > 0 && (
                            <span
                              className="conflict-alerts__badge"
                              style={{ marginLeft: "0.4rem" }}
                            >
                              Review
                            </span>
                          )}
                        </h3>
                        {w.buyer_name && (
                          <p className="farmer-list-card__community">{w.buyer_name}</p>
                        )}
                        <p className="farmer-list-card__meta">
                          {[
                            formatWaybillDate(w.issued_date),
                            w.bag_count != null
                              ? `${w.bag_count.toLocaleString("en-US")} ${w.bag_unit || "Bags"}`
                              : null,
                            weightText,
                            w.truck_number,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </button>
                    <div
                      className="farmer-list-card__aside"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <div className="farmer-list-card__menu">
                        <FarmerActionsMenu
                          label={`Actions for Waybill ${w.waybill_number}`}
                          items={[
                            {
                              label: "View details",
                              onClick: () => navigate(`/waybills/${w.id}`),
                            },
                            {
                              label: "Edit waybill",
                              onClick: () => navigate(`/waybills/${w.id}/edit`),
                            },
                            ...(w.status === "in_transit"
                              ? [
                                  {
                                    label: "Mark Delivered",
                                    onClick: () => void handleMarkDelivered(w),
                                  },
                                ]
                              : []),
                            {
                              label: "Delete",
                              variant: "danger" as const,
                              onClick: () => void handleDelete(w),
                            },
                          ]}
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {pagination.totalPages > 1 && (
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                onPageChange={setPage}
              />
            )}
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
            <p className="muted" style={{ margin: "0 0 1rem" }}>
              {hasActiveFilters
                ? "No waybills match your filters."
                : "No waybills recorded yet."}
            </p>
            {!hasActiveFilters && (
              <Link to="/waybills/new" className="btn btn-primary">
                + Add Waybill
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
