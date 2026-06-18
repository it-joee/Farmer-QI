const FARMER_REF_PREFIX = "jni-fm-";

function hashSuffix(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return String(hash % 1_000_000_000).padStart(9, "0");
}

/** Short human-readable farmer reference (e.g. jni-fm-1234567890). */
export function createFarmerReferenceId(): string {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-10);
  return `${FARMER_REF_PREFIX}${suffix}`;
}

/** Display id for a stored UUID or pending local key. */
export function formatFarmerReferenceId(id: string): string {
  if (id.startsWith(FARMER_REF_PREFIX)) return id;
  return `${FARMER_REF_PREFIX}${hashSuffix(id)}`;
}

export function getFarmerDisplayId(farmer: {
  id: string;
  reference_id?: string | null;
}): string {
  return farmer.reference_id?.trim() || formatFarmerReferenceId(farmer.id);
}
