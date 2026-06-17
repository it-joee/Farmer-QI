import { z } from "zod";

export const UserRole = z.enum(["agent", "team_lead", "admin"]);
export type UserRole = z.infer<typeof UserRole>;
