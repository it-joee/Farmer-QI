import { clearSession, getCurrentUser, SKIP_AUTH } from "../auth";
import { apiUrl } from "./api-url";

export const SESSION_EXPIRED_EVENT = "farmeriq:session-expired";

async function assertApiResponse(res: Response): Promise<Response> {
  if (res.ok) return res;

  // Token expired or invalid — clear session and signal the app to redirect
  if (res.status === 401 && !SKIP_AUTH) {
    clearSession();
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    return res;
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) {
    throw new TypeError(
      "API unreachable — the web app is not talking to the API server. Check VITE_API_URL and redeploy the web project."
    );
  }

  return res;
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const user = getCurrentUser();
  const headers = new Headers(init?.headers);

  if (user) {
    const token = localStorage.getItem("farmeriq_token");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const url = typeof input === "string" ? apiUrl(input) : input;

  try {
    const res = await fetch(url, { ...init, headers });
    return assertApiResponse(res);
  } catch (error) {
    if (error instanceof TypeError) {
      throw error;
    }
    throw error;
  }
}
