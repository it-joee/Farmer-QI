import { createFarmerLocalId } from "../local-ids";
import { apiFetch } from "../api-client";
import type { GpsPin } from "@farmeriq/shared";
import { formToPayload } from "../../pages/farmer-form/types";
import { getDeviceId } from "../device-id";
import { uploadFarmerPhotos } from "../photos";
import { uploadFarmPlot } from "../plots";
import { createCapturedPhoto, type CapturedPhoto } from "../photos";
import {
  addPendingFarmer,
  getFarmerServerId,
  getPendingFarmer,
  listPendingFarmers,
  removePendingFarmer,
  saveFarmerIdMapping,
  updatePendingFarmer,
} from "./store";
import type {
  PendingFarmerRecord,
  StoredPhoto,
  SubmitFarmerInput,
  SyncSummary,
} from "./types";

export type SubmitResult = "synced" | "queued";

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

export function toStoredPhoto(photo: CapturedPhoto): StoredPhoto {
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

export function toCapturedPhoto(stored: StoredPhoto): CapturedPhoto {
  const file = new File([stored.data], stored.name, { type: stored.type });
  return createCapturedPhoto(file);
}

function buildPendingRecord(
  input: SubmitFarmerInput,
  overrides?: Partial<Pick<PendingFarmerRecord, "localId" | "createdAt">>
): PendingFarmerRecord {
  return {
    localId: overrides?.localId ?? createFarmerLocalId(),
    createdBy: input.agentId,
    createdAt: overrides?.createdAt ?? new Date().toISOString(),
    status: "pending",
    form: input.form,
    ghanaCardPhotos: input.ghanaCardPhotos.map(toStoredPhoto),
    farmerPhoto: input.farmerPhoto ? toStoredPhoto(input.farmerPhoto) : null,
    boundaryEnabled: input.boundaryEnabled,
    boundaryPins: input.boundaryPins,
  };
}

type FarmerSubmissionMeta = {
  capturedAt: string;
  deviceId: string;
  clientLocalId: string;
};

async function createFarmerOnServer(
  agentId: string,
  form: SubmitFarmerInput["form"],
  submission: FarmerSubmissionMeta
) {
  let res: Response;
  try {
    res = await apiFetch("/api/farmers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        formToPayload(form, agentId, {
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
      res.status >= 500 ? "Server error while saving farmer" : "Could not save farmer. Check required fields.",
      res.status >= 500
    );
  }

  return res.json() as Promise<{ farmer: { id: string } }>;
}

async function uploadAttachments(
  farmerId: string,
  agentId: string,
  ghanaCardPhotos: CapturedPhoto[],
  farmerPhoto: CapturedPhoto | null,
  boundaryEnabled: boolean,
  boundaryPins: GpsPin[]
) {
  try {
    await uploadFarmerPhotos(farmerId, ghanaCardPhotos, farmerPhoto);
    if (boundaryEnabled && boundaryPins.length >= 3) {
      await uploadFarmPlot(farmerId, boundaryPins, agentId);
    }
  } catch (error) {
    if (isFetchNetworkError(error)) {
      throw new SubmitError("Network unavailable during upload", true);
    }
    throw new SubmitError("Farmer saved but attachments could not be uploaded", true);
  }
}

async function syncRecordToServer(record: PendingFarmerRecord): Promise<string> {
  const ghanaCardPhotos = record.ghanaCardPhotos.map(toCapturedPhoto);
  const farmerPhoto = record.farmerPhoto ? toCapturedPhoto(record.farmerPhoto) : null;
  const deviceId = getDeviceId();
  const submission: FarmerSubmissionMeta = {
    capturedAt: record.createdAt,
    deviceId,
    clientLocalId: record.localId,
  };

  let farmerId = await getFarmerServerId(record.localId);

  if (!farmerId) {
    const data = await createFarmerOnServer(record.createdBy, record.form, submission);
    farmerId = data.farmer.id;
    await saveFarmerIdMapping(record.localId, farmerId);
  }

  await uploadAttachments(
    farmerId,
    record.createdBy,
    ghanaCardPhotos,
    farmerPhoto,
    record.boundaryEnabled,
    record.boundaryPins
  );
  return farmerId;
}

export async function submitFarmerOnline(input: SubmitFarmerInput): Promise<void> {
  const localId = createFarmerLocalId();
  const capturedAt = new Date().toISOString();
  const deviceId = getDeviceId();
  const submission: FarmerSubmissionMeta = { capturedAt, deviceId, clientLocalId: localId };

  const data = await createFarmerOnServer(input.agentId, input.form, submission);
  await saveFarmerIdMapping(localId, data.farmer.id);
  await uploadAttachments(
    data.farmer.id,
    input.agentId,
    input.ghanaCardPhotos,
    input.farmerPhoto,
    input.boundaryEnabled,
    input.boundaryPins
  );
}

export async function queueFarmerSubmission(input: SubmitFarmerInput): Promise<string> {
  const record = buildPendingRecord(input);
  await addPendingFarmer(record);
  return record.localId;
}

export async function submitFarmer(input: SubmitFarmerInput): Promise<SubmitResult> {
  if (!navigator.onLine) {
    await queueFarmerSubmission(input);
    return "queued";
  }

  const localId = createFarmerLocalId();
  const capturedAt = new Date().toISOString();
  const deviceId = getDeviceId();
  const submission: FarmerSubmissionMeta = { capturedAt, deviceId, clientLocalId: localId };

  try {
    const data = await createFarmerOnServer(input.agentId, input.form, submission);
    await saveFarmerIdMapping(localId, data.farmer.id);
    await uploadAttachments(
      data.farmer.id,
      input.agentId,
      input.ghanaCardPhotos,
      input.farmerPhoto,
      input.boundaryEnabled,
      input.boundaryPins
    );
    return "synced";
  } catch (error) {
    if (error instanceof SubmitError && error.retryable) {
      const record = buildPendingRecord(input, { localId, createdAt: capturedAt });
      await addPendingFarmer(record);
      return "queued";
    }
    throw error;
  }
}

export interface BulkSubmitFarmerResult {
  status: SubmitResult;
  count: number;
  conflictsCount: number;
}

export async function submitFarmersBulk(
  agentId: string,
  forms: SubmitFarmerInput["form"][]
): Promise<BulkSubmitFarmerResult> {
  if (forms.length === 0) {
    return { status: "synced", count: 0, conflictsCount: 0 };
  }

  const capturedAt = new Date().toISOString();
  const deviceId = getDeviceId();
  const localIds = forms.map((_, idx) => `${createFarmerLocalId()}-${idx}`);

  async function queueAllOffline(): Promise<BulkSubmitFarmerResult> {
    for (let i = 0; i < forms.length; i++) {
      const record = buildPendingRecord(
        {
          agentId,
          form: forms[i],
          ghanaCardPhotos: [],
          farmerPhoto: null,
          boundaryEnabled: false,
          boundaryPins: [],
        },
        { localId: localIds[i], createdAt: capturedAt }
      );
      await addPendingFarmer(record);
    }
    return { status: "queued", count: forms.length, conflictsCount: 0 };
  }

  if (!navigator.onLine) {
    return queueAllOffline();
  }

  try {
    const res = await apiFetch("/api/farmers/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        created_by: agentId,
        device_id: deviceId,
        captured_at: capturedAt,
        farmers: forms.map((form, i) =>
          formToPayload(form, agentId, {
            capturedAt,
            deviceId,
            clientLocalId: localIds[i],
          })
        ),
      }),
    });

    if (!res.ok) {
      if (res.status >= 500) {
        return queueAllOffline();
      }
      const errBody = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new SubmitError(
        errBody?.error || "Could not import farmers. Please review the extracted rows.",
        false
      );
    }

    const data = (await res.json()) as {
      farmers?: { id: string }[];
      count?: number;
      conflictsCount?: number;
    };

    if (Array.isArray(data.farmers)) {
      for (let i = 0; i < data.farmers.length; i++) {
        if (data.farmers[i]?.id && localIds[i]) {
          await saveFarmerIdMapping(localIds[i], data.farmers[i].id);
        }
      }
    }

    window.dispatchEvent(new CustomEvent("farmeriq:farmers-synced"));
    return {
      status: "synced",
      count: data.count ?? forms.length,
      conflictsCount: data.conflictsCount ?? 0,
    };
  } catch (error) {
    if (isFetchNetworkError(error)) {
      return queueAllOffline();
    }
    throw error;
  }
}

