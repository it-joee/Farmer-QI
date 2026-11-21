import { clearSession, getCurrentUser, SKIP_AUTH } from "../auth";
import { apiUrl } from "./api-url";

export const SESSION_EXPIRED_EVENT = "farmeriq:session-expired";

export const NO_INTERNET_MESSAGE =
  "No internet connection. Please check your network and try again.";
export const NETWORK_UNREACHABLE_MESSAGE =
  "Unable to connect to the server. Please check your internet connection and try again.";

export class OfflineError extends Error {
  constructor(message = NO_INTERNET_MESSAGE) {
    super(message);
    this.name = "OfflineError";
  }
}

export function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function isOfflineError(error: unknown): boolean {
  return error instanceof OfflineError;
}

async function assertApiResponse(res: Response): Promise<Response> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) {
    if (isOffline()) {
      throw new OfflineError(NO_INTERNET_MESSAGE);
    }
    throw new TypeError(
      "API unreachable — the web app is not talking to the API server. Check VITE_API_URL and redeploy the web project."
    );
  }

  if (res.ok) return res;

  // Token expired or invalid — clear session and signal the app to redirect
  if (res.status === 401 && !SKIP_AUTH) {
    clearSession();
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    return res;
  }

  return res;
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (isOffline()) {
    throw new OfflineError(NO_INTERNET_MESSAGE);
  }

  const user = getCurrentUser();
  const headers = new Headers(init?.headers);

  if (user) {
    const token = localStorage.getItem("farmeriq_token");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const url = typeof input === "string" ? apiUrl(input) : input;

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch (error) {
    if (isOffline()) {
      throw new OfflineError(NO_INTERNET_MESSAGE);
    }
    if (error instanceof TypeError) {
      throw new OfflineError(NETWORK_UNREACHABLE_MESSAGE);
    }
    throw error;
  }

  return assertApiResponse(res);
}
