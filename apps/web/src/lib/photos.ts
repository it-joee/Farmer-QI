import { apiFetch } from "./api-client";

export interface CapturedPhoto {
  id: string;
  file: File;
  previewUrl: string;
}

export function createCapturedPhoto(file: File): CapturedPhoto {
  return {
    id: crypto.randomUUID(),
    file,
    previewUrl: URL.createObjectURL(file),
  };
}

export function revokeCapturedPhoto(photo: CapturedPhoto) {
  URL.revokeObjectURL(photo.previewUrl);
}

export async function uploadFarmerPhotos(
  farmerId: string,
  ghanaCardPhotos: CapturedPhoto[],
  farmerPhoto: CapturedPhoto | null
) {
  if (ghanaCardPhotos.length === 0 && !farmerPhoto) return;

  const formData = new FormData();
  for (const photo of ghanaCardPhotos) {
    formData.append("ghana_card", photo.file);
  }
  if (farmerPhoto) {
    formData.append("portrait", farmerPhoto.file);
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
  const expectedCount = ghanaCardPhotos.length + (farmerPhoto ? 1 : 0);
  if ((data.photos?.length ?? 0) < expectedCount) {
    throw new Error("Photo upload failed — no files were saved");
  }
}
