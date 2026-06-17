import { getCurrentUser } from "../auth";

export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const user = getCurrentUser();
  const headers = new Headers(init?.headers);

  if (user) {
    headers.set("X-Actor-Id", user.id);
    headers.set("X-Actor-Role", user.role);
    if (user.office_id) {
      headers.set("X-Actor-Office-Id", user.office_id);
    }
  }

  return fetch(input, { ...init, headers });
}
