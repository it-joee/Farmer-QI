import { z } from "zod";
import { UserRole as UserRoleSchema, type UserRole } from "./roles.js";

export const CreateUserRequest = z.object({
  email: z.string().email(),
  full_name: z.string().trim().min(1, "Full name is required"),
  role: UserRoleSchema,
  office_id: z.string().uuid().nullable().optional(),
  can_access_operations: z.boolean().optional(),
  created_by: z.string().uuid().optional(),
});
export type CreateUserRequest = z.infer<typeof CreateUserRequest>;

export const UpdateUserRequest = z.object({
  full_name: z.string().trim().min(1, "Full name is required").optional(),
  role: UserRoleSchema.optional(),
  office_id: z.string().uuid().nullable().optional(),
  can_access_operations: z.boolean().optional(),
  is_active: z.boolean().optional(),
  updated_by: z.string().uuid().optional(),
});
export type UpdateUserRequest = z.infer<typeof UpdateUserRequest>;

export interface UserListItem {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  office_id: string | null;
  office_name: string | null;
  office_region?: string | null;
  can_access_operations?: boolean;
  is_active: boolean;
  created_at: string;
}
