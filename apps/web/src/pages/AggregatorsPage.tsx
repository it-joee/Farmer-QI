import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { COMMODITIES } from "@farmeriq/shared";
import { canRegisterAggregators, aggregatorsScopeLabel, getCurrentUser } from "../auth";
import { FarmerActionsMenu } from "../components/FarmerActionsMenu";
import { AggregatorListMobileCard } from "../components/AggregatorListMobileCard";
import { useOfflineSyncContext } from "../context/OfflineSyncContext";
import { SelectField } from "../components/fields/SelectField";
import { useAggregators } from "../hooks/useAggregators";
import { useRequireAuth } from "../hooks/useFarmers";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { useToast } from "../context/ToastContext";
import { getCommodityFilterOptions } from "../lib/dashboard-stats";
import { Pagination } from "../components/Pagination";
import { deleteAggregator } from "../lib/aggregators";
import { removePendingAggregator } from "../lib/offline/store";
import { syncPendingAggregator } from "../lib/offline/aggregator-sync";
import { buildAggregatorCommodities } from "./aggregator-form/types";

export function AggregatorsPage() {
  const user = useRequireAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [commodityFilter, setCommodityFilter] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [search, commodityFilter]);

  const { aggregators, pagination, loading, refetch } = useAggregators(
    page,
    20,
    search,
    commodityFilter === "all" ? "" : commodityFilter
  );
  const { pendingAggregators, refreshPending } = useOfflineSyncContext();
  const { confirm, alert } = useConfirmDialog();
  const { showSuccess } = useToast();

  const commodityOptions = useMemo(
    () =>
      getCommodityFilterOptions(
        aggregators.map((a) => ({ ...a, primary_crops: a.commodities })),
        COMMODITIES
      ),
    [aggregators]
  );

  const filteredPending = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pendingAggregators;

    return pendingAggregators.filter(
      (record) =>
        record.form.full_name.toLowerCase().includes(q) ||
        (record.form.town?.toLowerCase().includes(q) ?? false) ||
        (record.form.business_name?.toLowerCase().includes(q) ?? false) ||
        (record.form.phone?.includes(q) ?? false) ||
        (record.form.ghana_card?.includes(q) ?? false)
    );
  }, [pendingAggregators, search]);

  const totalCount = pagination.total + filteredPending.length;

  async function handleDeleteSynced(aggregatorId: string, name: string) {
    const actor = getCurrentUser();
    if (!actor) return;
    const confirmed = await confirm({
      title: "Delete Aggregator",
      message: `Are you sure you want to delete ${name}? This action cannot be undone.`,
      confirmText: "Delete Aggregator",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await deleteAggregator(aggregatorId, actor.id);
      showSuccess("Aggregator Deleted", `${name} has been deleted.`);
      refetch();
    } catch {
      await alert("Could not delete aggregator. Please try again.", "Error");
    }
  }

  async function handleDeletePending(localId: string, name: string) {
    const confirmed = await confirm({
      title: "Remove Pending Aggregator",
      message: `Are you sure you want to remove ${name} from this device? Unsaved data will be deleted.`,
      confirmText: "Remove",
      variant: "danger",
    });
    if (!confirmed) return;

    await removePendingAggregator(localId);
    await refreshPending();
    showSuccess("Pending Aggregator Removed", `${name} removed from this device.`);
  }

  async function handleRetrySync(localId: string) {
    try {
      await syncPendingAggregator(localId);
      await refreshPending();
      refetch();
    } catch {
      await alert(
        "Could not sync aggregator. Check your internet connection and try again.",
        "Sync Failed"
      );
      await refreshPending();
    }
  }

  if (!user) return null;

  return (
    <main className="main main--dashboard">
      <div className="toolbar">
        <div className="page-header" style={{ margin: 0 }}>
          <h2 style={{ margin: 0 }}>{aggregatorsScopeLabel(user)}</h2>
          <p className="muted" style={{ margin: "0.25rem 0 0" }}>
            {totalCount} aggregator{totalCount === 1 ? "" : "s"}
            {filteredPending.length > 0 && ` (${filteredPending.length} pending sync)`}
          </p>
        </div>
        {canRegisterAggregators(user) && (
          <Link to="/aggregators/new" className="btn btn-primary">
            + Register Aggregator
          </Link>
        )}
      </div>

      <div className="card">
        <div className="farmers-filters">
          <div className="form-group" style={{ margin: 0, flex: 1 }}>
            <label htmlFor="aggregator-search" className="sr-only">
              Search aggregators
            </label>
            <input
              id="aggregator-search"
              type="search"
              placeholder="Search by name, town, business name, phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: "160px" }}>
            <label htmlFor="aggregator-commodity-filter" className="sr-only">
              Filter by commodity
            </label>
            <SelectField
              id="aggregator-commodity-filter"
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
                    <th>Business Name</th>
                    <th>Town</th>
                    <th>Commodities</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th className="table__actions-col">More</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPending.map((record) => {
                    const commodities = buildAggregatorCommodities(record.form);
                    const name = record.form.full_name || "Draft (Unnamed)";
                    return (
                      <tr key={record.localId}>
                        <td>{name}</td>
                        <td>{record.form.business_name || "—"}</td>
                        <td>{record.form.town || "—"}</td>
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
                                onClick: () => navigate(`/aggregators/pending/${record.localId}`),
                              },
                              {
                                label: "Edit profile",
                                onClick: () => navigate(`/aggregators/pending/${record.localId}/edit`),
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
                  <AggregatorListMobileCard
                    key={record.localId}
                    name={name}
                    town={record.form.town}
                    businessName={record.form.business_name}
                    phone={record.form.phone || null}
                    status={status}
                    onOpen={() => navigate(`/aggregators/pending/${record.localId}`)}
                    menuItems={[
                      {
                        label: "Full profile",
                        onClick: () => navigate(`/aggregators/pending/${record.localId}`),
                      },
                      {
                        label: "Edit profile",
                        onClick: () => navigate(`/aggregators/pending/${record.localId}/edit`),
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

        {aggregators.length > 0 ? (
          <>
            <div className="table-scroll farmer-list--desktop-only">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Business Name</th>
                    <th>Town</th>
                    <th>Commodities</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th className="table__actions-col">More</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregators.map((a) => {
                    const name = a.full_name || "Draft (Unnamed)";
                    return (
                      <tr key={a.id}>
                        <td>{name}</td>
                        <td>{a.business_name || "—"}</td>
                        <td>{a.town || "—"}</td>
                        <td>{(a.commodities ?? []).join(", ") || "—"}</td>
                        <td>{a.phone ?? "—"}</td>
                        <td>
                          <span className="sync-badge sync-badge--synced">Synced</span>
                        </td>
                        <td className="table__actions-col">
                          <FarmerActionsMenu
                            label={`Actions for ${name}`}
                            items={[
                              {
                                label: "Full profile",
                                onClick: () => navigate(`/aggregators/${a.id}`),
                              },
                              {
                                label: "Edit profile",
                                onClick: () => navigate(`/aggregators/${a.id}/edit`),
                              },
                              {
                                label: "Delete",
                                variant: "danger",
                                onClick: () => void handleDeleteSynced(a.id, name),
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
              {aggregators.map((a) => {
                const name = a.full_name || "Draft (Unnamed)";
                return (
                  <AggregatorListMobileCard
                    key={a.id}
                    name={name}
                    town={a.town || "—"}
                    businessName={a.business_name}
                    phone={a.phone}
                    status="synced"
                    onOpen={() => navigate(`/aggregators/${a.id}`)}
                    menuItems={[
                      {
                        label: "Full profile",
                        onClick: () => navigate(`/aggregators/${a.id}`),
                      },
                      {
                        label: "Edit profile",
                        onClick: () => navigate(`/aggregators/${a.id}/edit`),
                      },
                      {
                        label: "Delete",
                        variant: "danger",
                        onClick: () => void handleDeleteSynced(a.id, name),
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
          !loading && (
            <p className="muted" style={{ padding: "1rem" }}>
              No synced aggregators match your criteria.
            </p>
          )
        )}
      </div>
    </main>
  );
}
