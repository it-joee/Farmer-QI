import { useNavigate } from "react-router-dom";
import type { CreateDriverRequest } from "@farmeriq/shared";
import { BackButton } from "../components/BackButton";
import { DriverForm } from "../components/DriverForm";
import { useToast } from "../context/ToastContext";
import { useRequireAuth } from "../hooks/useFarmers";
import { createDriver } from "../lib/drivers";

export function AddDriverPage() {
  const user = useRequireAuth();
  const navigate = useNavigate();
  const { showSuccess } = useToast();

  if (!user) return null;

  async function handleSubmit(payload: CreateDriverRequest) {
    const { driver } = await createDriver(payload);
    showSuccess("Driver Added", `${driver.full_name} has been registered.`);
    navigate(`/drivers/${driver.id}`);
  }

  return (
    <main className="main main--wide">
      <BackButton to="/drivers" />
      <div className="page-header">
        <h2 style={{ margin: 0 }}>Add Driver</h2>
        <p className="muted" style={{ margin: "0.25rem 0 0" }}>
          Register a transport driver for logistics and deliveries
        </p>
      </div>
      <DriverForm
        submitLabel="Save driver"
        onSubmit={handleSubmit}
        onCancel={() => navigate("/drivers")}
      />
    </main>
  );
}
