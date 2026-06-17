import { z } from "zod";

export const CreateEventRequest = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  event_date: z.string().min(1),
  location: z.string().optional(),
  community: z.string().optional(),
  district: z.string().optional(),
  mofa_officer: z.string().optional(),
});
export type CreateEventRequest = z.infer<typeof CreateEventRequest>;

export const UpdateEventRequest = CreateEventRequest;
export type UpdateEventRequest = z.infer<typeof UpdateEventRequest>;

export const EventAttendeeGender = z.enum(["male", "female"]);
export type EventAttendeeGender = z.infer<typeof EventAttendeeGender>;

export const GENDER_OPTIONS: { value: EventAttendeeGender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

export const CreateEventAttendeeRequest = z.object({
  full_name: z.string().min(1),
  phone: z.string().min(1),
  community: z.string().min(1),
  gender: EventAttendeeGender,
  age: z.number().int().positive(),
});
export type CreateEventAttendeeRequest = z.infer<typeof CreateEventAttendeeRequest>;

export interface EventRecord {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location: string | null;
  community: string | null;
  district: string | null;
  mofa_officer: string | null;
  created_by: string;
  office_id: string | null;
  created_at: string;
  updated_at: string;
  attendance_count?: number;
}

export interface EventAttendee {
  id: string;
  event_id: string;
  full_name: string;
  phone: string | null;
  community: string | null;
  gender: string | null;
  age: number | null;
  marked_by: string;
  marked_at: string;
}

export interface EventDetail extends EventRecord {
  attendees: EventAttendee[];
}
