import {
  createFarmerReferenceId,
  formatFarmerReferenceId,
  createAggregatorReferenceId,
  formatAggregatorReferenceId,
} from "@farmeriq/shared";

const FARMER_LOCAL_PREFIX = "jni-fm-";
const AGGREGATOR_LOCAL_PREFIX = "jni-ag-";

/** New offline farmer records use a short jni-fm reference id. */
export function createFarmerLocalId(): string {
  return createFarmerReferenceId();
}

/** Display-friendly reference for pending farmer ids (includes legacy UUID keys). */
export function formatFarmerLocalId(localId: string): string {
  return formatFarmerReferenceId(localId);
}

/** New offline aggregator records use a short jni-ag reference id. */
export function createAggregatorLocalId(): string {
  return createAggregatorReferenceId();
}

export function formatAggregatorLocalId(localId: string): string {
  return formatAggregatorReferenceId(localId);
}

export { FARMER_LOCAL_PREFIX, AGGREGATOR_LOCAL_PREFIX };
