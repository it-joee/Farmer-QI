import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BackButton } from "../components/BackButton";
import { FarmBoundaryMap } from "../components/FarmBoundaryMap";
import { FarmerProfileAvatar } from "../components/FarmerProfileAvatar";
import { FarmerProfileGrid, profileFieldsFromForm } from "../components/FarmerProfileGrid";
import { useOfflineSyncContext } from "../context/OfflineSyncContext";
import { useRequireAuth } from "../hooks/useFarmers";
import { formatFarmerLocalId } from "../lib/local-ids";
import { getPendingFarmer, syncPendingFarmer } from "../lib/offline/sync";
import type { PendingFarmerRecord, StoredPhoto } from "../lib/offline/types";

function storedPhotoUrl(photo: StoredPhoto): string {
  return URL.createObjectURL(photo.data);
}

export function PendingFarmerDetailPage() {
  const { localId } = useParams<{ localId: string }>();
  const navigate = useNavigate();
  const user = useRequireAuth();
  const { refreshPending } = useOfflineSyncContext();
  const [record, setRecord] = useState<PendingFarmerRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const loadRecord = useCallback(async () => {
    if (!localId) return;
    setLoading(true);
    const data = await getPendingFarmer(localId);
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
      portrait: record.farmerPhoto ? storedPhotoUrl(record.farmerPhoto) : null,
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
      const result = await syncPendingFarmer(localId);
      await refreshPending();
      if (result === "synced") {
        navigate("/farmers");
        return;
      }
      await loadRecord();
      setError("Sync failed. Check your connection and try again.");
    } catch {
      setError("Could not sync this farmer.");
      await loadRecord();
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <main className="main main--wide">
        <p className="muted">Loading farmer…</p>
      </main>
    );
  }

  if (!record) {
    return (
      <main className="main main--wide">
        <BackButton />
        <p className="error">Farmer record not found on this device.</p>
      </main>
    );
  }

  const statusLabel =
    record.status === "failed" ? "Sync failed" : record.status === "syncing" ? "Syncing…" : "Pending sync";

  return (
    <main className="main main--wide farmer-detail">
      <BackButton />

      <div className={`sync-banner sync-banner--${record.status === "failed" ? "error" : "pending"}`}>
        <span>
          {statusLabel} — saved on this device
          {record.lastError ? `: ${record.lastError}` : ""}
        </span>
      </div>

      <div className="page-header farmer-detail__header">
        <div className="farmer-detail__identity">
          <FarmerProfileAvatar name={record.form.full_name} portraitUrl={photoUrls.portrait} />
          <div>
            <h2>{record.form.full_name}</h2>
            <p className="muted">
              {record.form.community}
              {record.form.district ? ` · ${record.form.district}` : ""}
              {record.form.region ? ` · ${record.form.region}` : ""}
            </p>
            <p className="farmer-detail__id">
              <span className="muted">Local ID</span>{" "}
              <span className="reference-id">{formatFarmerLocalId(record.localId)}</span>
            </p>
          </div>
        </div>
        <div className="section-toolbar__actions">
          <Link to={`/farmers/pending/${record.localId}/edit`} className="btn btn-secondary">
            Edit profile
          </Link>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleRetrySync}
            disabled={syncing || record.status === "syncing"}
          >
            {syncing ? "Syncing…" : "Retry sync"}
          </button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <section className="card farmer-detail__profile">
        <h3 className="card-section-title">Profile</h3>
        <FarmerProfileGrid fields={profileFieldsFromForm(record.form)} />
      </section>

      {(photoUrls.portrait || photoUrls.ghanaCard.length > 0) && (
        <section className="card">
          <h3 className="card-section-title">Photos</h3>
          <div className="farmer-photos">
            {photoUrls.portrait && (
              <div className="farmer-photos__group">
                <h4 className="farmer-photos__label">Farmer portrait</h4>
                <div className="farmer-photos__thumb">
                  <img src={photoUrls.portrait} alt="Farmer portrait" />
                </div>
              </div>
            )}
            {photoUrls.ghanaCard.length > 0 && (
              <div className="farmer-photos__group">
                <h4 className="farmer-photos__label">Ghana Card</h4>
                <div className="farmer-photos__grid">
                  {photoUrls.ghanaCard.map((url, index) => (
                    <div key={url} className="farmer-photos__thumb">
                      <img src={url} alt={`Ghana Card ${index + 1}`} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {record.boundaryEnabled && record.boundaryPins.length >= 3 && (
        <section className="card">
          <h3 className="card-section-title">Farm boundary</h3>
          <p className="card-desc">Captured locally — will upload when synced</p>
          <FarmBoundaryMap pins={record.boundaryPins} />
        </section>
      )}
    </main>
  );
}
