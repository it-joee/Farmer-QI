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
    throw new Error("Photo upload failed");
  }
}
