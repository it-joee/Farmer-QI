import { Navigate, Route, Routes } from "react-router-dom";
import {
  canAccessDrivers,
  canAccessOfftakers,
  canAccessOperations,
  canAccessReports,
  canRegisterAggregators,
  canRegisterDrivers,
  canRegisterFarmers,
  canRegisterOfftakers,
} from "./auth";
import { useRequireAuth } from "./hooks/useFarmers";
import { AppLayout } from "./components/layout/AppLayout";
import { AddFarmerPage } from "./pages/AddFarmerPage";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EditFarmerPage } from "./pages/EditFarmerPage";
import { EditPendingFarmerPage } from "./pages/EditPendingFarmerPage";
import { PendingFarmerDetailPage } from "./pages/PendingFarmerDetailPage";
import { FarmerDetailPage } from "./pages/FarmerDetailPage";
import { FarmersPage } from "./pages/FarmersPage";
import { AggregatorsPage } from "./pages/AggregatorsPage";
import { AddAggregatorPage } from "./pages/AddAggregatorPage";
import { EditAggregatorPage } from "./pages/EditAggregatorPage";
import { EditPendingAggregatorPage } from "./pages/EditPendingAggregatorPage";
import { PendingAggregatorDetailPage } from "./pages/PendingAggregatorDetailPage";
import { AggregatorDetailPage } from "./pages/AggregatorDetailPage";
import { EventsPage } from "./pages/EventsPage";
import { NewEventPage } from "./pages/NewEventPage";
import { EditEventPage } from "./pages/EditEventPage";
import { EventDetailPage } from "./pages/EventDetailPage";
import { DriversPage } from "./pages/DriversPage";
import { AddDriverPage } from "./pages/AddDriverPage";
import { EditDriverPage } from "./pages/EditDriverPage";
import { DriverDetailPage } from "./pages/DriverDetailPage";
import { LoginPage } from "./pages/LoginPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SetPasswordPage } from "./pages/SetPasswordPage";
import { UsersPage } from "./pages/UsersPage";
import { OfftakersPage } from "./pages/OfftakersPage";
import { AddOfftakerPage } from "./pages/AddOfftakerPage";
import { EditOfftakerPage } from "./pages/EditOfftakerPage";
import { EditPendingOfftakerPage } from "./pages/EditPendingOfftakerPage";
import { PendingOfftakerDetailPage } from "./pages/PendingOfftakerDetailPage";
import { OfftakerDetailPage } from "./pages/OfftakerDetailPage";
import { TrashPage } from "./pages/TrashPage";
import { WaybillsPage } from "./pages/WaybillsPage";
import { InvoicesPage } from "./pages/InvoicesPage";
import { AddWaybillPage } from "./pages/AddWaybillPage";
import { EditWaybillPage } from "./pages/EditWaybillPage";
import { WaybillDetailPage } from "./pages/WaybillDetailPage";

function RequireFarmersRegister({ children }: { children: React.ReactNode }) {
  const user = useRequireAuth();
  if (!user) return null;
  if (!canRegisterFarmers(user)) {
    return <Navigate to="/farmers" replace />;
  }
  return <>{children}</>;
}

function RequireAggregatorsRegister({ children }: { children: React.ReactNode }) {
  const user = useRequireAuth();
  if (!user) return null;
  if (!canRegisterAggregators(user)) {
    return <Navigate to="/aggregators" replace />;
  }
  return <>{children}</>;
}

function RequireOfftakersRegister({ children }: { children: React.ReactNode }) {
  const user = useRequireAuth();
  if (!user) return null;
  if (!canRegisterOfftakers(user)) {
    return <Navigate to="/offtakers" replace />;
  }
  return <>{children}</>;
}

function RequireDriversRegister({ children }: { children: React.ReactNode }) {
  const user = useRequireAuth();
  if (!user) return null;
  if (!canRegisterDrivers(user)) {
    return <Navigate to="/drivers" replace />;
  }
  return <>{children}</>;
}

function RequireEventsRegister({ children }: { children: React.ReactNode }) {
  const user = useRequireAuth();
  if (!user) return null;
  if (!canRegisterFarmers(user)) {
    return <Navigate to="/events" replace />;
  }
  return <>{children}</>;
}

