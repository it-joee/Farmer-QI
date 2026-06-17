import { createReadStream, existsSync } from "fs";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { Hono } from "hono";
import { stream } from "hono/streaming";
import type { FarmerPhoto } from "@farmeriq/shared";
import { farmerPhotoDir, photoPublicUrl } from "../config/uploads.js";
import { query } from "../db.js";

export const farmerPhotoRoutes = new Hono();

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
  const dir = farmerPhotoDir(farmerId);
  await mkdir(dir, { recursive: true });

  const saved: FarmerPhoto[] = [];

  async function saveFile(
    file: File,
    photoType: "ghana_card" | "portrait"
  ): Promise<FarmerPhoto | null> {
    if (!(file instanceof File) || file.size === 0) return null;

    const ext = path.extname(file.name) || ".jpg";
    const fileName = `${photoType}-${crypto.randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, fileName), buffer);

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

  const ghanaCardFiles = body.ghana_card;
  const ghanaList = Array.isArray(ghanaCardFiles)
    ? ghanaCardFiles
    : ghanaCardFiles
      ? [ghanaCardFiles]
      : [];

  for (const file of ghanaList) {
    const photo = await saveFile(file as File, "ghana_card");
    if (photo) saved.push(photo);
  }

  const portraitFile = body.portrait;
  if (portraitFile && !Array.isArray(portraitFile)) {
    const existingPortrait = await query(
      "SELECT id, file_name FROM farmer_photos WHERE farmer_id = $1 AND photo_type = 'portrait'",
      [farmerId]
    );
    for (const row of existingPortrait.rows) {
      await deletePhotoFile(farmerId, row.file_name as string);
      await query("DELETE FROM farmer_photos WHERE id = $1", [row.id]);
    }

    const photo = await saveFile(portraitFile as File, "portrait");
    if (photo) saved.push(photo);
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
  const { farmerId, fileName } = c.req.param();

  if (fileName.includes("..") || fileName.includes("/")) {
    return c.json({ error: "Invalid file" }, 400);
  }

  const filePath = path.join(farmerPhotoDir(farmerId), fileName);
  if (!existsSync(filePath)) {
    return c.notFound();
  }

  const ext = path.extname(fileName).toLowerCase();
  const type =
    ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

  c.header("Content-Type", type);
  return stream(c, async (s) => {
    const reader = createReadStream(filePath);
    for await (const chunk of reader) {
      await s.write(chunk);
    }
  });
});

async function deletePhotoFile(farmerId: string, fileName: string) {
  const filePath = path.join(farmerPhotoDir(farmerId), fileName);
  if (existsSync(filePath)) {
    await unlink(filePath);
  }
}
