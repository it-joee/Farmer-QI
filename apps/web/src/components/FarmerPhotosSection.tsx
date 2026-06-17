import { useState } from "react";
import type { FarmerPhoto } from "@farmeriq/shared";

interface FarmerPhotosSectionProps {
  photos: FarmerPhoto[];
}

export function FarmerPhotosSection({ photos }: FarmerPhotosSectionProps) {
  const [preview, setPreview] = useState<FarmerPhoto | null>(null);

  const ghanaCardPhotos = photos.filter((p) => p.photo_type === "ghana_card");
  const portrait = photos.find((p) => p.photo_type === "portrait");

  if (photos.length === 0) {
    return (
      <section className="card">
        <h3 className="card-title">Photos</h3>
        <p className="muted">No photos uploaded yet.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <h3 className="card-title">Photos</h3>
      <div className="farmer-photos">
        {portrait && (
          <div className="farmer-photos__group">
            <h4 className="farmer-photos__label">Farmer portrait</h4>
            <button type="button" className="farmer-photos__thumb" onClick={() => setPreview(portrait)}>
              <img src={portrait.url} alt="Farmer portrait" />
            </button>
          </div>
        )}
        {ghanaCardPhotos.length > 0 && (
          <div className="farmer-photos__group">
            <h4 className="farmer-photos__label">Ghana Card</h4>
            <div className="farmer-photos__grid">
              {ghanaCardPhotos.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  className="farmer-photos__thumb"
                  onClick={() => setPreview(photo)}
                >
                  <img src={photo.url} alt="Ghana Card" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {preview && (
        <div className="photo-modal" role="dialog" aria-modal="true" onClick={() => setPreview(null)}>
          <div className="photo-modal__content" onClick={(e) => e.stopPropagation()}>
            <img
              className="photo-modal__image"
              src={preview.url}
              alt={preview.photo_type === "portrait" ? "Farmer portrait" : "Ghana Card"}
            />
            <button type="button" className="btn btn-secondary" onClick={() => setPreview(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
