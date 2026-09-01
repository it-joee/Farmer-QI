import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import {
  getPendingOfftaker,
  removePendingOfftaker,
} from "../lib/offline/store";
import { syncPendingOfftaker } from "../lib/offline/offtaker-sync";
import type { PendingOfftakerRecord } from "../lib/offline/types";
import { useToast } from "../context/ToastContext";
import { buildOfftakerCommodities } from "./offtaker-form/types";
import { FarmerProfileAvatar } from "../components/FarmerProfileAvatar";

function display(value: string | null | undefined): string {
  if (!value || value.trim() === "") return "—";
  return value;
}

export function PendingOfftakerDetailPage() {
  const { localId } = useParams<{ localId: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [record, setRecord] = useState<PendingOfftakerRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    async function load() {
      if (!localId) return;
      try {
        const r = await getPendingOfftaker(localId);
        if (!r) throw new Error("Draft not found");
        setRecord(r);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Not found");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [localId]);

  if (loading) {
    return <main className="main p-xl text-center">Loading draft details…</main>;
  }

  if (error || !record) {
    return (
      <main className="main p-xl text-center">
        <h2>Draft not found</h2>
        <p className="muted">{error}</p>
        <button className="btn btn-outline mt-md" onClick={() => navigate("/offtakers")}>
          Back to list
        </button>
      </main>
    );
  }

  const { form } = record;
  const isFailed = record.status === "failed";
  const commodities = buildOfftakerCommodities(form);

  async function handleSync() {
    if (!navigator.onLine) {
      showError("Offline", "You must be online to sync.");
      return;
    }
    setSyncing(true);
    try {
      const result = await syncPendingOfftaker(record!.localId);
      if (result === "synced") {
        showSuccess("Synced", "Offtaker has been saved to the server.");
        navigate("/offtakers");
      } else {
        const updated = await getPendingOfftaker(record!.localId);
        setRecord(updated);
        showError("Sync Failed", updated?.lastError || "Could not sync record.");
      }
    } catch (err) {
      showError("Sync Error", err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function handleDelete() {
    if (!record) return;
    if (!confirm("Are you sure you want to delete this draft? This cannot be undone.")) return;
    await removePendingOfftaker(record.localId);
    navigate("/offtakers");
  }

  const name = form.company_name || "Unnamed Offtaker";

  return (
    <main className="main main--wide farmer-detail">
      <BackButton to="/offtakers" />

      {isFailed && (
        <div className="alert alert--error mt-md mb-lg">
          <strong>Sync failed:</strong> {record.lastError}
        </div>
      )}

      <div className="page-header farmer-detail__header">
        <div className="farmer-detail__identity">
          <FarmerProfileAvatar name={name} />
          <div>
            <h2>{name}</h2>
            <p className="muted">{form.delivery_location || "—"}</p>
            <p className="farmer-detail__id">
              <span className="badge badge--pending">
                {isFailed ? "Sync Failed" : "Pending Sync"}
              </span>
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn btn-outline btn-sm" onClick={handleDelete}>
            Delete Draft
          </button>
          <Link to={`/pending-offtakers/${record.localId}/edit`} className="btn btn-secondary btn-sm">
            Edit Draft
          </Link>
          <button className="btn btn-primary btn-sm" onClick={handleSync} disabled={syncing}>
            {syncing ? "Syncing…" : "Sync Now"}
          </button>
        </div>
      </div>

      <section className="card farmer-detail__profile">
        <h3 className="card-section-title">Profile</h3>
        <dl className="detail-grid">
          <div className="detail-grid__item">
            <dt>Company Name</dt>
            <dd>{display(form.company_name)}</dd>
          </div>
          <div className="detail-grid__item">
            <dt>Name of Contact Person</dt>
            <dd>{display(form.contact_person)}</dd>
          </div>
          <div className="detail-grid__item">
            <dt>Contact / Phone</dt>
            <dd>{display(form.contact)}</dd>
          </div>
          <div className="detail-grid__item">
            <dt>Official Email</dt>
            <dd>{display(form.official_email)}</dd>
          </div>
          <div className="detail-grid__item">
            <dt>Designation</dt>
            <dd>{display(form.designation)}</dd>
          </div>
          <div className="detail-grid__item">
            <dt>Delivery Location</dt>
            <dd>{display(form.delivery_location)}</dd>
          </div>
          <div className="detail-grid__item">
            <dt>Payment Terms</dt>
            <dd>{display(form.payment_terms)}</dd>
          </div>
          <div className="detail-grid__item">
            <dt>Target Products</dt>
            <dd>{commodities.length > 0 ? commodities.join(", ") : "—"}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
