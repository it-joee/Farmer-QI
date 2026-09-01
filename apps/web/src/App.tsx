import { Navigate, Route, Routes } from "react-router-dom";
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

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/set-password" element={<SetPasswordPage />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/farmers" element={<FarmersPage />} />
        <Route path="/farmers/new" element={<AddFarmerPage />} />
        <Route path="/farmers/pending/:localId/edit" element={<EditPendingFarmerPage />} />
        <Route path="/farmers/pending/:localId" element={<PendingFarmerDetailPage />} />
        <Route path="/farmers/:id/edit" element={<EditFarmerPage />} />
        <Route path="/farmers/:id" element={<FarmerDetailPage />} />
        <Route path="/aggregators" element={<AggregatorsPage />} />
        <Route path="/aggregators/new" element={<AddAggregatorPage />} />
        <Route path="/aggregators/pending/:localId/edit" element={<EditPendingAggregatorPage />} />
        <Route path="/aggregators/pending/:localId" element={<PendingAggregatorDetailPage />} />
        <Route path="/aggregators/:id/edit" element={<EditAggregatorPage />} />
        <Route path="/aggregators/:id" element={<AggregatorDetailPage />} />
        <Route path="/offtakers" element={<OfftakersPage />} />
        <Route path="/offtakers/new" element={<AddOfftakerPage />} />
        <Route path="/offtakers/pending/:localId/edit" element={<EditPendingOfftakerPage />} />
        <Route path="/offtakers/pending/:localId" element={<PendingOfftakerDetailPage />} />
        <Route path="/offtakers/:id/edit" element={<EditOfftakerPage />} />
        <Route path="/offtakers/:id" element={<OfftakerDetailPage />} />
        <Route path="/drivers" element={<DriversPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/trash" element={<TrashPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/new" element={<NewEventPage />} />
        <Route path="/events/pending/:localId/edit" element={<EditEventPage />} />
        <Route path="/events/pending/:localId" element={<EventDetailPage />} />
        <Route path="/events/:id/edit" element={<EditEventPage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
