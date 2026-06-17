/** Production API — used when VITE_API_URL is not set at build time. */
const DEFAULT_PROD_API = "https://farmer-qi-api.vercel.app";

function resolveApiBase(): string {
  const configured = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
  if (configured) return configured;
  // Local dev uses Vite proxy (/api → localhost:3001). Production must hit the API host.
  if (import.meta.env.DEV) return "";
  return DEFAULT_PROD_API;
}

export const API_BASE = resolveApiBase();

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
