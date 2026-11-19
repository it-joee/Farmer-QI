import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { VEHICLE_TYPES } from "@farmeriq/shared";
import { canRegisterDrivers, driversScopeLabel } from "../auth";
import { FarmerActionsMenu } from "../components/FarmerActionsMenu";
import { Pagination } from "../components/Pagination";
import { AnimatedNumber } from "../components/dashboard/AnimatedNumber";
import { DriverIcon } from "../components/dashboard/KpiIcons";
import { SelectField } from "../components/fields/SelectField";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { useToast } from "../context/ToastContext";
import { useDrivers } from "../hooks/useDrivers";
import { useRequireAuth } from "../hooks/useFarmers";
import { deleteDriver } from "../lib/drivers";

export function DriversPage() {
  const user = useRequireAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [search, vehicleTypeFilter, statusFilter]);

  const { drivers, vehicleTypes, summary, pagination, loading, refetch } = useDrivers(
    page,
    20,
    search,
    vehicleTypeFilter === "all" ? "" : vehicleTypeFilter,
    statusFilter === "all" ? "" : statusFilter
  );

  const { confirm, alert } = useConfirmDialog();
  const { showSuccess } = useToast();

  const vehicleTypeOptions = useMemo(() => {
    const names = new Set<string>([...VEHICLE_TYPES, ...vehicleTypes]);
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [vehicleTypes]);

  async function handleDelete(driverId: string, name: string) {
    const confirmed = await confirm({
      title: "Delete Driver",
      message: `Are you sure you want to delete ${name}? This action cannot be undone.`,
      confirmText: "Delete Driver",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await deleteDriver(driverId);
      showSuccess("Driver Deleted", `${name} has been deleted.`);
      refetch();
    } catch {
      await alert("Could not delete driver. Please try again.", "Error");
    }
  }

  if (!user) return null;

  return (
    <main className="main main--dashboard">
      <div className="toolbar">
        <div className="page-header" style={{ margin: 0 }}>
          <h2 style={{ margin: 0 }}>{driversScopeLabel(user)}</h2>
          <p className="muted" style={{ margin: "0.25rem 0 0" }}>
            {pagination.total} driver{pagination.total === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="kpi-grid kpi-grid--3">
        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__value">
              <AnimatedNumber value={summary.total_all} />
            </span>
            <span className="kpi-card__icon" aria-hidden="true">
              <DriverIcon />
            </span>
          </div>
          <span className="kpi-card__label">Total drivers</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__value">
              <AnimatedNumber value={summary.active_count} />
            </span>
            <span className="kpi-card__icon" aria-hidden="true">
              <DriverIcon />
            </span>
          </div>
          <span className="kpi-card__label">Active drivers</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__value">
              <AnimatedNumber value={summary.inactive_count} />
            </span>
            <span className="kpi-card__icon" aria-hidden="true">
              <DriverIcon />
            </span>
          </div>
          <span className="kpi-card__label">Inactive drivers</span>
        </div>
      </div>

      <div className="card">
        <div className="farmers-filters">
          <div className="form-group" style={{ margin: 0, flex: "1 1 260px", maxWidth: "360px", marginRight: "auto" }}>
            <label htmlFor="driver-search" className="sr-only">
              Search drivers
            </label>
            <input
              id="driver-search"
              type="search"
              placeholder="Search by name, phone, plate, location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: "160px" }}>
            <label htmlFor="driver-vehicle-filter" className="sr-only">
              Filter by vehicle type
            </label>
            <SelectField
              id="driver-vehicle-filter"
              variant="compact"
              value={vehicleTypeFilter}
              onChange={setVehicleTypeFilter}
              options={[
                { value: "all", label: "All vehicle types" },
                ...vehicleTypeOptions.map((vt) => ({ value: vt, label: vt })),
                { value: "Not specified", label: "Not specified" },
              ]}
            />
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: "140px" }}>
            <label htmlFor="driver-status-filter" className="sr-only">
              Filter by status
            </label>
            <SelectField
              id="driver-status-filter"
              variant="compact"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All statuses" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
            />
          </div>
        </div>

        {loading && drivers.length === 0 ? (
          <p className="muted" style={{ padding: "1.5rem 0" }}>
            Loading drivers…
          </p>
        ) : drivers.length > 0 ? (
          <>
            <div className="table-scroll farmer-list--desktop-only">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Vehicle Type</th>
                    <th>Plate No.</th>
                    <th>Location</th>
                    <th>Added By</th>
                    <th>Status</th>
                    <th className="table__actions-col">More</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map((d) => (
                    <tr key={d.id}>
                      <td>{d.full_name}</td>
                      <td>{d.phone || "—"}</td>
                      <td>{d.vehicle_type || "—"}</td>
                      <td>{d.vehicle_plate || "—"}</td>
                      <td>{d.assigned_location || "—"}</td>
                      <td>{d.created_by_name || "—"}</td>
                      <td>
                        <span
                          className={`sync-badge ${
                            d.status === "active" ? "sync-badge--synced" : "sync-badge--pending"
                          }`}
                        >
                          {d.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="table__actions-col">
                        <FarmerActionsMenu
                          label={`Actions for ${d.full_name}`}
                          items={[
                            {
                              label: "View details",
                              onClick: () => navigate(`/drivers/${d.id}`),
                            },
                            {
                              label: "Edit driver",
                              onClick: () => navigate(`/drivers/${d.id}/edit`),
                            },
                            {
                              label: "Delete",
                              variant: "danger",
                              onClick: () => void handleDelete(d.id, d.full_name),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="farmer-list--mobile-only">
              {drivers.map((d) => (
                <article key={d.id} className="farmer-list-card">
                  <button
                    type="button"
                    className="farmer-list-card__main"
                    onClick={() => navigate(`/drivers/${d.id}`)}
                  >
                    <div className="farmer-list-card__content">
                      <h3 className="farmer-list-card__name">
                        {d.full_name}
                        <span
                          className={`sync-badge ${
                            d.status === "active" ? "sync-badge--synced" : "sync-badge--pending"
                          }`}
                          style={{ marginLeft: "0.4rem" }}
                        >
                          {d.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </h3>
                      <p className="farmer-list-card__community">
                        {[d.vehicle_type, d.vehicle_plate, d.assigned_location]
                          .filter(Boolean)
                          .join(" · ") || "No vehicle details"}
                      </p>
                      {d.phone && <p className="farmer-list-card__phone">{d.phone}</p>}
                    </div>
                  </button>
                  <div
                    className="farmer-list-card__aside"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <div className="farmer-list-card__menu">
                      <FarmerActionsMenu
                        label={`Actions for ${d.full_name}`}
                        items={[
                          {
                            label: "View details",
                            onClick: () => navigate(`/drivers/${d.id}`),
                          },
                          {
                            label: "Edit driver",
                            onClick: () => navigate(`/drivers/${d.id}/edit`),
                          },
                          {
                            label: "Delete",
                            variant: "danger",
                            onClick: () => void handleDelete(d.id, d.full_name),
                          },
                        ]}
                      />
                    </div>
                  </div>
                </article>
              ))}
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
              {search || vehicleTypeFilter !== "all" || statusFilter !== "all"
                ? "No drivers match your filters."
                : "No drivers registered yet."}
            </p>
            {canRegisterDrivers(user) && !search && vehicleTypeFilter === "all" && statusFilter === "all" && (
              <Link to="/drivers/new" className="btn btn-primary">
                + Add Driver
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
