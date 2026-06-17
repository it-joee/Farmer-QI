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

function toStoredPhoto(photo: { id: string; file: File }): StoredPhoto {
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

function buildPendingRecord(input: SubmitFarmerInput): PendingFarmerRecord {
  return {
    localId: createFarmerLocalId(),
    createdBy: input.agentId,
    createdAt: new Date().toISOString(),
    status: "pending",
    form: input.form,
    ghanaCardPhotos: input.ghanaCardPhotos.map(toStoredPhoto),
    farmerPhoto: input.farmerPhoto ? toStoredPhoto(input.farmerPhoto) : null,
    boundaryEnabled: input.boundaryEnabled,
    boundaryPins: input.boundaryPins,
  };
}

async function createFarmerOnServer(
  agentId: string,
  form: SubmitFarmerInput["form"],
  submission?: { capturedAt: string; deviceId: string }
) {
  let res: Response;
  try {
    res = await apiFetch("/api/farmers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        formToPayload(form, agentId, {
          capturedAt: submission?.capturedAt,
          deviceId: submission?.deviceId,
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

  const data = await createFarmerOnServer(record.createdBy, record.form, {
    capturedAt: record.createdAt,
    deviceId,
  });
  await uploadAttachments(
    data.farmer.id,
    record.createdBy,
    ghanaCardPhotos,
    farmerPhoto,
    record.boundaryEnabled,
    record.boundaryPins
  );
  return data.farmer.id;
}

export async function submitFarmerOnline(input: SubmitFarmerInput): Promise<void> {
  const ghanaCardPhotos = input.ghanaCardPhotos.map((p) => createCapturedPhoto(p.file));
  const farmerPhoto = input.farmerPhoto ? createCapturedPhoto(input.farmerPhoto.file) : null;
  const capturedAt = new Date().toISOString();
  const deviceId = getDeviceId();

  const data = await createFarmerOnServer(input.agentId, input.form, { capturedAt, deviceId });
  await uploadAttachments(
    data.farmer.id,
    input.agentId,
    ghanaCardPhotos,
    farmerPhoto,
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

  try {
    await submitFarmerOnline(input);
    return "synced";
  } catch (error) {
    if (error instanceof SubmitError && error.retryable) {
      await queueFarmerSubmission(input);
      return "queued";
    }
    throw error;
  }
}

export async function syncPendingFarmers(createdBy: string): Promise<SyncSummary> {
  if (!navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const pending = await listPendingFarmers(createdBy);
  let synced = 0;
  let failed = 0;

  for (const record of pending) {
    if (record.status === "syncing") continue;

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
