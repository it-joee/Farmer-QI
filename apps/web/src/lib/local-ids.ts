const FARMER_LOCAL_PREFIX = "jni-fm-";

function legacyIdSuffix(legacyId: string): string {
  let hash = 0;
  for (let i = 0; i < legacyId.length; i++) {
    hash = (hash * 31 + legacyId.charCodeAt(i)) >>> 0;
  }
  return String(hash % 1_000_000_000).padStart(9, "0");
}

/** New offline farmer records use a short jni-fm reference id. */
export function createFarmerLocalId(): string {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-10);
  return `${FARMER_LOCAL_PREFIX}${suffix}`;
}

/** Display-friendly reference for pending farmer ids (includes legacy UUID keys). */
export function formatFarmerLocalId(localId: string): string {
  if (localId.startsWith(FARMER_LOCAL_PREFIX)) return localId;
  return `${FARMER_LOCAL_PREFIX}${legacyIdSuffix(localId)}`;
}
