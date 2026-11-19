import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { ConflictFlag, WaybillPhoto } from "@farmeriq/shared";
import { getWaybillDisplayId } from "@farmeriq/shared";
import { BackButton } from "../components/BackButton";
import { FarmerProfileGrid } from "../components/FarmerProfileGrid";
import { TruckTransitIcon } from "../components/dashboard/KpiIcons";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { useToast } from "../context/ToastContext";
import { useRequireAuth } from "../hooks/useFarmers";
import { useWaybill } from "../hooks/useWaybills";
import { apiAssetUrl } from "../lib/api-url";
import {
  deleteWaybill,
  fetchWaybillConflicts,
  fetchWaybillPhotos,
  formatWaybillDate,
  formatWaybillStatus,
  formatWeightSummary,
  isWaybillPdf,
  printSingleWaybill,
  resolveWaybillConflict,
  updateWaybill,
  waybillStatusBadgeClass,
} from "../lib/waybills";
import { waybillFormToPayload, waybillToFormData } from "./waybill-form/types";

export function WaybillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useRequireAuth();
  const navigate = useNavigate();
  const { waybill, loading, error, refetch } = useWaybill(id ?? "");
  const [photos, setPhotos] = useState<WaybillPhoto[]>([]);
  const [conflicts, setConflicts] = useState<ConflictFlag[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<WaybillPhoto | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const { confirm, alert } = useConfirmDialog();
  const { showSuccess } = useToast();

  const loadConflicts = useCallback(() => {
    if (!id) return;
    fetchWaybillConflicts(id)
      .then(setConflicts)
      .catch(() => setConflicts([]));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetchWaybillPhotos(id)
      .then(setPhotos)
      .catch(() => setPhotos([]));
    loadConflicts();
  }, [id, loadConflicts]);

  async function handleResolveConflict(conflictId: string, status: "resolved" | "dismissed") {
    if (!waybill) return;
    setResolvingId(conflictId);
    try {
      await resolveWaybillConflict(waybill.id, conflictId, status);
      showSuccess(
        status === "resolved" ? "Conflict Resolved" : "Conflict Dismissed",
        "The flag has been cleared."
      );
      loadConflicts();
    } catch {
      await alert("Could not update conflict status. Please try again.", "Error");
    } finally {
      setResolvingId(null);
    }
  }

  if (!user) return null;

  if (loading) {
    return (
      <main className="main main--wide">
        <p className="muted">Loading waybill…</p>
      </main>
    );
  }

  if (error || !waybill) {
    return (
      <main className="main main--wide">
        <BackButton to="/waybills" />
        <p className="error">{error?.message || "Waybill not found."}</p>
      </main>
    );
  }

  async function handleMarkDelivered() {
    if (!waybill) return;
    const confirmed = await confirm({
      title: "Mark Waybill as Delivered",
      message: `Are you sure you want to mark Waybill ${waybill.waybill_number} as delivered?`,
      confirmText: "Mark Delivered",
      variant: "primary",
    });
    if (!confirmed) return;

    setUpdatingStatus(true);
    try {
      const payload = waybillFormToPayload({
        ...waybillToFormData(waybill),
        status: "delivered",
      });
      await updateWaybill(waybill.id, payload);
      showSuccess("Waybill Delivered", `Waybill ${waybill.waybill_number} marked as delivered.`);
      refetch();
    } catch {
      await alert("Could not update waybill status. Please try again.", "Error");
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleDelete() {
    if (!waybill) return;
    const confirmed = await confirm({
      title: "Delete Waybill",
      message: `Are you sure you want to delete Waybill ${waybill.waybill_number}? It will be moved to the trash bin.`,
      confirmText: "Delete Waybill",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await deleteWaybill(waybill.id);
      showSuccess("Waybill Deleted", `Waybill ${waybill.waybill_number} moved to trash.`);
      navigate("/waybills");
    } catch {
      await alert("Could not delete waybill. Please try again.", "Error");
    }
  }

  const truckPhotos = photos.filter((p) => p.photo_type === "truck");
  const docPhotos = photos.filter((p) => p.photo_type === "waybill_doc");

  const weightVariance =
    waybill.weight_kg != null && waybill.received_weight_kg != null
      ? Number(waybill.received_weight_kg) - Number(waybill.weight_kg)
      : null;

  const routeFields = [
    { label: "Waybill Number", value: waybill.waybill_number },
    { label: "Date of Issuance", value: formatWaybillDate(waybill.issued_date) },
    {
      label: "Delivery Status",
      value: (
        <span className={waybillStatusBadgeClass(waybill.status)}>
          {formatWaybillStatus(waybill.status)}
        </span>
      ),
    },
    { label: "Waybill To (Buyer)", value: waybill.buyer_name || "—" },
    { label: "Aggregator Name", value: waybill.aggregator_name || "—" },
    { label: "Place of Loading", value: waybill.loading_location || "—" },
    { label: "Loading Region", value: waybill.loading_region || "—" },
    { label: "Place of Discharge", value: waybill.discharge_location || "—" },
    { label: "Added By", value: waybill.created_by_name || "—" },
    {
      label: "Recorded On",
      value: new Date(waybill.created_at).toLocaleString(),
    },
  ];

  const commodityFields = [
    { label: "Product Name", value: waybill.product_name || "—" },
    {
      label: "Quantity (Bags)",
      value:
        waybill.bag_count != null
          ? `${waybill.bag_count.toLocaleString("en-US")} ${waybill.bag_unit || "Bags"}`
          : "—",
    },
    { label: "Loading Weight", value: formatWeightSummary(waybill.weight_kg) },
    { label: "Received Weight", value: formatWeightSummary(waybill.received_weight_kg) },
    ...(weightVariance != null
      ? [
        {
          label: "Weight Variance",
          value: `${weightVariance > 0 ? "+" : ""}${weightVariance.toLocaleString("en-US", {
            maximumFractionDigits: 2,
          })} kg (${(weightVariance / 1000).toFixed(3)} MT)`,
        },
      ]
      : []),
    {
      label: "Items / Product Description",
      value: waybill.product_description || "—",
      fullWidth: true,
    },
  ];

  const transportFields = [
    { label: "Driver's Name", value: waybill.driver_name || "—" },
    { label: "Driver's Contact", value: waybill.driver_phone || "—" },
    { label: "Truck Number", value: waybill.truck_number || "—" },
    { label: "Notes / Remarks", value: waybill.notes || "—", fullWidth: true },
  ];

  return (
    <main className="main main--wide farmer-detail">
      <BackButton to="/waybills" />

      <div className="page-header farmer-detail__header">
        <div className="farmer-detail__identity">
          <div className="farmer-profile-avatar">
            <span
              className="farmer-profile-avatar__placeholder"
              style={{ display: "inline-flex" }}
              aria-hidden="true"
            >
              <TruckTransitIcon size={38} />
            </span>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap" }}>
              <h2>Waybill #{waybill.waybill_number}</h2>
              <span className={waybillStatusBadgeClass(waybill.status)}>
                {formatWaybillStatus(waybill.status)}
              </span>
            </div>
            <p className="muted">
              {[waybill.product_name, waybill.buyer_name].filter(Boolean).join(" · ") ||
                "No product or buyer specified"}
            </p>
            <p className="farmer-detail__id">
              <span className="muted">Issued</span> {formatWaybillDate(waybill.issued_date)}{" "}
              <span className="muted">· Ref</span>{" "}
              <span className="reference-id">{getWaybillDisplayId(waybill)}</span>
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {waybill.status === "in_transit" && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleMarkDelivered()}
              disabled={updatingStatus}
            >
              {updatingStatus ? "Updating…" : "Mark Delivered"}
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => printSingleWaybill(waybill)}
          >
            Print Record
          </button>
          <Link to={`/waybills/${waybill.id}/edit`} className="btn btn-secondary">
            Edit waybill
          </Link>
          <button type="button" className="btn btn-outline" onClick={() => void handleDelete()}>
            Delete
          </button>
        </div>
      </div>

      {conflicts.length > 0 && (
        <section className="card conflict-alerts">
          <h3 className="card-title">Flags for review</h3>
          <p className="card-desc">
            Automated checks found possible duplicates or weight discrepancies on this waybill.
          </p>
          <ul className="conflict-alerts__list">
            {conflicts.map((flag) => {
              const message =
                (flag.details?.message as string | undefined) ||
                "This waybill has conflicting or duplicate details.";
              const matchId = flag.details?.matching_waybill_id as string | undefined;
              return (
                <li key={flag.id} className="conflict-alerts__item">
                  <span className="conflict-alerts__badge">Review</span>
                  <span>{message}</span>
                  {matchId && (
                    <Link to={`/waybills/${matchId}`} className="link-btn">
                      View matching waybill
                    </Link>
                  )}
                  <div className="conflict-resolve">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={resolvingId === flag.id}
                      onClick={() => void handleResolveConflict(flag.id, "resolved")}
                    >
                      Mark resolved
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={resolvingId === flag.id}
                      onClick={() => void handleResolveConflict(flag.id, "dismissed")}
                    >
                      Dismiss
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="card farmer-detail__profile">
        <h3 className="card-section-title">Waybill &amp; Route Details</h3>
        <FarmerProfileGrid fields={routeFields} />
      </section>

      <section className="card farmer-detail__profile">
        <h3 className="card-section-title">Commodity, Quantity &amp; Weight</h3>
        <FarmerProfileGrid fields={commodityFields} />
      </section>

      <section className="card farmer-detail__profile">
        <h3 className="card-section-title">Driver &amp; Transport Details</h3>
        <FarmerProfileGrid fields={transportFields} />
      </section>

      <section className="card">
        <div className="section-toolbar">
          <h3 className="card-title">Truck &amp; Waybill Photos</h3>
          <div className="section-toolbar__actions">
            <Link to={`/waybills/${waybill.id}/edit`} className="btn btn-secondary btn-sm">
              Manage photos
            </Link>
          </div>
        </div>

        {photos.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No truck or waybill photos uploaded yet.
          </p>
        ) : (
          <div className="farmer-photos">
            {truckPhotos.length > 0 && (
              <div className="farmer-photos__group">
                <h4 className="farmer-photos__label">Truck Photos</h4>
                <div className="farmer-photos__grid">
                  {truckPhotos.map((photo) => (
                    <button
                      key={photo.id}
                      type="button"
                      className="farmer-photos__thumb"
                      onClick={() => setPreview(photo)}
                    >
                      <img src={apiAssetUrl(photo.url)} alt="Loaded truck" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {docPhotos.length > 0 && (
              <div className="farmer-photos__group">
                <h4 className="farmer-photos__label">Waybill / Weighbridge Files</h4>
                <div className="farmer-photos__grid">
                  {docPhotos.map((photo) => {
                    const isPdf = isWaybillPdf(photo);
                    return (
                      <button
                        key={photo.id}
                        type="button"
                        className="farmer-photos__thumb"
                        onClick={() => setPreview(photo)}
                        aria-label={isPdf ? "View PDF document" : "View waybill photo"}
                      >
                        {isPdf ? (
                          <div
                            style={{
                              width: "120px",
                              height: "90px",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "0.25rem",
                              background: "var(--palette-green-50)",
                              color: "var(--color-text)",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                            }}
                          >
                            <svg
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                              <line x1="9" y1="15" x2="15" y2="15" />
                            </svg>
                            <span>PDF</span>
                          </div>
                        ) : (
                          <img src={apiAssetUrl(photo.url)} alt="Waybill document" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {preview && (
        <div
          className="photo-modal"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreview(null)}
        >
          <div className="photo-modal__content" onClick={(e) => e.stopPropagation()}>
            {isWaybillPdf(preview) ? (
              <iframe
                src={apiAssetUrl(preview.url)}
                title="Waybill PDF document"
                style={{
                  width: "min(820px, 85vw)",
                  height: "75vh",
                  border: "none",
                  borderRadius: "var(--radius)",
                  background: "#ffffff",
                }}
              />
            ) : (
              <img
                className="photo-modal__image"
                src={apiAssetUrl(preview.url)}
                alt={preview.photo_type === "truck" ? "Loaded truck" : "Waybill document"}
              />
            )}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setPreview(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
