import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

interface FormGroupProps {
  fieldId: string;
  label?: ReactNode;
  error?: string;
  hint?: ReactNode;
  className?: string;
  labelFor?: string | null;
  children: ReactNode;
}

function enhanceControl(child: ReactNode, error: string | undefined, errorId: string | undefined) {
  if (!isValidElement(child)) return child;

  const props: Record<string, unknown> = {};
  if (error) {
    props["aria-invalid"] = true;
    if (errorId) props["aria-describedby"] = errorId;
  }
  if (child.props && typeof child.props === "object" && "invalid" in child.props) {
    props.invalid = Boolean(error);
  }

  return Object.keys(props).length > 0 ? cloneElement(child as ReactElement, props) : child;
}

export function FormGroup({
  fieldId,
  label,
  error,
  hint,
  className,
  labelFor = fieldId,
  children,
}: FormGroupProps) {
  const errorId = error ? `${fieldId}-error` : undefined;
  const classes = ["form-group", error ? "form-group--invalid" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      {label &&
        (labelFor ? (
          <label htmlFor={labelFor}>{label}</label>
        ) : (
          <span className="field-label">{label}</span>
        ))}
      {enhanceControl(children, error, errorId)}
      {error && (
        <p className="field-error" id={errorId} role="alert">
          {error}
        </p>
      )}
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}
