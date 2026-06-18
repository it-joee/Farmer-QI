import { createReadStream, existsSync } from "fs";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { farmerPhotoDir, UPLOAD_DIR } from "../config/uploads.js";

export const FARMER_PHOTOS_BUCKET = "farmer-photos";

export type PhotoStorageBackend = "supabase" | "local";

function supabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getPhotoStorageBackend(): PhotoStorageBackend {
  return supabaseConfigured() ? "supabase" : "local";
}

let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for photo storage");
  }

  if (!supabaseAdmin) {
    supabaseAdmin = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return supabaseAdmin;
}

function storageObjectPath(farmerId: string, fileName: string): string {
  return `${farmerId}/${fileName}`;
}

export function photoPublicUrl(farmerId: string, fileName: string): string {
  if (getPhotoStorageBackend() === "supabase") {
    const base = process.env.SUPABASE_URL!.replace(/\/$/, "");
    const objectPath = storageObjectPath(farmerId, fileName);
    return `${base}/storage/v1/object/public/${FARMER_PHOTOS_BUCKET}/${objectPath}`;
  }

  return `/uploads/${farmerId}/${fileName}`;
}

export async function savePhotoFile(
  farmerId: string,
  fileName: string,
  data: Buffer,
  contentType: string
): Promise<void> {
  if (getPhotoStorageBackend() === "supabase") {
    const supabase = getSupabaseAdmin();
    const objectPath = storageObjectPath(farmerId, fileName);
    const { error } = await supabase.storage.from(FARMER_PHOTOS_BUCKET).upload(objectPath, data, {
      contentType,
      upsert: true,
    });

    if (error) {
      throw new Error(`Photo upload failed: ${error.message}`);
    }
    return;
  }

  const dir = farmerPhotoDir(farmerId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), data);
}

export async function deletePhotoFile(farmerId: string, fileName: string): Promise<void> {
  if (getPhotoStorageBackend() === "supabase") {
    const supabase = getSupabaseAdmin();
    const objectPath = storageObjectPath(farmerId, fileName);
    const { error } = await supabase.storage.from(FARMER_PHOTOS_BUCKET).remove([objectPath]);
    if (error) {
      throw new Error(`Photo delete failed: ${error.message}`);
    }
    return;
  }

  const filePath = path.join(farmerPhotoDir(farmerId), fileName);
  if (existsSync(filePath)) {
    await unlink(filePath);
  }
}

export function localPhotoFilePath(farmerId: string, fileName: string): string {
  return path.join(farmerPhotoDir(farmerId), fileName);
}

export function createLocalPhotoReadStream(farmerId: string, fileName: string) {
  return createReadStream(localPhotoFilePath(farmerId, fileName));
}

export function localPhotoExists(farmerId: string, fileName: string): boolean {
  return existsSync(localPhotoFilePath(farmerId, fileName));
}

export { UPLOAD_DIR };
