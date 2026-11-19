export type FieldErrors = Record<string, string>;

export interface FieldValidation {
  fieldId: string;
  message: string;
}

export function focusFormField(fieldId: string) {
  const root = document.getElementById(fieldId);
  if (!root) return;

  root.scrollIntoView({ behavior: "smooth", block: "center" });

  if (
    root instanceof HTMLInputElement ||
    root instanceof HTMLTextAreaElement ||
    root instanceof HTMLButtonElement ||
    root instanceof HTMLSelectElement
  ) {
    root.focus({ preventScroll: true });
    return;
  }

  const focusable = root.querySelector<HTMLElement>(
    "input:not([type='hidden']), textarea, button, select, [tabindex]:not([tabindex='-1'])"
  );
  focusable?.focus({ preventScroll: true });
}

export function clearFieldError(errors: FieldErrors, fieldId: string): FieldErrors {
  if (!errors[fieldId]) return errors;
  const next = { ...errors };
  delete next[fieldId];
  return next;
}

export function applyFieldValidation(
  validation: FieldValidation | null,
  setFieldErrors: (errors: FieldErrors) => void
): boolean {
  if (!validation) {
    setFieldErrors({});
    return true;
  }

  setFieldErrors({ [validation.fieldId]: validation.message });
  focusFormField(validation.fieldId);
  return false;
}

export function sanitizePhoneInput(value: string): string {
  return value.replace(/[^\d+\-\s()]/g, "");
}

export function stripNumericCommas(value: string): string {
  return value.replace(/,/g, "");
}

export function formatNumericInput(raw: string, allowDecimal = true): string {
  if (!raw) return "";
  let cleaned = allowDecimal ? raw.replace(/[^0-9.]/g, "") : raw.replace(/[^0-9]/g, "");
  if (!cleaned) return "";

  if (allowDecimal) {
    const firstDot = cleaned.indexOf(".");
    if (firstDot !== -1) {
      cleaned =
        cleaned.slice(0, firstDot + 1) +
        cleaned.slice(firstDot + 1).replace(/\./g, "");
    }
  }

  const [intPart = "", decPart] = cleaned.split(".");
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
}
