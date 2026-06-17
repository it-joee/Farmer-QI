/** Remote API origin in production (e.g. https://farmer-qi-api.vercel.app). Empty in local dev. */
const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";

/** Turn /api/farmers into a fetch URL (strips /api when calling a remote API). */
export function apiUrl(path: string): string {
  if (!API_BASE || !path.startsWith("/api")) return path;
  return `${API_BASE}${path.slice(4) || "/"}`;
}

/** Absolute URL for API-hosted assets such as /uploads/... */
export function apiAssetUrl(path: string): string {
  if (!API_BASE || !path.startsWith("/uploads")) return path;
  return `${API_BASE}${path}`;
}
