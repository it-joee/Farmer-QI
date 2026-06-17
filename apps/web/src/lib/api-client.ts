import { getCurrentUser } from "../auth";
import { apiUrl } from "./api-url";

async function assertApiResponse(res: Response): Promise<Response> {
  if (res.ok) return res;

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
    headers.set("X-Actor-Id", user.id);
    headers.set("X-Actor-Role", user.role);
    if (user.office_id) {
      headers.set("X-Actor-Office-Id", user.office_id);
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
