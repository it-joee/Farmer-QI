import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { COMMODITIES } from "@farmeriq/shared";
import { canRegisterFarmers, farmersScopeLabel, getCurrentUser } from "../auth";
import { FarmerActionsMenu } from "../components/FarmerActionsMenu";
import { FarmerListMobileCard } from "../components/FarmerListMobileCard";
import { useOfflineSyncContext } from "../context/OfflineSyncContext";
import { SelectField } from "../components/fields/SelectField";
import { useFarmers, useFarmerStats, useRequireAuth } from "../hooks/useFarmers";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { useToast } from "../context/ToastContext";
import { Pagination } from "../components/Pagination";
import { AnimatedNumber } from "../components/dashboard/AnimatedNumber";
import {
  FarmerTractorIcon,
  FemaleIcon,
  MaleIcon,
  MapPinIcon,
  RegionsMapIcon,
} from "../components/dashboard/KpiIcons";
import { deleteFarmer } from "../lib/farmers";
import { removePendingFarmer } from "../lib/offline/store";
import { syncPendingFarmer } from "../lib/offline/sync";
import { buildPrimaryCommodities } from "./farmer-form/commodities";

export function FarmersPage() {
  const user = useRequireAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [commodityFilter, setCommodityFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [search, commodityFilter, regionFilter, districtFilter, genderFilter]);

  const { farmers, pagination, loading, refetch } = useFarmers(
    page,
    20,
    search,
    commodityFilter === "all" ? "" : commodityFilter,
    regionFilter === "all" ? "" : regionFilter,
    districtFilter === "all" ? "" : districtFilter,
    genderFilter === "all" ? "" : genderFilter
  );
  const { stats } = useFarmerStats();
  const { pendingFarmers, refreshPending } = useOfflineSyncContext();
  const { confirm, alert } = useConfirmDialog();
  const { showSuccess } = useToast();

  const farmerStats = useMemo(() => {
    let male = stats.male;
    let female = stats.female;

    for (const p of pendingFarmers) {
      const g = p.form.gender?.trim().toLowerCase();
      if (g === "male" || g === "m") male++;
      else if (g === "female" || g === "f") female++;
    }

    return {
      totalRegistered: stats.totalRegistered + pendingFarmers.length,
      districts: stats.districts,
      regions: stats.regions,
      male,
      female,
    };
  }, [stats, pendingFarmers]);

  const commodityOptions = useMemo(() => {
    const names = new Set<string>(COMMODITIES);
    for (const b of stats.by_commodity) {
      if (b.label && b.label !== "Not specified") names.add(b.label);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [stats.by_commodity]);

  const regionOptions = useMemo(
    () =>
      stats.by_region
        .map((r) => r.label)
        .filter((l) => l && l !== "Not specified")
        .sort((a, b) => a.localeCompare(b)),
    [stats.by_region]
  );

  const districtOptions = useMemo(
    () =>
      stats.by_district
        .map((d) => d.label)
        .filter((l) => l && l !== "Not specified")
        .sort((a, b) => a.localeCompare(b)),
    [stats.by_district]
  );

  const hasActiveFilters =
    search.trim() !== "" ||
    commodityFilter !== "all" ||
    regionFilter !== "all" ||
    districtFilter !== "all" ||
    genderFilter !== "all";

  function clearFilters() {
    setSearch("");
    setCommodityFilter("all");
    setRegionFilter("all");
    setDistrictFilter("all");
    setGenderFilter("all");
  }

  const filteredPending = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pendingFarmers.filter((record) => {
      if (
        q &&
        !(
          record.form.full_name.toLowerCase().includes(q) ||
          record.form.community.toLowerCase().includes(q) ||
          (record.form.district?.toLowerCase().includes(q) ?? false) ||
          (record.form.phone?.includes(q) ?? false) ||
          (record.form.ghana_card?.includes(q) ?? false)
        )
      ) {
        return false;
      }
      if (regionFilter !== "all") {
        const reg = record.form.region?.trim() || "Not specified";
        if (reg.toLowerCase() !== regionFilter.toLowerCase()) return false;
      }
      if (districtFilter !== "all") {
        const dist = record.form.district?.trim() || "Not specified";
        if (dist.toLowerCase() !== districtFilter.toLowerCase()) return false;
      }
      if (genderFilter !== "all") {
        const g = record.form.gender?.trim().toLowerCase();
        if (genderFilter === "male" && g !== "male" && g !== "m") return false;
        if (genderFilter === "female" && g !== "female" && g !== "f") return false;
      }
      if (commodityFilter !== "all") {
        const crops = buildPrimaryCommodities(record.form);
        if (commodityFilter === "Not specified") {
          if (crops.length > 0) return false;
        } else if (!crops.some((c) => c.toLowerCase() === commodityFilter.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [pendingFarmers, search, regionFilter, districtFilter, genderFilter, commodityFilter]);

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
        <div className="reports-actions">
          <Link to="/farmers/import" className="btn btn-secondary" style={{ display: "none" }}>
            Upload Sheet
          </Link>
          {canRegisterFarmers(user) && (
            <Link to="/farmers/new" className="btn btn-primary">
              + Register Farmer
            </Link>
          )}
        </div>
      </div>

      <div className="kpi-grid kpi-grid--5">
        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__value">
              <AnimatedNumber value={farmerStats.totalRegistered} />
            </span>
            <span className="kpi-card__icon" aria-hidden="true">
              <FarmerTractorIcon />
            </span>
          </div>
          <span className="kpi-card__label">Total farmers registered</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__value">
              <AnimatedNumber value={farmerStats.districts} />
            </span>
            <span className="kpi-card__icon" aria-hidden="true">
              <MapPinIcon />
            </span>
          </div>
          <span className="kpi-card__label">Districts covered</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__value">
              <AnimatedNumber value={farmerStats.regions} />
            </span>
            <span className="kpi-card__icon" aria-hidden="true">
              <RegionsMapIcon />
            </span>
          </div>
          <span className="kpi-card__label">Regions covered</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__value">
              <AnimatedNumber value={farmerStats.male} />
            </span>
            <span className="kpi-card__icon" aria-hidden="true">
              <MaleIcon />
            </span>
          </div>
          <span className="kpi-card__label">Male</span>
        </div>
        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__value">
              <AnimatedNumber value={farmerStats.female} />
            </span>
            <span className="kpi-card__icon" aria-hidden="true">
              <FemaleIcon />
            </span>
          </div>
          <span className="kpi-card__label">Female</span>
        </div>
      </div>

      <div className="card">
        <div className="farmers-filters">
          <div className="form-group" style={{ margin: 0, flex: "1 1 220px", maxWidth: "280px" }}>
            <label htmlFor="farmer-search" className="sr-only">
              Search farmers
            </label>
            <input
              id="farmer-search"
              type="search"
              placeholder="Search name, community, phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: "150px" }}>
            <label htmlFor="farmer-region-filter" className="sr-only">
              Filter by region
            </label>
            <SelectField
              id="farmer-region-filter"
              variant="compact"
              value={regionFilter}
              onChange={setRegionFilter}
              options={[
                { value: "all", label: "All regions" },
                ...regionOptions.map((r) => ({ value: r, label: r })),
                { value: "Not specified", label: "Not specified" },
              ]}
            />
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: "150px" }}>
            <label htmlFor="farmer-district-filter" className="sr-only">
              Filter by district
            </label>
            <SelectField
              id="farmer-district-filter"
              variant="compact"
              value={districtFilter}
              onChange={setDistrictFilter}
              options={[
                { value: "all", label: "All districts" },
                ...districtOptions.map((d) => ({ value: d, label: d })),
                { value: "Not specified", label: "Not specified" },
              ]}
            />
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: "155px" }}>
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
                ...commodityOptions.map((c) => ({ value: c, label: c })),
                { value: "Not specified", label: "Not specified" },
              ]}
            />
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: "130px" }}>
            <label htmlFor="farmer-gender-filter" className="sr-only">
              Filter by gender
            </label>
            <SelectField
              id="farmer-gender-filter"
              variant="compact"
              value={genderFilter}
              onChange={setGenderFilter}
              options={[
                { value: "all", label: "All genders" },
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
              ]}
            />
          </div>
          {hasActiveFilters && (
            <button type="button" className="link-btn" onClick={clearFilters}>
              Clear filters
            </button>
          )}
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
                  <th>Added By</th>
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
                      <td>{user.full_name}</td>
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
                  <th>Added By</th>
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
                    <td>{f.created_by_name || "—"}</td>
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
