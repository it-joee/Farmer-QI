import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { COMMODITIES } from "@farmeriq/shared";
import { canRegisterFarmers, farmersScopeLabel, getCurrentUser } from "../auth";
import { FarmerActionsMenu } from "../components/FarmerActionsMenu";
import { useOfflineSyncContext } from "../context/OfflineSyncContext";
import { SelectField } from "../components/fields/SelectField";
import { useFarmers, useRequireAuth } from "../hooks/useFarmers";
import { getCommodityFilterOptions } from "../lib/dashboard-stats";
import { deleteFarmer } from "../lib/farmers";
import { removePendingFarmer } from "../lib/offline/store";
import { syncPendingFarmer } from "../lib/offline/sync";
import { buildPrimaryCommodities } from "./farmer-form/commodities";

export function FarmersPage() {
  const user = useRequireAuth();
  const navigate = useNavigate();
  const { farmers, refetch } = useFarmers();
  const { pendingFarmers, refreshPending } = useOfflineSyncContext();
  const [search, setSearch] = useState("");
  const [commodityFilter, setCommodityFilter] = useState("all");

  const commodityOptions = useMemo(
    () => getCommodityFilterOptions(farmers, COMMODITIES),
    [farmers]
  );

  const filtered = useMemo(() => {
    let list = farmers;

    if (commodityFilter === "Not specified") {
      list = list.filter((f) => !(f.primary_crops ?? []).length);
    } else if (commodityFilter !== "all") {
      list = list.filter((f) => (f.primary_crops ?? []).includes(commodityFilter));
    }

    const q = search.trim().toLowerCase();
    if (!q) return list;

    return list.filter(
      (f) =>
        f.full_name.toLowerCase().includes(q) ||
        f.community.toLowerCase().includes(q) ||
        (f.district?.toLowerCase().includes(q) ?? false) ||
        (f.phone?.includes(q) ?? false) ||
        (f.ghana_card?.includes(q) ?? false)
    );
  }, [farmers, search, commodityFilter]);

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

  const totalCount = filtered.length + filteredPending.length;

  async function handleDeleteSynced(farmerId: string, name: string) {
    const actor = getCurrentUser();
    if (!actor) return;
    const confirmed = window.confirm(`Delete ${name}? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await deleteFarmer(farmerId, actor.id);
      refetch();
    } catch {
      window.alert("Could not delete farmer. Try again.");
    }
  }

  async function handleDeletePending(localId: string, name: string) {
    const confirmed = window.confirm(`Remove ${name} from this device?`);
    if (!confirmed) return;

    await removePendingFarmer(localId);
    await refreshPending();
  }

  async function handleRetrySync(localId: string) {
    try {
      await syncPendingFarmer(localId);
      await refreshPending();
      refetch();
    } catch {
      window.alert("Could not sync farmer. Check your connection and try again.");
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
          <div className="table-scroll">
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
                  const name = record.form.full_name;
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
                          {record.status === "failed" ? "Sync failed" : "Pending sync"}
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
        )}

        {filtered.length > 0 && (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Community</th>
                  <th>District</th>
                  <th>Region</th>
                  <th>Commodities</th>
                  <th>Mobile</th>
                  <th>System ID</th>
                  <th className="table__actions-col">More</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => (
                  <tr key={f.id}>
                    <td>{f.full_name}</td>
                    <td>{f.community}</td>
                    <td>{f.district ?? "—"}</td>
                    <td>{f.region ?? "—"}</td>
                    <td>{(f.primary_crops ?? []).join(", ") || "—"}</td>
                    <td>{f.phone ?? "—"}</td>
                    <td>
                      <code className="system-id">{f.id}</code>
                    </td>
                    <td className="table__actions-col">
                      <FarmerActionsMenu
                        label={`Actions for ${f.full_name}`}
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
                            onClick: () => void handleDeleteSynced(f.id, f.full_name),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
