import { useNavigate, useParams } from "react-router-dom";
import type { UpdateDriverRequest } from "@farmeriq/shared";
import { BackButton } from "../components/BackButton";
import { DriverForm } from "../components/DriverForm";
import { useToast } from "../context/ToastContext";
import { useDriver } from "../hooks/useDrivers";
import { useRequireAuth } from "../hooks/useFarmers";
import { updateDriver } from "../lib/drivers";

export function EditDriverPage() {
  const { id } = useParams<{ id: string }>();
  const user = useRequireAuth();
  const navigate = useNavigate();
  const { showSuccess } = useToast();
  const { driver, loading, error } = useDriver(id ?? "");

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

  async function handleSubmit(payload: UpdateDriverRequest) {
    if (!driver) return;
    await updateDriver(driver.id, payload);
    showSuccess("Driver Updated", `${payload.full_name} has been updated.`);
    navigate(`/drivers/${driver.id}`);
  }

  return (
    <main className="main main--wide">
      <BackButton to={`/drivers/${driver.id}`} />
      <div className="page-header">
        <h2 style={{ margin: 0 }}>Edit Driver</h2>
        <p className="muted" style={{ margin: "0.25rem 0 0" }}>
          Update details for {driver.full_name}
        </p>
      </div>
      <DriverForm
        initialValues={{
          full_name: driver.full_name,
          phone: driver.phone ?? "",
          license_number: driver.license_number ?? "",
          vehicle_type: driver.vehicle_type ?? "",
          vehicle_plate: driver.vehicle_plate ?? "",
          assigned_location: driver.assigned_location ?? "",
          status: driver.status,
        }}
        submitLabel="Update driver"
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/drivers/${driver.id}`)}
      />
    </main>
  );
}
