import { createAggregatorLocalId } from "../local-ids";
import { apiFetch } from "../api-client";
import { aggregatorFormToPayload } from "../../pages/aggregator-form/types";
import { getDeviceId } from "../device-id";
import {
  createCapturedPhoto,
  uploadAggregatorPhotos,
  type CapturedPhoto,
} from "../photos";
import {
  addPendingAggregator,
  getAggregatorServerId,
  getPendingAggregator,
  listPendingAggregators,
  removePendingAggregator,
  saveAggregatorIdMapping,
  updatePendingAggregator,
} from "./store";
import type {
  PendingAggregatorRecord,
  StoredPhoto,
  SubmitAggregatorInput,
  SyncSummary,
} from "./types";

export type SubmitResult = "synced" | "queued";

export const AGGREGATORS_SYNCED_EVENT = "farmeriq:aggregators-synced";

class SubmitError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean
  ) {
    super(message);
    this.name = "SubmitError";
  }
}

function isFetchNetworkError(error: unknown): boolean {
  return error instanceof TypeError;
}

function toStoredPhoto(photo: CapturedPhoto): StoredPhoto {
  if (!photo.file) {
    throw new Error("Offline sync requires a photo file");
  }
  return {
    id: photo.id,
    name: photo.file.name,
    type: photo.file.type || "image/jpeg",
    data: photo.file,
  };
}

function toCapturedPhoto(stored: StoredPhoto): CapturedPhoto {
  const file = new File([stored.data], stored.name, { type: stored.type });
  return createCapturedPhoto(file);
}

function buildPendingRecord(
  input: SubmitAggregatorInput,
  overrides?: Partial<Pick<PendingAggregatorRecord, "localId" | "createdAt">>
): PendingAggregatorRecord {
  return {
    localId: overrides?.localId ?? createAggregatorLocalId(),
    createdBy: input.agentId,
    createdAt: overrides?.createdAt ?? new Date().toISOString(),
    status: "pending",
    form: input.form,
    ghanaCardPhotos: input.ghanaCardPhotos.map(toStoredPhoto),
    aggregatorPhoto: input.aggregatorPhoto ? toStoredPhoto(input.aggregatorPhoto) : null,
  };
}

type AggregatorSubmissionMeta = {
  capturedAt: string;
  deviceId: string;
  clientLocalId: string;
};

async function createAggregatorOnServer(
  agentId: string,
  form: SubmitAggregatorInput["form"],
  submission: AggregatorSubmissionMeta
) {
  let res: Response;
  try {
    res = await apiFetch("/api/aggregators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        aggregatorFormToPayload(form, agentId, {
          capturedAt: submission.capturedAt,
          deviceId: submission.deviceId,
          clientLocalId: submission.clientLocalId,
        })
      ),
    });
  } catch (error) {
    if (isFetchNetworkError(error)) {
      throw new SubmitError("Network unavailable", true);
    }
    throw error;
  }

  if (!res.ok) {
    throw new SubmitError(
      res.status >= 500 ? "Server error while saving aggregator" : "Could not save aggregator. Check required fields.",
      res.status >= 500
    );
  }

  return res.json() as Promise<{ aggregator: { id: string } }>;
}

async function uploadAttachments(
  aggregatorId: string,
  ghanaCardPhotos: CapturedPhoto[],
  aggregatorPhoto: CapturedPhoto | null
) {
  try {
    await uploadAggregatorPhotos(aggregatorId, ghanaCardPhotos, aggregatorPhoto);
  } catch (error) {
    if (isFetchNetworkError(error)) {
      throw new SubmitError("Network unavailable during upload", true);
    }
    throw new SubmitError("Aggregator saved but photos could not be uploaded", true);
  }
}

