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
