import { Outlet, useNavigate } from "react-router-dom";
import { clearSession } from "../../auth";
import { useRequireAuth } from "../../hooks/useFarmers";
import { OfflineSyncProvider, useOfflineSyncContext } from "../../context/OfflineSyncContext";
import { SyncStatusBanner } from "../SyncStatusBanner";
import { AppLogo } from "./AppLogo";
import { AppNav } from "./AppNav";
import { UserProfileMenu } from "./UserProfileMenu";

function AppLayoutContent() {
  const navigate = useNavigate();
  const user = useRequireAuth();

  function logout() {
    clearSession();
    navigate("/login");
  }

  if (!user) return null;

  return (
    <OfflineSyncProvider createdBy={user.id}>
      <AppLayoutShell user={user} onLogout={logout} />
    </OfflineSyncProvider>
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
    <div className="layout">
      <SyncStatusBanner
        online={online}
        pendingCount={pendingCount}
        syncing={syncing}
        lastSyncError={lastSyncError}
        onRetry={runSync}
      />
      <header className="header">
        <div className="header__inner">
          <div className="header__start">
            <AppLogo as="h1" />
            <AppNav user={user} variant="top" />
          </div>
          <div className="header__actions">
            <UserProfileMenu user={user} onLogout={onLogout} />
          </div>
        </div>
      </header>
      <Outlet />
      <AppNav user={user} variant="bottom" />
    </div>
  );
}

export function AppLayout() {
  return <AppLayoutContent />;
}
