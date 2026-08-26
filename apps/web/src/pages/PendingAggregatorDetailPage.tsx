import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import { FarmerProfileAvatar } from "../components/FarmerProfileAvatar";
import { FarmerProfileGrid } from "../components/FarmerProfileGrid";
import { useOfflineSyncContext } from "../context/OfflineSyncContext";
import { useRequireAuth } from "../hooks/useFarmers";
import { formatAggregatorLocalId } from "../lib/local-ids";
import { getPendingAggregator } from "../lib/offline/store";
import { syncPendingAggregator } from "../lib/offline/aggregator-sync";
import type { PendingAggregatorRecord, StoredPhoto } from "../lib/offline/types";
import { buildAggregatorCommodities } from "./aggregator-form/types";

function storedPhotoUrl(photo: StoredPhoto): string {
  return URL.createObjectURL(photo.data);
}

export function PendingAggregatorDetailPage() {
  const { localId } = useParams<{ localId: string }>();
  const navigate = useNavigate();
  const user = useRequireAuth();
  const { refreshPending } = useOfflineSyncContext();
  const [record, setRecord] = useState<PendingAggregatorRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const loadRecord = useCallback(async () => {
    if (!localId) return;
    setLoading(true);
    const data = await getPendingAggregator(localId);
    setRecord(data);
    setLoading(false);
  }, [localId]);

  useEffect(() => {
    void loadRecord();
  }, [loadRecord]);

  const photoUrls = useMemo(() => {
    if (!record) return { ghanaCard: [] as string[], portrait: null as string | null };
    return {
      ghanaCard: record.ghanaCardPhotos.map(storedPhotoUrl),
      portrait: record.aggregatorPhoto ? storedPhotoUrl(record.aggregatorPhoto) : null,
    };
  }, [record]);

  useEffect(() => {
    return () => {
      photoUrls.ghanaCard.forEach((url) => URL.revokeObjectURL(url));
      if (photoUrls.portrait) URL.revokeObjectURL(photoUrls.portrait);
    };
  }, [photoUrls]);

  async function handleRetrySync() {
    if (!localId || !user) return;
    setSyncing(true);
    setError("");
    try {
      const result = await syncPendingAggregator(localId);
      await refreshPending();
      if (result === "synced") {
        navigate("/aggregators");
        return;
      }
      await loadRecord();
      setError("Sync failed. Check your connection and try again.");
    } catch {
      setError("Could not sync this aggregator.");
      await loadRecord();
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <main className="main main--wide">
        <p className="muted">Loading aggregator…</p>
      </main>
    );
  }

  if (!record) {
    return (
      <main className="main main--wide">
        <BackButton to="/aggregators" />
        <p className="error">Aggregator record not found on this device.</p>
      </main>
    );
  }

  const statusLabel =
    record.status === "failed"
      ? "Sync failed"
      : record.status === "syncing"
        ? "Syncing…"
        : "Pending sync";

  const commodities = buildAggregatorCommodities(record.form);

  const profileFields = [
    { label: "Full Name", value: record.form.full_name || "—" },
    { label: "Age", value: record.form.age ? `${record.form.age} years` : "—" },
    { label: "Contact / Phone", value: record.form.phone || "—" },
    { label: "Town", value: record.form.town || "—" },
    { label: "Business Name", value: record.form.business_name || "—" },
    { label: "Ghana Card No", value: record.form.ghana_card || "—" },
    { label: "Commodities", value: commodities.join(", ") || "—" },
  ];

  return (
    <main className="main main--wide farmer-detail">
      <BackButton to="/aggregators" />

      <div
        className={`sync-banner sync-banner--${
          record.status === "failed" ? "error" : "pending"
        }`}
      >
        <span>
          <strong>{statusLabel}</strong>: This record is saved locally on this device.
          {record.lastError && ` (${record.lastError})`}
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => void handleRetrySync()}
          disabled={syncing}
        >
          {syncing ? "Syncing…" : "Sync now"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="page-header farmer-detail__header">
        <div className="farmer-detail__identity">
          <FarmerProfileAvatar
            name={record.form.full_name || "Aggregator"}
            portraitUrl={photoUrls.portrait ?? undefined}
          />
          <div>
            <h2>{record.form.full_name || "Draft (Unnamed)"}</h2>
            <p className="muted">
              {record.form.business_name ? `${record.form.business_name} · ` : ""}
              {record.form.town || "Town not set"}
            </p>
            <p className="farmer-detail__id">
              <span className="muted">Pending ID</span>{" "}
              <span className="reference-id">{formatAggregatorLocalId(record.localId)}</span>
            </p>
          </div>
        </div>
        <Link
          to={`/aggregators/pending/${record.localId}/edit`}
          className="btn btn-secondary"
        >
          Edit draft
        </Link>
      </div>

      <section className="card farmer-detail__profile">
        <h3 className="card-section-title">Aggregator Details</h3>
        <FarmerProfileGrid fields={profileFields} />
      </section>

      {photoUrls.ghanaCard.length > 0 && (
        <section className="card">
          <h3 className="card-section-title">Ghana Card Photos</h3>
          <div className="photo-gallery">
            {photoUrls.ghanaCard.map((url, i) => (
              <div key={i} className="photo-gallery__item">
                <img src={url} alt={`Ghana Card ${i + 1}`} />
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
