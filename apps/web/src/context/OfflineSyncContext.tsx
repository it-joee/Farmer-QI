import { createContext, useContext, type ReactNode } from "react";
import { useOfflineSync } from "../hooks/useOfflineSync";

type OfflineSyncValue = ReturnType<typeof useOfflineSync>;

const OfflineSyncContext = createContext<OfflineSyncValue | null>(null);

export function OfflineSyncProvider({
  createdBy,
  children,
}: {
  createdBy: string;
  children: ReactNode;
}) {
  const value = useOfflineSync(createdBy);
  return <OfflineSyncContext.Provider value={value}>{children}</OfflineSyncContext.Provider>;
}

export function useOfflineSyncContext(): OfflineSyncValue {
  const value = useContext(OfflineSyncContext);
  if (!value) {
    throw new Error("useOfflineSyncContext must be used within OfflineSyncProvider");
  }
  return value;
}
