import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { ConflictFlag, CropCycle, FarmPlotDetail, Farmer, FarmerPhoto } from "@farmeriq/shared";
import { BackButton } from "../components/BackButton";
import { ConflictAlerts } from "../components/ConflictAlerts";
import { CropCycleSection } from "../components/CropCycleSection";
import { FarmerBoundarySection } from "../components/FarmerBoundarySection";
import { FarmerPhotosSection } from "../components/FarmerPhotosSection";
import { FarmerProfileAvatar } from "../components/FarmerProfileAvatar";
import { FarmerProfileGrid, profileFieldsFromFarmer } from "../components/FarmerProfileGrid";
import { normalizeFarmer, useRequireAuth } from "../hooks/useFarmers";
import { fetchFarmerConflicts } from "../lib/conflicts";
import { fetchCropCycles } from "../lib/crop-cycles";
import { fetchFarmer, fetchFarmerPhotos } from "../lib/farmers";
import { fetchFarmerPlots } from "../lib/plots";

export function FarmerDetailPage() {
  const { id } = useParams<{ id: string }>();
  useRequireAuth();

  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [plots, setPlots] = useState<FarmPlotDetail[]>([]);
  const [cropCycles, setCropCycles] = useState<CropCycle[]>([]);
  const [conflicts, setConflicts] = useState<ConflictFlag[]>([]);
  const [photos, setPhotos] = useState<FarmerPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError("");

    try {
      const [farmerData, plotsData, cyclesData, conflictsData, photosData] = await Promise.all([
        fetchFarmer(id),
        fetchFarmerPlots(id),
        fetchCropCycles(id),
        fetchFarmerConflicts(id),
        fetchFarmerPhotos(id),
      ]);

      setFarmer(normalizeFarmer(farmerData));
      setPlots(plotsData);
      setCropCycles(cyclesData);
      setConflicts(conflictsData);
      setPhotos(photosData);
    } catch {
      setError("Could not load farmer record.");
      setFarmer(null);
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
        <p className="muted">Loading farmer…</p>
      </main>
    );
  }

  if (!farmer || error) {
    return (
      <main className="main main--wide">
        <BackButton />
        <p className="error">{error || "Farmer not found."}</p>
      </main>
    );
  }

  return (
    <main className="main main--wide farmer-detail">
      <BackButton />

      <div className="page-header farmer-detail__header">
        <div className="farmer-detail__identity">
          <FarmerProfileAvatar
            name={farmer.full_name}
            portraitUrl={photos.find((p) => p.photo_type === "portrait")?.url}
          />
          <div>
            <h2>{farmer.full_name}</h2>
            <p className="muted">
              {farmer.community}
              {farmer.district ? ` · ${farmer.district}` : ""}
              {farmer.region ? ` · ${farmer.region}` : ""}
            </p>
            <p className="farmer-detail__id">
              <span className="muted">System ID</span>{" "}
              <code className="system-id">{farmer.id}</code>
            </p>
          </div>
        </div>
        <Link to={`/farmers/${farmer.id}/edit`} className="btn btn-secondary">
          Edit profile
        </Link>
      </div>

      <ConflictAlerts conflicts={conflicts} onResolved={loadData} />

      <section className="card farmer-detail__profile">
        <h3 className="card-section-title">Profile</h3>
        <FarmerProfileGrid fields={profileFieldsFromFarmer(farmer)} />
      </section>

      <FarmerPhotosSection photos={photos} />
      <FarmerBoundarySection farmerId={farmer.id} plots={plots} onUpdated={loadData} />
      <CropCycleSection
        farmerId={farmer.id}
        plots={plots}
        cropCycles={cropCycles}
        onUpdated={loadData}
      />
    </main>
  );
}
