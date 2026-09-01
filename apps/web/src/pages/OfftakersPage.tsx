import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { COMMODITIES } from "@farmeriq/shared";
import { canRegisterOfftakers, offtakersScopeLabel, getCurrentUser } from "../auth";
import { FarmerActionsMenu } from "../components/FarmerActionsMenu";
import { OfftakerListMobileCard } from "../components/OfftakerListMobileCard";
import { useOfflineSyncContext } from "../context/OfflineSyncContext";
import { SelectField } from "../components/fields/SelectField";
import { useOfftakers } from "../hooks/useOfftakers";
import { useRequireAuth } from "../hooks/useFarmers";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { useToast } from "../context/ToastContext";
import { getCommodityFilterOptions } from "../lib/dashboard-stats";
import { Pagination } from "../components/Pagination";
import { deleteOfftaker } from "../lib/offtakers";
import { removePendingOfftaker } from "../lib/offline/store";
import { syncPendingOfftaker } from "../lib/offline/offtaker-sync";
import { buildOfftakerCommodities } from "./offtaker-form/types";

export function OfftakersPage() {
  const user = useRequireAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [commodityFilter, setCommodityFilter] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [search, commodityFilter]);

  const { offtakers, pagination, loading, refetch } = useOfftakers(
    page,
    20,
    search,
    commodityFilter === "all" ? "" : commodityFilter
  );
  const { pendingOfftakers, refreshPending } = useOfflineSyncContext();
  const { confirm, alert } = useConfirmDialog();
  const { showSuccess } = useToast();

  const commodityOptions = useMemo(
    () =>
      getCommodityFilterOptions(
        offtakers.map((a) => ({ ...a, primary_crops: a.target_products })),
        COMMODITIES
      ),
    [offtakers]
  );

  const filteredPending = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pendingOfftakers;

    return pendingOfftakers.filter(
      (record) =>
        record.form.company_name.toLowerCase().includes(q) ||
        record.form.contact_person.toLowerCase().includes(q) ||
        (record.form.delivery_location?.toLowerCase().includes(q) ?? false) ||
        (record.form.contact?.includes(q) ?? false) ||
        (record.form.official_email?.includes(q) ?? false)
    );
  }, [pendingOfftakers, search]);

  const totalCount = pagination.total + filteredPending.length;

  async function handleDeleteSynced(offtakerId: string, name: string) {
    const actor = getCurrentUser();
    if (!actor) return;
    const confirmed = await confirm({
      title: "Delete Offtaker",
      message: `Are you sure you want to delete ${name}? This action cannot be undone.`,
      confirmText: "Delete Offtaker",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await deleteOfftaker(offtakerId, actor.id);
      showSuccess("Offtaker Deleted", `${name} has been deleted.`);
      refetch();
    } catch {
      await alert("Could not delete offtaker. Please try again.", "Error");
    }
  }

  async function handleDeletePending(localId: string, name: string) {
    const confirmed = await confirm({
      title: "Remove Pending Offtaker",
      message: `Are you sure you want to remove ${name} from this device? Unsaved data will be deleted.`,
      confirmText: "Remove",
      variant: "danger",
    });
    if (!confirmed) return;

    await removePendingOfftaker(localId);
    await refreshPending();
    showSuccess("Pending Offtaker Removed", `${name} removed from this device.`);
  }

  async function handleRetrySync(localId: string) {
    try {
      await syncPendingOfftaker(localId);
      await refreshPending();
      refetch();
    } catch {
      await alert(
        "Could not sync offtaker. Check your internet connection and try again.",
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
          <h2 style={{ margin: 0 }}>{offtakersScopeLabel(user)}</h2>
          <p className="muted" style={{ margin: "0.25rem 0 0" }}>
            {totalCount} offtaker{totalCount === 1 ? "" : "s"}
            {filteredPending.length > 0 && ` (${filteredPending.length} pending sync)`}
          </p>
        </div>
        {canRegisterOfftakers(user) && (
          <Link to="/offtakers/new" className="btn btn-primary">
            + Register Offtaker
          </Link>
        )}
      </div>

      <div className="card">
        <div className="farmers-filters">
          <div className="form-group" style={{ margin: 0, flex: 1 }}>
            <label htmlFor="offtaker-search" className="sr-only">
              Search offtakers
            </label>
            <input
              id="offtaker-search"
              type="search"
              placeholder="Search by name, town, business name, phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: "160px" }}>
            <label htmlFor="offtaker-commodity-filter" className="sr-only">
              Filter by commodity
            </label>
            <SelectField
              id="offtaker-commodity-filter"
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
                    <th>Company Name</th>
                    <th>Contact Person</th>
                    <th>Delivery Location</th>
                    <th>Target Products</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th className="table__actions-col">More</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPending.map((record) => {
                    const commodities = buildOfftakerCommodities(record.form);
                    const name = record.form.company_name || record.form.contact_person || "Draft (Unnamed)";
                    return (
                      <tr key={record.localId}>
                        <td>{record.form.company_name || "—"}</td>
                        <td>{record.form.contact_person || "—"}</td>
                        <td>{record.form.delivery_location || "—"}</td>
                        <td>{commodities.join(", ") || "—"}</td>
                        <td>{record.form.contact || "—"}</td>
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
                                onClick: () => navigate(`/offtakers/pending/${record.localId}`),
                              },
                              {
                                label: "Edit profile",
                                onClick: () => navigate(`/offtakers/pending/${record.localId}/edit`),
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
                const name = record.form.company_name || record.form.contact_person || "Draft (Unnamed)";
                const status =
                  record.status === "failed"
                    ? "failed"
                    : record.status === "syncing"
                      ? "syncing"
                      : "pending";
                return (
                  <OfftakerListMobileCard
                    key={record.localId}
                    name={name}
                    deliveryLocation={record.form.delivery_location}
                    companyName={record.form.company_name}
                    contact={record.form.contact || null}
                    status={status}
                    onOpen={() => navigate(`/offtakers/pending/${record.localId}`)}
                    menuItems={[
                      {
                        label: "Full profile",
                        onClick: () => navigate(`/offtakers/pending/${record.localId}`),
                      },
                      {
                        label: "Edit profile",
                        onClick: () => navigate(`/offtakers/pending/${record.localId}/edit`),
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

        {offtakers.length > 0 ? (
          <>
            <div className="table-scroll farmer-list--desktop-only">
              <table className="table">
                <thead>
                  <tr>
                    <th>Company Name</th>
                    <th>Contact Person</th>
                    <th>Delivery Location</th>
                    <th>Target Products</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th className="table__actions-col">More</th>
                  </tr>
                </thead>
                <tbody>
                  {offtakers.map((a) => {
                    const name = a.company_name || a.contact_person || "Draft (Unnamed)";
                    return (
                      <tr key={a.id}>
                        <td>{a.company_name || "—"}</td>
                        <td>{a.contact_person || "—"}</td>
                        <td>{a.delivery_location || "—"}</td>
                        <td>{(a.target_products ?? []).join(", ") || "—"}</td>
                        <td>{a.contact ?? "—"}</td>
                        <td>
                          <span className="sync-badge sync-badge--synced">Synced</span>
                        </td>
                        <td className="table__actions-col">
                          <FarmerActionsMenu
                            label={`Actions for ${name}`}
                            items={[
                              {
                                label: "Full profile",
                                onClick: () => navigate(`/offtakers/${a.id}`),
                              },
                              {
                                label: "Edit profile",
                                onClick: () => navigate(`/offtakers/${a.id}/edit`),
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
              {offtakers.map((a) => {
                const name = a.company_name || a.contact_person || "Draft (Unnamed)";
                return (
                  <OfftakerListMobileCard
                    key={a.id}
                    name={name}
                    deliveryLocation={a.delivery_location || "—"}
                    companyName={a.company_name}
                    contact={a.contact}
                    status="synced"
                    onOpen={() => navigate(`/offtakers/${a.id}`)}
                    menuItems={[
                      {
                        label: "Full profile",
                        onClick: () => navigate(`/offtakers/${a.id}`),
                      },
                      {
                        label: "Edit profile",
                        onClick: () => navigate(`/offtakers/${a.id}/edit`),
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
              No synced offtakers match your criteria.
            </p>
          )
        )}
      </div>
    </main>
  );
}
