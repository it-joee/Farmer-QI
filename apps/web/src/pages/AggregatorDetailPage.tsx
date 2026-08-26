import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Aggregator, AggregatorPhoto } from "@farmeriq/shared";
import { getAggregatorDisplayId } from "@farmeriq/shared";
import { BackButton } from "../components/BackButton";
import { FarmerProfileAvatar } from "../components/FarmerProfileAvatar";
import { FarmerProfileGrid } from "../components/FarmerProfileGrid";
import { normalizeAggregator } from "../hooks/useAggregators";
import { useRequireAuth } from "../hooks/useFarmers";
import { fetchAggregator, fetchAggregatorPhotos } from "../lib/aggregators";
import { apiAssetUrl } from "../lib/api-url";

export function AggregatorDetailPage() {
  const { id } = useParams<{ id: string }>();
  useRequireAuth();

  const [aggregator, setAggregator] = useState<Aggregator | null>(null);
  const [photos, setPhotos] = useState<AggregatorPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError("");

    try {
      const [aggregatorData, photosData] = await Promise.all([
        fetchAggregator(id),
        fetchAggregatorPhotos(id),
      ]);

      setAggregator(normalizeAggregator(aggregatorData));
      setPhotos(photosData);
    } catch {
      setError("Could not load aggregator record.");
      setAggregator(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading) {
    return (
      <main className="main main--wide">
        <p className="muted">Loading aggregator…</p>
      </main>
    );
  }

  if (!aggregator || error) {
    return (
      <main className="main main--wide">
        <BackButton to="/aggregators" />
        <p className="error">{error || "Aggregator not found."}</p>
      </main>
    );
  }

  const portraitPhoto = photos.find((p) => p.photo_type === "portrait");
  const portraitUrl = portraitPhoto
    ? portraitPhoto.url.startsWith("http")
      ? portraitPhoto.url
      : apiAssetUrl(portraitPhoto.url)
    : undefined;

  const ghanaCardPhotos = photos.filter((p) => p.photo_type === "ghana_card");

  const profileFields = [
    { label: "Full Name", value: aggregator.full_name },
    { label: "Age", value: aggregator.age ? `${aggregator.age} years` : "—" },
    { label: "Contact / Phone", value: aggregator.phone ?? "—" },
    { label: "Town", value: aggregator.town ?? "—" },
    { label: "Business Name", value: aggregator.business_name ?? "—" },
    { label: "Ghana Card No", value: aggregator.ghana_card ?? "—" },
    { label: "Commodities", value: (aggregator.commodities ?? []).join(", ") || "—" },
    {
      label: "Registered On",
      value: new Date(aggregator.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    },
  ];

  return (
    <main className="main main--wide farmer-detail">
      <BackButton to="/aggregators" />

      <div className="page-header farmer-detail__header">
        <div className="farmer-detail__identity">
          <FarmerProfileAvatar name={aggregator.full_name} portraitUrl={portraitUrl} />
          <div>
            <h2>{aggregator.full_name}</h2>
            <p className="muted">
              {aggregator.business_name ? `${aggregator.business_name} · ` : ""}
              {aggregator.town || "Town not specified"}
            </p>
            <p className="farmer-detail__id">
              <span className="muted">ID</span>{" "}
              <span className="reference-id">{getAggregatorDisplayId(aggregator)}</span>
            </p>
          </div>
        </div>
        <Link to={`/aggregators/${aggregator.id}/edit`} className="btn btn-secondary">
          Edit profile
        </Link>
      </div>

      <section className="card farmer-detail__profile">
        <h3 className="card-section-title">Aggregator Details</h3>
        <FarmerProfileGrid fields={profileFields} />
      </section>

      {ghanaCardPhotos.length > 0 && (
        <section className="card">
          <h3 className="card-section-title">Ghana Card Photos</h3>
          <div className="photo-gallery">
            {ghanaCardPhotos.map((photo) => {
              const url = photo.url.startsWith("http") ? photo.url : apiAssetUrl(photo.url);
              return (
                <div key={photo.id} className="photo-gallery__item">
                  <img src={url} alt="Ghana Card" />
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
