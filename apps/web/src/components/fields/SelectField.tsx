import { useEffect, useRef, useState } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  variant?: "default" | "compact";
}

export function SelectField({
  id,
  value,
  onChange,
  options,
  placeholder = "Select",
  required,
  variant = "default",
}: SelectFieldProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const display = selected?.label ?? placeholder;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div
      className={`select-field${variant === "compact" ? " select-field--compact" : ""}`}
      ref={rootRef}
    >
      <button
        type="button"
        id={id}
        className="select-field__trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
      >
        <span className={selected ? "select-field__value" : "select-field__placeholder"}>
          {display}
        </span>
        <span className="select-field__chevron" aria-hidden="true" />
      </button>
      {required && !value && (
        <input
          tabIndex={-1}
          aria-hidden
          required
          value=""
          onChange={() => undefined}
          className="select-field__validator"
        />
      )}

      {open && (
        <ul className="select-field__menu" role="listbox" aria-labelledby={id}>
          {options.map((option) => (
            <li key={option.value || "__empty"}>
              <button
                type="button"
                role="option"
                aria-selected={value === option.value}
                className={`select-field__option${value === option.value ? " select-field__option--active" : ""}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
