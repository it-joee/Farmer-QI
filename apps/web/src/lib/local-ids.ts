import { createFarmerReferenceId, formatFarmerReferenceId } from "@farmeriq/shared";

const FARMER_LOCAL_PREFIX = "jni-fm-";

/** New offline farmer records use a short jni-fm reference id. */
export function createFarmerLocalId(): string {
  return createFarmerReferenceId();
}

/** Display-friendly reference for pending farmer ids (includes legacy UUID keys). */
export function formatFarmerLocalId(localId: string): string {
  return formatFarmerReferenceId(localId);
}

export { FARMER_LOCAL_PREFIX };
