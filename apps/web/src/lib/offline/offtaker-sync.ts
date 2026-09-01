import { createOfftakerLocalId } from "../local-ids";
import { apiFetch } from "../api-client";
import { offtakerFormToPayload } from "../../pages/offtaker-form/types";
import { getDeviceId } from "../device-id";
import {
  addPendingOfftaker,
  getOfftakerServerId,
  getPendingOfftaker,
  listPendingOfftakers,
  removePendingOfftaker,
  saveOfftakerIdMapping,
  updatePendingOfftaker,
} from "./store";
import type {
  PendingOfftakerRecord,
  SubmitOfftakerInput,
  SyncSummary,
} from "./types";

export type SubmitResult = "synced" | "queued";

export const OFFTAKERS_SYNCED_EVENT = "farmeriq:offtakers-synced";

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

function buildPendingRecord(
  input: SubmitOfftakerInput,
  overrides?: Partial<Pick<PendingOfftakerRecord, "localId" | "createdAt">>
): PendingOfftakerRecord {
  return {
    localId: overrides?.localId ?? createOfftakerLocalId(),
    createdBy: input.agentId,
    createdAt: overrides?.createdAt ?? new Date().toISOString(),
    status: "pending",
    form: input.form,
    offtakerPhoto: null,
  } as PendingOfftakerRecord;
}

type OfftakerSubmissionMeta = {
  capturedAt: string;
  deviceId: string;
  clientLocalId: string;
};

async function createOfftakerOnServer(
  agentId: string,
  form: SubmitOfftakerInput["form"],
  submission: OfftakerSubmissionMeta
) {
  let res: Response;
  try {
    res = await apiFetch("/api/offtakers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        offtakerFormToPayload(form, agentId, {
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
      res.status >= 500 ? "Server error while saving offtaker" : "Could not save offtaker. Check required fields.",
      res.status >= 500
    );
  }

  return res.json() as Promise<{ offtaker: { id: string } }>;
}

async function syncRecordToServer(record: PendingOfftakerRecord): Promise<string> {
  const deviceId = getDeviceId();
  const submission: OfftakerSubmissionMeta = {
    capturedAt: record.createdAt,
    deviceId,
    clientLocalId: record.localId,
  };

  let offtakerId = await getOfftakerServerId(record.localId);

  if (!offtakerId) {
    const data = await createOfftakerOnServer(record.createdBy, record.form, submission);
    offtakerId = data.offtaker.id;
    await saveOfftakerIdMapping(record.localId, offtakerId);
  }

  return offtakerId;
}

export async function queueOfftakerSubmission(input: SubmitOfftakerInput): Promise<string> {
  const record = buildPendingRecord(input);
  await addPendingOfftaker(record);
  return record.localId;
}

export async function submitOfftaker(input: SubmitOfftakerInput): Promise<SubmitResult> {
  if (!navigator.onLine) {
    await queueOfftakerSubmission(input);
    return "queued";
  }

  const localId = createOfftakerLocalId();
  const capturedAt = new Date().toISOString();
  const deviceId = getDeviceId();
  const submission: OfftakerSubmissionMeta = { capturedAt, deviceId, clientLocalId: localId };

  try {
    const data = await createOfftakerOnServer(input.agentId, input.form, submission);
    await saveOfftakerIdMapping(localId, data.offtaker.id);
    return "synced";
  } catch (error) {
    if (error instanceof SubmitError && error.retryable) {
      const record = buildPendingRecord(input, { localId, createdAt: capturedAt });
      await addPendingOfftaker(record);
      return "queued";
    }
    throw error;
  }
}

async function recoverStaleSyncingRecords(createdBy: string): Promise<void> {
  const pending = await listPendingOfftakers(createdBy);
  for (const record of pending) {
    if (record.status === "syncing") {
      await updatePendingOfftaker({ ...record, status: "pending" });
    }
  }
}

export async function syncPendingOfftakers(createdBy: string): Promise<SyncSummary> {
  if (!navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  await recoverStaleSyncingRecords(createdBy);

  const pending = await listPendingOfftakers(createdBy);
  let synced = 0;
  let failed = 0;

  for (const record of pending) {
    if (record.status !== "pending" && record.status !== "failed") continue;

    const syncing: PendingOfftakerRecord = { ...record, status: "syncing", lastError: undefined };
    await updatePendingOfftaker(syncing);

    try {
      const serverOfftakerId = await syncRecordToServer(syncing);
      await saveOfftakerIdMapping(syncing.localId, serverOfftakerId);
      await removePendingOfftaker(syncing.localId);
      synced += 1;
    } catch (error) {
      const message =
        error instanceof SubmitError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Sync failed";
      await updatePendingOfftaker({
        ...syncing,
        status: "failed",
        lastError: message,
      });
      failed += 1;
    }
  }

  return { synced, failed };
}

export async function syncPendingOfftaker(localId: string): Promise<"synced" | "failed"> {
  if (!navigator.onLine) {
    throw new SubmitError("You are offline", true);
  }

  const record = await getPendingOfftaker(localId);
  if (!record) {
    throw new Error("Pending offtaker not found");
  }

  const syncing: PendingOfftakerRecord = { ...record, status: "syncing", lastError: undefined };
  await updatePendingOfftaker(syncing);

  try {
    const serverOfftakerId = await syncRecordToServer(syncing);
    await saveOfftakerIdMapping(syncing.localId, serverOfftakerId);
    await removePendingOfftaker(syncing.localId);
    window.dispatchEvent(new CustomEvent(OFFTAKERS_SYNCED_EVENT));
    return "synced";
  } catch (error) {
    const message =
      error instanceof SubmitError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Sync failed";
    await updatePendingOfftaker({
      ...syncing,
      status: "failed",
      lastError: message,
    });
    return "failed";
  }
}