function RequireOfftakersAccess({ children }: { children: React.ReactNode }) {
  const user = useRequireAuth();
  if (!user) return null;
  if (!canAccessOfftakers(user)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function RequireReportsAccess({ children }: { children: React.ReactNode }) {
  const user = useRequireAuth();
  if (!user) return null;
  if (!canAccessReports(user)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function RequireDriversAccess({ children }: { children: React.ReactNode }) {
  const user = useRequireAuth();
  if (!user) return null;
  if (!canAccessDrivers(user)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function RequireOperationsAccess({ children }: { children: React.ReactNode }) {
  const user = useRequireAuth();
  if (!user) return null;
  if (!canAccessOperations(user)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/set-password" element={<SetPasswordPage />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/farmers" element={<FarmersPage />} />
        <Route
          path="/farmers/new"
          element={
            <RequireFarmersRegister>
              <AddFarmerPage />
            </RequireFarmersRegister>
          }
        />
        <Route path="/farmers/import" element={<Navigate to="/farmers" replace />} />
        <Route
          path="/farmers/pending/:localId/edit"
          element={
            <RequireFarmersRegister>
              <EditPendingFarmerPage />
            </RequireFarmersRegister>
          }
        />
        <Route path="/farmers/pending/:localId" element={<PendingFarmerDetailPage />} />
        <Route path="/farmers/:id/edit" element={<EditFarmerPage />} />
        <Route path="/farmers/:id" element={<FarmerDetailPage />} />
        <Route path="/aggregators" element={<AggregatorsPage />} />
        <Route
          path="/aggregators/new"
          element={
            <RequireAggregatorsRegister>
              <AddAggregatorPage />
            </RequireAggregatorsRegister>
          }
        />
        <Route
          path="/aggregators/pending/:localId/edit"
          element={
            <RequireAggregatorsRegister>
              <EditPendingAggregatorPage />
            </RequireAggregatorsRegister>
          }
        />
        <Route path="/aggregators/pending/:localId" element={<PendingAggregatorDetailPage />} />
        <Route path="/aggregators/:id/edit" element={<EditAggregatorPage />} />
        <Route path="/aggregators/:id" element={<AggregatorDetailPage />} />
        <Route
          path="/offtakers"
          element={
            <RequireOfftakersAccess>
              <OfftakersPage />
            </RequireOfftakersAccess>
          }
        />
        <Route
          path="/offtakers/new"
          element={
            <RequireOfftakersRegister>
              <AddOfftakerPage />
            </RequireOfftakersRegister>
          }
        />
        <Route
          path="/offtakers/pending/:localId/edit"
          element={
            <RequireOfftakersRegister>
              <EditPendingOfftakerPage />
            </RequireOfftakersRegister>
          }
        />
        <Route
          path="/offtakers/pending/:localId"
          element={
            <RequireOfftakersAccess>
              <PendingOfftakerDetailPage />
            </RequireOfftakersAccess>
          }
        />
        <Route
          path="/offtakers/:id/edit"
          element={
            <RequireOfftakersAccess>
              <EditOfftakerPage />
            </RequireOfftakersAccess>
          }
        />
        <Route
          path="/offtakers/:id"
          element={
            <RequireOfftakersAccess>
              <OfftakerDetailPage />
            </RequireOfftakersAccess>
          }
        />
        <Route
          path="/drivers"
          element={
            <RequireDriversAccess>
              <DriversPage />
            </RequireDriversAccess>
          }
        />
        <Route
          path="/drivers/new"
          element={
            <RequireDriversRegister>
              <AddDriverPage />
            </RequireDriversRegister>
          }
        />
        <Route
          path="/drivers/:id/edit"
          element={
            <RequireDriversAccess>
              <EditDriverPage />
            </RequireDriversAccess>
          }
        />
        <Route
          path="/drivers/:id"
          element={
            <RequireDriversAccess>
              <DriverDetailPage />
            </RequireDriversAccess>
          }
        />
        <Route
          path="/waybills"
          element={
            <RequireOperationsAccess>
              <WaybillsPage />
            </RequireOperationsAccess>
          }
        />
        <Route
          path="/waybills/new"
          element={
            <RequireOperationsAccess>
              <AddWaybillPage />
            </RequireOperationsAccess>
          }
        />
        <Route
          path="/waybills/:id/edit"
          element={
            <RequireOperationsAccess>
              <EditWaybillPage />
            </RequireOperationsAccess>
          }
        />
        <Route
          path="/waybills/:id"
          element={
            <RequireOperationsAccess>
              <WaybillDetailPage />
            </RequireOperationsAccess>
          }
        />
        <Route
          path="/invoices"
          element={
            <RequireOperationsAccess>
              <InvoicesPage />
            </RequireOperationsAccess>
          }
        />
        <Route
          path="/reports"
          element={
            <RequireReportsAccess>
              <ReportsPage />
            </RequireReportsAccess>
          }
        />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/trash" element={<TrashPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route
          path="/events/new"
          element={
            <RequireEventsRegister>
              <NewEventPage />
            </RequireEventsRegister>
          }
        />
        <Route
          path="/events/pending/:localId/edit"
          element={
            <RequireEventsRegister>
              <EditEventPage />
            </RequireEventsRegister>
          }
        />
        <Route path="/events/pending/:localId" element={<EventDetailPage />} />
        <Route path="/events/:id/edit" element={<EditEventPage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
