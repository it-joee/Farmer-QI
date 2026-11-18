import { Link, useNavigate, useParams } from "react-router-dom";
import { getDriverDisplayId } from "@farmeriq/shared";
import { BackButton } from "../components/BackButton";
import { FarmerProfileGrid } from "../components/FarmerProfileGrid";
import { DriverIcon } from "../components/dashboard/KpiIcons";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { useToast } from "../context/ToastContext";
import { useDriver } from "../hooks/useDrivers";
import { useRequireAuth } from "../hooks/useFarmers";
import { deleteDriver } from "../lib/drivers";

export function DriverDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useRequireAuth();
  const navigate = useNavigate();
  const { driver, loading, error } = useDriver(id ?? "");
  const { confirm, alert } = useConfirmDialog();
  const { showSuccess } = useToast();

  if (!user) return null;

  if (loading) {
    return (
      <main className="main main--wide">
        <p className="muted">Loading driver…</p>
      </main>
    );
  }

  if (error || !driver) {
    return (
      <main className="main main--wide">
        <BackButton to="/drivers" />
        <p className="error">{error?.message || "Driver not found."}</p>
      </main>
    );
  }

  async function handleDelete() {
    if (!driver) return;
    const confirmed = await confirm({
      title: "Delete Driver",
      message: `Are you sure you want to delete ${driver.full_name}? This action cannot be undone.`,
      confirmText: "Delete Driver",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await deleteDriver(driver.id);
      showSuccess("Driver Deleted", `${driver.full_name} has been deleted.`);
      navigate("/drivers");
    } catch {
      await alert("Could not delete driver. Please try again.", "Error");
    }
  }

  const profileFields = [
    { label: "Full name", value: driver.full_name },
    { label: "Phone", value: driver.phone || "—" },
    { label: "License number", value: driver.license_number || "—" },
    { label: "Vehicle type", value: driver.vehicle_type || "—" },
    { label: "Vehicle plate", value: driver.vehicle_plate || "—" },
    { label: "Assigned location", value: driver.assigned_location || "—" },
    { label: "Status", value: driver.status === "active" ? "Active" : "Inactive" },
    { label: "Added by", value: driver.created_by_name || "—" },
    { label: "Registered", value: new Date(driver.created_at).toLocaleString() },
  ];

  return (
    <main className="main main--wide farmer-detail">
      <BackButton to="/drivers" />

      <div className="page-header farmer-detail__header">
        <div className="farmer-detail__identity">
          <div className="farmer-profile-avatar">
            <span className="farmer-profile-avatar__placeholder" style={{ display: "inline-flex" }} aria-hidden="true">
              <DriverIcon />
            </span>
          </div>
          <div>
            <h2>{driver.full_name}</h2>
            <p className="muted">
              {[driver.vehicle_type, driver.vehicle_plate, driver.assigned_location]
                .filter(Boolean)
                .join(" · ") || "No vehicle assigned"}
            </p>
            <p className="farmer-detail__id">
              <span className="muted">ID</span>{" "}
              <span className="reference-id">{getDriverDisplayId(driver)}</span>
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Link to={`/drivers/${driver.id}/edit`} className="btn btn-secondary">
            Edit driver
          </Link>
          <button type="button" className="btn btn-outline" onClick={() => void handleDelete()}>
            Delete
          </button>
        </div>
      </div>

      <section className="card farmer-detail__profile">
        <h3 className="card-section-title">Driver Details</h3>
        <FarmerProfileGrid fields={profileFields} />
      </section>
    </main>
  );
}
