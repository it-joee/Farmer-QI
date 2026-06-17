import { z } from "zod";
import { UserRole as UserRoleSchema, type UserRole } from "./roles.js";

export const CreateUserRequest = z.object({
  email: z.string().email(),
  full_name: z.string().min(1),
  role: UserRoleSchema,
  office_id: z.string().uuid().nullable().optional(),
  created_by: z.string().uuid().optional(),
});
export type CreateUserRequest = z.infer<typeof CreateUserRequest>;

export const UpdateUserRequest = z.object({
  full_name: z.string().min(1).optional(),
  role: UserRoleSchema.optional(),
  office_id: z.string().uuid().nullable().optional(),
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
  is_active: boolean;
  created_at: string;
}