async function recoverStaleSyncingRecords(createdBy: string): Promise<void> {
  const pending = await listPendingFarmers(createdBy);
  for (const record of pending) {
    if (record.status === "syncing") {
      await updatePendingFarmer({ ...record, status: "pending" });
    }
  }
}

export async function syncPendingFarmers(createdBy: string): Promise<SyncSummary> {
  if (!navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  await recoverStaleSyncingRecords(createdBy);

  const pending = await listPendingFarmers(createdBy);
  let synced = 0;
  let failed = 0;

  for (const record of pending) {
    if (record.status !== "pending" && record.status !== "failed") continue;

    const syncing: PendingFarmerRecord = { ...record, status: "syncing", lastError: undefined };
    await updatePendingFarmer(syncing);

    try {
      const serverFarmerId = await syncRecordToServer(syncing);
      await saveFarmerIdMapping(syncing.localId, serverFarmerId);
      await removePendingFarmer(syncing.localId);
      synced += 1;
    } catch (error) {
      const message =
        error instanceof SubmitError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Sync failed";
      await updatePendingFarmer({
        ...syncing,
        status: "failed",
        lastError: message,
      });
      failed += 1;
    }
  }

  return { synced, failed };
}

export async function syncPendingFarmer(localId: string): Promise<"synced" | "failed"> {
  if (!navigator.onLine) {
    throw new SubmitError("You are offline", true);
  }

  const record = await getPendingFarmer(localId);
  if (!record) {
    throw new Error("Pending farmer not found");
  }

  const syncing: PendingFarmerRecord = { ...record, status: "syncing", lastError: undefined };
  await updatePendingFarmer(syncing);

  try {
    const serverFarmerId = await syncRecordToServer(syncing);
    await saveFarmerIdMapping(syncing.localId, serverFarmerId);
    await removePendingFarmer(syncing.localId);
    window.dispatchEvent(new CustomEvent("farmeriq:farmers-synced"));
    return "synced";
  } catch (error) {
    const message =
      error instanceof SubmitError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Sync failed";
    await updatePendingFarmer({
      ...syncing,
      status: "failed",
      lastError: message,
    });
    return "failed";
  }
}

export { listPendingFarmers, getPendingFarmer } from "./store";
