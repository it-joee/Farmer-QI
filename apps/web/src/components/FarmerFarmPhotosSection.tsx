import { useState } from "react";
import type { FarmerPhoto } from "@farmeriq/shared";
import { PhotoCaptureField } from "./PhotoCaptureField";
import { apiAssetUrl } from "../lib/api-url";
import type { CapturedPhoto } from "../lib/photos";
import { deleteFarmerPhoto, uploadFarmPhotos } from "../lib/photos";

interface FarmerFarmPhotosSectionProps {
  farmerId: string;
  photos: FarmerPhoto[];
  onUpdated: () => void;
}

function photoSrc(url: string) {
  return url.startsWith("http") ? url : apiAssetUrl(url);
}

export function FarmerFarmPhotosSection({
  farmerId,
  photos,
  onUpdated,
}: FarmerFarmPhotosSectionProps) {
  const [adding, setAdding] = useState(false);
  const [newPhotos, setNewPhotos] = useState<CapturedPhoto[]>([]);
  const [preview, setPreview] = useState<FarmerPhoto | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const hasPhotos = photos.length > 0;

  function startAdd() {
    setNewPhotos([]);
    setAdding(true);
    setError("");
  }

  function cancel() {
    setAdding(false);
    setNewPhotos([]);
    setError("");
  }

  async function save() {
    if (newPhotos.length === 0) {
      setError("Add at least one farm photo.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await uploadFarmPhotos(farmerId, newPhotos);
      setAdding(false);
      setNewPhotos([]);
      onUpdated();
    } catch {
      setError("Could not save farm photos. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function removePhoto(photoId: string) {
    setBusyId(photoId);
    setError("");

    try {
      await deleteFarmerPhoto(photoId);
      onUpdated();
    } catch {
      setError("Could not remove photo.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="card">
      <div className="section-toolbar">
        <div>
          <h3 className="card-title">Farm photos</h3>
          <p className="card-desc">Pictures of the farmer&apos;s land, crops, or farm structures</p>
        </div>
        {!adding && (
          <div className="section-toolbar__actions">
            <button type="button" className="btn btn-primary" onClick={startAdd}>
              {hasPhotos ? "Add more" : "Add farm photos"}
            </button>
          </div>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {adding ? (
        <>
          <PhotoCaptureField
            label="New farm photos"
            hint="Capture or upload photos of the farm — fields, crops, storage, or other features."
            photos={newPhotos}
            onChange={setNewPhotos}
            multiple
            maxPhotos={8}
          />
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={cancel} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save photos"}
            </button>
          </div>
        </>
      ) : hasPhotos ? (
        <>
          <div className="farmer-photos__grid farmer-farm-photos__grid">
            {photos.map((photo) => (
              <div key={photo.id} className="farmer-farm-photos__item">
                <button
                  type="button"
                  className="farmer-photos__thumb"
                  onClick={() => setPreview(photo)}
                >
                  <img src={photoSrc(photo.url)} alt="Farm" />
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn--sm farmer-farm-photos__remove"
                  disabled={busyId === photo.id}
                  onClick={() => void removePhoto(photo.id)}
                >
                  {busyId === photo.id ? "Removing…" : "Remove"}
                </button>
              </div>
            ))}
          </div>
          <p className="muted farmer-farm-photos__count">
            {photos.length} farm photo{photos.length === 1 ? "" : "s"} on file
          </p>
        </>
      ) : (
        <p className="muted">No farm photos yet.</p>
      )}

      {preview && (
        <div className="photo-modal" role="dialog" aria-modal="true" onClick={() => setPreview(null)}>
          <div className="photo-modal__content" onClick={(e) => e.stopPropagation()}>
            <img className="photo-modal__image" src={photoSrc(preview.url)} alt="Farm" />
            <button type="button" className="btn btn-secondary" onClick={() => setPreview(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