async function syncRecordToServer(record: PendingAggregatorRecord): Promise<string> {
  const ghanaCardPhotos = record.ghanaCardPhotos.map(toCapturedPhoto);
  const aggregatorPhoto = record.aggregatorPhoto ? toCapturedPhoto(record.aggregatorPhoto) : null;
  const deviceId = getDeviceId();
  const submission: AggregatorSubmissionMeta = {
    capturedAt: record.createdAt,
    deviceId,
    clientLocalId: record.localId,
  };

  let aggregatorId = await getAggregatorServerId(record.localId);

  if (!aggregatorId) {
    const data = await createAggregatorOnServer(record.createdBy, record.form, submission);
    aggregatorId = data.aggregator.id;
    await saveAggregatorIdMapping(record.localId, aggregatorId);
  }

  await uploadAttachments(aggregatorId, ghanaCardPhotos, aggregatorPhoto);
  return aggregatorId;
}

export async function queueAggregatorSubmission(input: SubmitAggregatorInput): Promise<string> {
  const record = buildPendingRecord(input);
  await addPendingAggregator(record);
  return record.localId;
}

export async function submitAggregator(input: SubmitAggregatorInput): Promise<SubmitResult> {
  if (!navigator.onLine) {
    await queueAggregatorSubmission(input);
    return "queued";
  }

  const localId = createAggregatorLocalId();
  const capturedAt = new Date().toISOString();
  const deviceId = getDeviceId();
  const submission: AggregatorSubmissionMeta = { capturedAt, deviceId, clientLocalId: localId };

  try {
    const data = await createAggregatorOnServer(input.agentId, input.form, submission);
    await saveAggregatorIdMapping(localId, data.aggregator.id);
    await uploadAttachments(data.aggregator.id, input.ghanaCardPhotos, input.aggregatorPhoto);
    return "synced";
  } catch (error) {
    if (error instanceof SubmitError && error.retryable) {
      const record = buildPendingRecord(input, { localId, createdAt: capturedAt });
      await addPendingAggregator(record);
      return "queued";
    }
    throw error;
  }
}

async function recoverStaleSyncingRecords(createdBy: string): Promise<void> {
  const pending = await listPendingAggregators(createdBy);
  for (const record of pending) {
    if (record.status === "syncing") {
      await updatePendingAggregator({ ...record, status: "pending" });
    }
  }
}

export async function syncPendingAggregators(createdBy: string): Promise<SyncSummary> {
  if (!navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  await recoverStaleSyncingRecords(createdBy);

  const pending = await listPendingAggregators(createdBy);
  let synced = 0;
  let failed = 0;

  for (const record of pending) {
    if (record.status !== "pending" && record.status !== "failed") continue;

    const syncing: PendingAggregatorRecord = { ...record, status: "syncing", lastError: undefined };
    await updatePendingAggregator(syncing);

    try {
      const serverAggregatorId = await syncRecordToServer(syncing);
      await saveAggregatorIdMapping(syncing.localId, serverAggregatorId);
      await removePendingAggregator(syncing.localId);
      synced += 1;
    } catch (error) {
      const message =
        error instanceof SubmitError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Sync failed";
      await updatePendingAggregator({
        ...syncing,
        status: "failed",
        lastError: message,
      });
      failed += 1;
    }
  }

  return { synced, failed };
}

export async function syncPendingAggregator(localId: string): Promise<"synced" | "failed"> {
  if (!navigator.onLine) {
    throw new SubmitError("You are offline", true);
  }

  const record = await getPendingAggregator(localId);
  if (!record) {
    throw new Error("Pending aggregator not found");
  }

  const syncing: PendingAggregatorRecord = { ...record, status: "syncing", lastError: undefined };
  await updatePendingAggregator(syncing);

  try {
    const serverAggregatorId = await syncRecordToServer(syncing);
    await saveAggregatorIdMapping(syncing.localId, serverAggregatorId);
    await removePendingAggregator(syncing.localId);
    window.dispatchEvent(new CustomEvent(AGGREGATORS_SYNCED_EVENT));
    return "synced";
  } catch (error) {
    const message =
      error instanceof SubmitError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Sync failed";
    await updatePendingAggregator({
      ...syncing,
      status: "failed",
      lastError: message,
    });
    return "failed";
  }
}
