import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const UPLOAD_DIR =
  process.env.UPLOAD_DIR ?? path.resolve(__dirname, "../../uploads");

export function farmerPhotoDir(farmerId: string) {
  return path.join(UPLOAD_DIR, farmerId);
}

export function photoPublicUrl(farmerId: string, fileName: string) {
  return `/uploads/${farmerId}/${fileName}`;
}
