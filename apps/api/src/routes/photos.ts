import { Hono } from "hono";
import { stream } from "hono/streaming";
import path from "path";
import type { FarmerPhoto } from "@farmeriq/shared";
import {
  createLocalPhotoReadStream,
  deletePhotoFile,
  getPhotoStorageBackend,
  localPhotoExists,
  photoPublicUrl,
  savePhotoFile,
} from "../lib/photo-storage.js";
import { query } from "../db.js";

export const farmerPhotoRoutes = new Hono();

function contentTypeForFileName(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

function isUploadFile(value: unknown): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    typeof (value as File).arrayBuffer === "function" &&
    (value as File).size > 0
  );
}

function normalizeUploadFiles(value: unknown): File[] {
  if (Array.isArray(value)) {
    return value.filter(isUploadFile);
  }
  return isUploadFile(value) ? [value] : [];
}

farmerPhotoRoutes.get("/:farmerId/photos", async (c) => {
  const farmerId = c.req.param("farmerId");
  const result = await query<{
    id: string;
    farmer_id: string;
    photo_type: string;
    file_name: string;
    created_at: string;
  }>("SELECT * FROM farmer_photos WHERE farmer_id = $1 ORDER BY created_at ASC", [farmerId]);

  const photos: FarmerPhoto[] = result.rows.map((row) => ({
    id: row.id,
    farmer_id: row.farmer_id,
    photo_type: row.photo_type as FarmerPhoto["photo_type"],
    file_name: row.file_name,
    url: photoPublicUrl(row.farmer_id, row.file_name),
    created_at: row.created_at,
  }));

  return c.json({ photos });
});

farmerPhotoRoutes.post("/:farmerId/photos", async (c) => {
  const farmerId = c.req.param("farmerId");

  const farmer = await query("SELECT id FROM farmers WHERE id = $1", [farmerId]);
  if (farmer.rowCount === 0) {
    return c.json({ error: "Farmer not found" }, 404);
  }

  const body = await c.req.parseBody({ all: true });
  const ghanaList = normalizeUploadFiles(body.ghana_card);
  const portraitFiles = normalizeUploadFiles(body.portrait);
  const portraitFile = portraitFiles[0] ?? null;
  const expectedUploads = ghanaList.length + (portraitFile ? 1 : 0);

  if (expectedUploads === 0) {
    return c.json({ error: "No photo files received" }, 400);
  }

  const saved: FarmerPhoto[] = [];

  async function saveUploadedFile(
    file: File,
    photoType: "ghana_card" | "portrait"
  ): Promise<FarmerPhoto> {
    const ext = path.extname(file.name) || ".jpg";
    const fileName = `${photoType}-${crypto.randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || contentTypeForFileName(fileName);

    await savePhotoFile(farmerId, fileName, buffer, contentType);

    const result = await query<{
      id: string;
      farmer_id: string;
      photo_type: string;
      file_name: string;
      created_at: string;
    }>(
      `INSERT INTO farmer_photos (farmer_id, photo_type, file_name)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [farmerId, photoType, fileName]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      farmer_id: row.farmer_id,
      photo_type: row.photo_type as FarmerPhoto["photo_type"],
      file_name: row.file_name,
      url: photoPublicUrl(row.farmer_id, row.file_name),
      created_at: row.created_at,
    };
  }

  for (const file of ghanaList) {
    saved.push(await saveUploadedFile(file, "ghana_card"));
  }

  if (portraitFile) {
    const existingPortrait = await query(
      "SELECT id, file_name FROM farmer_photos WHERE farmer_id = $1 AND photo_type = 'portrait'",
      [farmerId]
    );
    for (const row of existingPortrait.rows) {
      await deletePhotoFile(farmerId, row.file_name as string);
      await query("DELETE FROM farmer_photos WHERE id = $1", [row.id]);
    }

    saved.push(await saveUploadedFile(portraitFile, "portrait"));
  }

  if (saved.length === 0) {
    return c.json({ error: "Photo upload failed" }, 500);
  }

  return c.json({ photos: saved }, 201);
});

farmerPhotoRoutes.delete("/photos/:photoId", async (c) => {
  const photoId = c.req.param("photoId");
  const result = await query<{ id: string; farmer_id: string; file_name: string }>(
    "SELECT id, farmer_id, file_name FROM farmer_photos WHERE id = $1",
    [photoId]
  );

  if (result.rowCount === 0) {
    return c.json({ error: "Photo not found" }, 404);
  }

  const row = result.rows[0];
  await deletePhotoFile(row.farmer_id, row.file_name);
  await query("DELETE FROM farmer_photos WHERE id = $1", [photoId]);

  return c.json({ ok: true });
});

export const uploadFileRoute = new Hono();

uploadFileRoute.get("/:farmerId/:fileName", async (c) => {
  if (getPhotoStorageBackend() === "supabase") {
    return c.json(
      {
        error: "Photos are served from Supabase Storage. Use the url field on farmer photo records.",
      },
      410
    );
  }

  const { farmerId, fileName } = c.req.param();

  if (fileName.includes("..") || fileName.includes("/")) {
    return c.json({ error: "Invalid file" }, 400);
  }

  if (!localPhotoExists(farmerId, fileName)) {
    return c.notFound();
  }

  c.header("Content-Type", contentTypeForFileName(fileName));
  return stream(c, async (s) => {
    const reader = createLocalPhotoReadStream(farmerId, fileName);
    for await (const chunk of reader) {
      await s.write(chunk);
    }
  });
});
