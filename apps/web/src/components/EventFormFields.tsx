import { FormGroup } from "./FormGroup";
import { DateField } from "./fields/DateField";
import type { FieldValidation } from "../lib/form-validation";
import type { FieldErrors } from "../lib/form-validation";

export interface EventFormValues {
  title: string;
  eventDate: string;
  communityLocation: string;
  description: string;
  district: string;
  mofaOfficer: string;
}

interface EventFormFieldsProps {
  values: EventFormValues;
  errors?: FieldErrors;
  onChange: <K extends keyof EventFormValues>(field: K, value: EventFormValues[K]) => void;
}

export function validateEventForm(values: EventFormValues): FieldValidation | null {
  if (!values.title.trim()) {
    return { fieldId: "event-title", message: "Event title is required." };
  }
  if (!values.eventDate) {
    return { fieldId: "event-date", message: "Event date is required." };
  }
  return null;
}

export function EventFormFields({ values, errors, onChange }: EventFormFieldsProps) {
  return (
    <div className="form-grid">
      <FormGroup fieldId="event-title" label="Event title/topic" error={errors?.["event-title"]}>
        <input
          id="event-title"
          type="text"
          value={values.title}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="e.g. Sorghum training — Wa community"
        />
      </FormGroup>

      <FormGroup fieldId="event-date" label="Date" error={errors?.["event-date"]}>
        <DateField
          id="event-date"
          value={values.eventDate}
          onChange={(value) => onChange("eventDate", value)}
          invalid={Boolean(errors?.["event-date"])}
        />
      </FormGroup>

      <FormGroup fieldId="event-community-location" label="Event community/location">
        <input
          id="event-community-location"
          type="text"
          value={values.communityLocation}
          onChange={(e) => onChange("communityLocation", e.target.value)}
          placeholder="e.g. Wa, community hall"
        />
      </FormGroup>

      <FormGroup fieldId="event-district" label="District">
        <input
          id="event-district"
          type="text"
          value={values.district}
          onChange={(e) => onChange("district", e.target.value)}
          placeholder="e.g. Wa Municipal"
        />
      </FormGroup>

      <FormGroup fieldId="event-mofa-officer" label="MoFA Officer">
        <input
          id="event-mofa-officer"
          type="text"
          value={values.mofaOfficer}
          onChange={(e) => onChange("mofaOfficer", e.target.value)}
          placeholder="Officer name"
        />
      </FormGroup>

      <FormGroup
        fieldId="event-description"
        label="Notes"
        className="form-group--full"
      >
        <textarea
          id="event-description"
          value={values.description}
          onChange={(e) => onChange("description", e.target.value)}
          rows={3}
          placeholder="Agenda, facilitator, or other details"
        />
      </FormGroup>
    </div>
  );
}

export function eventFormToSubmitInput(
  values: EventFormValues,
  agentId: string
) {
  const communityLocation = values.communityLocation.trim();
  return {
    agentId,
    title: values.title.trim(),
    event_date: values.eventDate,
    location: undefined,
    description: values.description.trim() || undefined,
    community: communityLocation || undefined,
    district: values.district.trim() || undefined,
    mofa_officer: values.mofaOfficer.trim() || undefined,
  };
}

export function eventFormToUpdatePayload(values: EventFormValues) {
  const communityLocation = values.communityLocation.trim();
  return {
    title: values.title.trim(),
    event_date: values.eventDate,
    location: undefined,
    description: values.description.trim() || undefined,
    community: communityLocation || undefined,
    district: values.district.trim() || undefined,
    mofa_officer: values.mofaOfficer.trim() || undefined,
  };
}

function combineCommunityLocation(
  community?: string | null,
  location?: string | null
): string {
  const c = community?.trim() ?? "";
  const l = location?.trim() ?? "";
  if (!c) return l;
  if (!l) return c;
  if (c.toLowerCase() === l.toLowerCase()) return c;
  return `${c}, ${l}`;
}

export function valuesFromEvent(event: {
  title: string;
  event_date: string;
  location?: string | null;
  description?: string | null;
  community?: string | null;
  district?: string | null;
  mofa_officer?: string | null;
}): EventFormValues {
  return {
    title: event.title,
    eventDate: event.event_date.slice(0, 10),
    communityLocation: combineCommunityLocation(event.community, event.location),
    description: event.description ?? "",
    district: event.district ?? "",
    mofaOfficer: event.mofa_officer ?? "",
  };
}
