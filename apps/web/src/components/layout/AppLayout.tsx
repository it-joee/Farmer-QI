import { Outlet, useNavigate } from "react-router-dom";
import { clearSession } from "../../auth";
import { useRequireAuth } from "../../hooks/useFarmers";
import { OfflineSyncProvider, useOfflineSyncContext } from "../../context/OfflineSyncContext";
import { ConfirmDialogProvider } from "../../context/ConfirmDialogContext";
import { ToastProvider } from "../../context/ToastContext";
import { SyncStatusBanner } from "../SyncStatusBanner";
import { AppLogo } from "./AppLogo";
import { AppNav } from "./AppNav";
import { UserProfileMenu } from "./UserProfileMenu";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";

function AppLayoutContent() {
  const navigate = useNavigate();
  const user = useRequireAuth();

  function logout() {
    clearSession();
    navigate("/login");
  }

  if (!user) return null;

  return (
    <ToastProvider>
      <ConfirmDialogProvider>
        <OfflineSyncProvider createdBy={user.id}>
          <AppLayoutShell user={user} onLogout={logout} />
        </OfflineSyncProvider>
      </ConfirmDialogProvider>
    </ToastProvider>
  );
}

function AppLayoutShell({
  user,
  onLogout,
}: {
  user: NonNullable<ReturnType<typeof useRequireAuth>>;
  onLogout: () => void;
}) {
  const { online, pendingCount, syncing, lastSyncError, runSync } = useOfflineSyncContext();

  return (
    <div className="layout-with-sidebar">
      <AppSidebar user={user} onLogout={onLogout} />
      <div className="layout">
        <SyncStatusBanner
          online={online}
          pendingCount={pendingCount}
          syncing={syncing}
          lastSyncError={lastSyncError}
          onRetry={runSync}
        />
        <AppHeader user={user} onLogout={onLogout} />
        <Outlet />
        <AppNav user={user} variant="bottom" />
      </div>
    </div>
  );
}

export function AppLayout() {
  return <AppLayoutContent />;
}
