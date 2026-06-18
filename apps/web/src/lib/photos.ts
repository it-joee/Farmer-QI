import type { FarmerPhoto } from "@farmeriq/shared";
import { apiAssetUrl } from "./api-url";
import { apiFetch } from "./api-client";

export interface CapturedPhoto {
  id: string;
  file?: File;
  previewUrl: string;
  /** Set when the photo was loaded from the server and not yet replaced. */
  serverPhotoId?: string;
}

export function createCapturedPhoto(file: File): CapturedPhoto {
  return {
    id: crypto.randomUUID(),
    file,
    previewUrl: URL.createObjectURL(file),
  };
}

export function existingFarmerPhotoToCaptured(photo: FarmerPhoto): CapturedPhoto {
  const previewUrl = photo.url.startsWith("http") ? photo.url : apiAssetUrl(photo.url);
  return {
    id: photo.id,
    previewUrl,
    serverPhotoId: photo.id,
  };
}

export function revokeCapturedPhoto(photo: CapturedPhoto) {
  if (photo.file) {
    URL.revokeObjectURL(photo.previewUrl);
  }
}

export function collectRemovedServerPhotoIds(
  previous: CapturedPhoto[],
  next: CapturedPhoto[]
): string[] {
  const nextIds = new Set(next.map((photo) => photo.id));
  return previous
    .filter((photo) => !nextIds.has(photo.id) && photo.serverPhotoId)
    .map((photo) => photo.serverPhotoId!);
}

export function mergeRemovedServerPhotoIds(
  current: string[],
  ...removed: string[]
): string[] {
  const merged = new Set(current);
  for (const id of removed) {
    merged.add(id);
  }
  return [...merged];
}

export async function deleteFarmerPhoto(photoId: string) {
  const res = await apiFetch(`/api/farmers/photos/${photoId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error("Failed to delete photo");
  }
}

export async function uploadFarmerPhotos(
  farmerId: string,
  ghanaCardPhotos: CapturedPhoto[],
  farmerPhoto: CapturedPhoto | null
) {
  const ghanaUploads = ghanaCardPhotos.filter((photo) => photo.file);
  const portraitUpload = farmerPhoto?.file ? farmerPhoto : null;

  if (ghanaUploads.length === 0 && !portraitUpload) return;

  const formData = new FormData();
  for (const photo of ghanaUploads) {
    formData.append("ghana_card", photo.file!);
  }
  if (portraitUpload) {
    formData.append("portrait", portraitUpload.file!);
  }

  const res = await apiFetch(`/api/farmers/${farmerId}/photos`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Photo upload failed");
  }

  const data = (await res.json()) as { photos?: unknown[] };
  const expectedCount = ghanaUploads.length + (portraitUpload ? 1 : 0);
  if ((data.photos?.length ?? 0) < expectedCount) {
    throw new Error("Photo upload failed — no files were saved");
  }
}

export async function uploadFarmPhotos(farmerId: string, farmPhotos: CapturedPhoto[]) {
  const uploads = farmPhotos.filter((photo) => photo.file);
  if (uploads.length === 0) return;

  const formData = new FormData();
  for (const photo of uploads) {
    formData.append("farm", photo.file!);
  }

  const res = await apiFetch(`/api/farmers/${farmerId}/photos`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Farm photo upload failed");
  }

  const data = (await res.json()) as { photos?: unknown[] };
  if ((data.photos?.length ?? 0) < uploads.length) {
    throw new Error("Farm photo upload failed — no files were saved");
  }
}

export async function syncFarmerPhotoChanges(
  farmerId: string,
  ghanaCardPhotos: CapturedPhoto[],
  farmerPhoto: CapturedPhoto | null,
  removedPhotoIds: string[]
) {
  for (const photoId of removedPhotoIds) {
    await deleteFarmerPhoto(photoId);
  }

  await uploadFarmerPhotos(farmerId, ghanaCardPhotos, farmerPhoto);
}
