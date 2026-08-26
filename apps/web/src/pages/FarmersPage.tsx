import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { COMMODITIES } from "@farmeriq/shared";
import { canRegisterFarmers, farmersScopeLabel, getCurrentUser } from "../auth";
import { FarmerActionsMenu } from "../components/FarmerActionsMenu";
import { FarmerListMobileCard } from "../components/FarmerListMobileCard";
import { useOfflineSyncContext } from "../context/OfflineSyncContext";
import { SelectField } from "../components/fields/SelectField";
import { useFarmers, useAllFarmers, useRequireAuth } from "../hooks/useFarmers";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { useToast } from "../context/ToastContext";
import { getCommodityFilterOptions } from "../lib/dashboard-stats";
import { Pagination } from "../components/Pagination";
import { deleteFarmer } from "../lib/farmers";
import { removePendingFarmer } from "../lib/offline/store";
import { syncPendingFarmer } from "../lib/offline/sync";
import { buildPrimaryCommodities } from "./farmer-form/commodities";

export function FarmersPage() {
  const user = useRequireAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [commodityFilter, setCommodityFilter] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [search, commodityFilter]);

  const { farmers, pagination, loading, refetch } = useFarmers(page, 20, search, commodityFilter === "all" ? "" : commodityFilter);
  const { farmers: allFarmers } = useAllFarmers();
  const { pendingFarmers, refreshPending } = useOfflineSyncContext();
  const { confirm, alert } = useConfirmDialog();
  const { showSuccess } = useToast();

  const farmerStats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let thisMonth = allFarmers.filter((f) => new Date(f.created_at) >= monthStart).length;
    const districtSet = new Set(allFarmers.map((f) => f.district?.trim()).filter(Boolean));
    const regionSet = new Set(allFarmers.map((f) => f.region?.trim()).filter(Boolean));
    let male = 0;
    let female = 0;

    for (const f of allFarmers) {
      const g = f.gender?.trim().toLowerCase();
      if (g === "male" || g === "m") male++;
      else if (g === "female" || g === "f") female++;
    }

    for (const p of pendingFarmers) {
      if (new Date(p.createdAt) >= monthStart) thisMonth++;
      if (p.form.district?.trim()) districtSet.add(p.form.district.trim());
      if (p.form.region?.trim()) regionSet.add(p.form.region.trim());
      const g = p.form.gender?.trim().toLowerCase();
      if (g === "male" || g === "m") male++;
      else if (g === "female" || g === "f") female++;
    }

    return {
      thisMonth,
      districts: districtSet.size,
      regions: regionSet.size,
      male,
      female,
    };
  }, [allFarmers, pendingFarmers]);

  const commodityOptions = useMemo(
    () => getCommodityFilterOptions(farmers, COMMODITIES),
    [farmers]
  );

  // reset page to 1 when search or filter changes
  useEffect(() => {
    setPage(1);
  }, [search, commodityFilter]);

  const filteredPending = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pendingFarmers;

    return pendingFarmers.filter(
      (record) =>
        record.form.full_name.toLowerCase().includes(q) ||
        record.form.community.toLowerCase().includes(q) ||
        (record.form.district?.toLowerCase().includes(q) ?? false) ||
        (record.form.phone?.includes(q) ?? false) ||
        (record.form.ghana_card?.includes(q) ?? false)
    );
  }, [pendingFarmers, search]);

  const totalCount = pagination.total + filteredPending.length;

  async function handleDeleteSynced(farmerId: string, name: string) {
    const actor = getCurrentUser();
    if (!actor) return;
    const confirmed = await confirm({
      title: "Delete Farmer",
      message: `Are you sure you want to delete ${name}? This action cannot be undone.`,
      confirmText: "Delete Farmer",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await deleteFarmer(farmerId, actor.id);
      showSuccess("Farmer Deleted", `${name} has been deleted.`);
      refetch();
    } catch {
      await alert("Could not delete farmer. Please try again.", "Error");
    }
  }

  async function handleDeletePending(localId: string, name: string) {
    const confirmed = await confirm({
      title: "Remove Pending Farmer",
      message: `Are you sure you want to remove ${name} from this device? Unsaved data will be deleted.`,
      confirmText: "Remove",
      variant: "danger",
    });
    if (!confirmed) return;

    await removePendingFarmer(localId);
    await refreshPending();
    showSuccess("Pending Farmer Removed", `${name} removed from this device.`);
  }

  async function handleRetrySync(localId: string) {
    try {
      await syncPendingFarmer(localId);
      await refreshPending();
      refetch();
    } catch {
      await alert("Could not sync farmer. Check your internet connection and try again.", "Sync Failed");
      await refreshPending();
    }
  }

  if (!user) return null;

  return (
    <main className="main main--dashboard">
      <div className="toolbar">
        <div className="page-header" style={{ margin: 0 }}>
          <h2 style={{ margin: 0 }}>{farmersScopeLabel(user)}</h2>
          <p className="muted" style={{ margin: "0.25rem 0 0" }}>
            {totalCount} farmer{totalCount === 1 ? "" : "s"}
            {filteredPending.length > 0 && ` (${filteredPending.length} pending sync)`}
          </p>
        </div>
        {canRegisterFarmers(user) && (
          <Link to="/farmers/new" className="btn btn-primary">
            + Register Farmer
          </Link>
        )}
      </div>

      <div className="kpi-grid kpi-grid--5">
        <div className="kpi-card">
          <span className="kpi-card__value">{farmerStats.thisMonth}</span>
          <span className="kpi-card__label">Registered this month</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-card__value">{farmerStats.districts}</span>
          <span className="kpi-card__label">Districts covered</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-card__value">{farmerStats.regions}</span>
          <span className="kpi-card__label">Regions covered</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-card__value">{farmerStats.male}</span>
          <span className="kpi-card__label">Male</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-card__value">{farmerStats.female}</span>
          <span className="kpi-card__label">Female</span>
        </div>
      </div>

      <div className="card">
        <div className="farmers-filters">
          <div className="form-group" style={{ margin: 0, flex: 1 }}>
            <label htmlFor="farmer-search" className="sr-only">
              Search farmers
            </label>
            <input
              id="farmer-search"
              type="search"
              placeholder="Search by name, community, district, phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: "160px" }}>
            <label htmlFor="farmer-commodity-filter" className="sr-only">
              Filter by commodity
            </label>
            <SelectField
              id="farmer-commodity-filter"
              variant="compact"
              value={commodityFilter}
              onChange={setCommodityFilter}
              options={[
                { value: "all", label: "All commodities" },
                { value: "Not specified", label: "Not specified" },
                ...commodityOptions.map((c) => ({ value: c, label: c })),
              ]}
            />
          </div>
        </div>

        {filteredPending.length > 0 && (
          <>
            <div className="table-scroll farmer-list--desktop-only">
              <table className="table table--pending">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Community</th>
                  <th>District</th>
                  <th>Region</th>
                  <th>Commodities</th>
                  <th>Mobile</th>
                  <th>Status</th>
                  <th className="table__actions-col">More</th>
                </tr>
              </thead>
              <tbody>
                {filteredPending.map((record) => {
                  const commodities = buildPrimaryCommodities(record.form);
                  const name = record.form.full_name || "Draft (Unnamed)";
                  return (
                    <tr key={record.localId}>
                      <td>{name}</td>
                      <td>{record.form.community}</td>
                      <td>{record.form.district || "—"}</td>
                      <td>{record.form.region || "—"}</td>
                      <td>{commodities.join(", ") || "—"}</td>
                      <td>{record.form.phone || "—"}</td>
                      <td>
                        <span className={`sync-badge sync-badge--${record.status}`}>
                          {record.status === "failed"
                            ? "Sync failed"
                            : record.status === "syncing"
                              ? "Syncing…"
                              : "Pending sync"}
                        </span>
                        {record.lastError && (
                          <span className="sync-badge__error muted">{record.lastError}</span>
                        )}
                      </td>
                      <td className="table__actions-col">
                        <FarmerActionsMenu
                          label={`Actions for ${name}`}
                          items={[
                            {
                              label: "Full profile",
                              onClick: () => navigate(`/farmers/pending/${record.localId}`),
                            },
                            {
                              label: "Edit profile",
                              onClick: () => navigate(`/farmers/pending/${record.localId}/edit`),
                            },
                            {
                              label: "Retry sync",
                              onClick: () => void handleRetrySync(record.localId),
                            },
                            {
                              label: "Delete",
                              variant: "danger",
                              onClick: () => void handleDeletePending(record.localId, name),
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
              {filteredPending.map((record) => {
                const name = record.form.full_name || "Draft (Unnamed)";
                const status =
                  record.status === "failed"
                    ? "failed"
                    : record.status === "syncing"
                      ? "syncing"
                      : "pending";
                return (
                  <FarmerListMobileCard
                    key={record.localId}
                    name={name}
                    community={record.form.community}
                    phone={record.form.phone || null}
                    status={status}
                    onOpen={() => navigate(`/farmers/pending/${record.localId}`)}
                    menuItems={[
                      {
                        label: "Full profile",
                        onClick: () => navigate(`/farmers/pending/${record.localId}`),
                      },
                      {
                        label: "Edit profile",
                        onClick: () => navigate(`/farmers/pending/${record.localId}/edit`),
                      },
                      {
                        label: "Retry sync",
                        onClick: () => void handleRetrySync(record.localId),
                      },
                      {
                        label: "Delete",
                        variant: "danger",
                        onClick: () => void handleDeletePending(record.localId, name),
                      },
                    ]}
                  />
                );
              })}
            </div>
          </>
        )}

        {farmers.length > 0 ? (
          <>
            <div className="table-scroll farmer-list--desktop-only">
              <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Community</th>
                  <th>District</th>
                  <th>Region</th>
                  <th>Commodities</th>
                  <th>Mobile</th>
                  <th>Status</th>
                  <th className="table__actions-col">More</th>
                </tr>
              </thead>
              <tbody>
                {farmers.map((f) => {
                  const name = f.full_name || "Draft (Unnamed)";
                  return (
                  <tr key={f.id}>
                    <td>{name}</td>
                    <td>{f.community || "—"}</td>
                    <td>{f.district ?? "—"}</td>
                    <td>{f.region ?? "—"}</td>
                    <td>{(f.primary_crops ?? []).join(", ") || "—"}</td>
                    <td>{f.phone ?? "—"}</td>
                    <td>
                      <span className="sync-badge sync-badge--synced">Synced</span>
                    </td>
                    <td className="table__actions-col">
                      <FarmerActionsMenu
                        label={`Actions for ${name}`}
                        items={[
                          {
                            label: "Full profile",
                            onClick: () => navigate(`/farmers/${f.id}`),
                          },
                          {
                            label: "Edit profile",
                            onClick: () => navigate(`/farmers/${f.id}/edit`),
                          },
                          {
                            label: "Delete",
                            variant: "danger",
                            onClick: () => void handleDeleteSynced(f.id, name),
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
              {farmers.map((f) => {
                const name = f.full_name || "Draft (Unnamed)";
                return (
                <FarmerListMobileCard
                  key={f.id}
                  name={name}
                  community={f.community || "—"}
                  phone={f.phone}
                  status="synced"
                  onOpen={() => navigate(`/farmers/${f.id}`)}
                  menuItems={[
                    {
                      label: "Full profile",
                      onClick: () => navigate(`/farmers/${f.id}`),
                    },
                    {
                      label: "Edit profile",
                      onClick: () => navigate(`/farmers/${f.id}/edit`),
                    },
                    {
                      label: "Delete",
                      variant: "danger",
                      onClick: () => void handleDeleteSynced(f.id, name),
                    },
                  ]}
                />
                );
              })}
            </div>
            <Pagination
              page={pagination.page}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
            />
          </>
        ) : (
          !loading && <p className="muted" style={{ padding: "1rem" }}>No synced farmers match your criteria.</p>
        )}
      </div>
    </main>
  );
}
