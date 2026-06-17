interface SyncStatusBannerProps {
  online: boolean;
  pendingCount: number;
  syncing: boolean;
  lastSyncError: string | null;
  onRetry: () => void;
}

export function SyncStatusBanner({
  online,
  pendingCount,
  syncing,
  lastSyncError,
  onRetry,
}: SyncStatusBannerProps) {
  if (online && pendingCount === 0 && !lastSyncError) {
    return null;
  }

  const showOffline = !online;
  const showPending = pendingCount > 0;
  const variant = showOffline ? "offline" : lastSyncError ? "error" : "pending";

  let message = "";
  if (showOffline) {
    message =
      "You are offline. Farmers, events, and attendance are saved on this device and synced when you reconnect.";
  } else if (syncing) {
    message = "Syncing saved records…";
  } else if (showPending) {
    message = `${pendingCount} record${pendingCount === 1 ? "" : "s"} waiting to sync.`;
  } else if (lastSyncError) {
    message = lastSyncError;
  }

  return (
    <div className={`sync-banner sync-banner--${variant}`} role="status">
      <span>{message}</span>
      {online && (showPending || lastSyncError) && !syncing && (
        <button type="button" className="sync-banner__retry" onClick={onRetry}>
          Sync now
        </button>
      )}
    </div>
  );
}
