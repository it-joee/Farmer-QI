import type { CreateUserRequest, UpdateUserRequest, UserListItem, PaginatedResponse } from "@farmeriq/shared";
import { apiFetch } from "./api-client";

export interface OfficeOption {
  id: string;
  name: string;
  region: string;
}

export async function fetchUsers(page = 1, limit = 20, search = ""): Promise<PaginatedResponse<UserListItem>> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search && { search }),
  });
  
  const res = await apiFetch(`/api/users?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to load users");
  const data = await res.json();
  
  if ("data" in data) {
    return data;
  }
  
  // Fallback if backend hasn't updated yet
  return {
    data: data.users ?? [],
    total: (data.users ?? []).length,
    page: 1,
    limit: 20,
    totalPages: 1
  };
}

export async function fetchOffices(): Promise<OfficeOption[]> {
  const res = await apiFetch("/api/users/offices");
  if (!res.ok) throw new Error("Failed to load offices");
  const data = await res.json();
  return data.offices ?? [];
}

export async function createUser(
  payload: CreateUserRequest,
  createdBy: string
): Promise<{ user: UserListItem; invite_link: string }> {
  const res = await apiFetch("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, created_by: createdBy }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "Could not create user");
  }

  const data = await res.json();
  return { user: data.user, invite_link: data.invite_link };
}

export async function updateUser(
  userId: string,
  payload: UpdateUserRequest,
  updatedBy: string
): Promise<UserListItem> {
  const res = await apiFetch(`/api/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, updated_by: updatedBy }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "Could not update user");
  }

  const data = await res.json();
  return data.user;
}
