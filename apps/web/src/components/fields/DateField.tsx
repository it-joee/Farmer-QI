import { useEffect, useRef, useState } from "react";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"] as const;

interface CalendarDay {
  day: number;
  month: number;
  year: number;
  outside: boolean;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function parseIso(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatDisplay(value: string): string {
  const date = parseIso(value);
  if (!date) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function buildCalendar(year: number, month: number): CalendarDay[] {
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const cells: CalendarDay[] = [];

  for (let i = firstWeekday - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    cells.push({ day, month: prevMonth, year: prevYear, outside: true });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, month, year, outside: false });
  }

  let nextDay = 1;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  while (cells.length % 7 !== 0) {
    cells.push({ day: nextDay++, month: nextMonth, year: nextYear, outside: true });
  }

  return cells;
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

interface DateFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export function DateField({
  id,
  value,
  onChange,
  placeholder = "Select date",
  required,
}: DateFieldProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const initial = parseIso(value) ?? new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  useEffect(() => {
    const date = parseIso(value);
    if (date) {
      setViewYear(date.getFullYear());
      setViewMonth(date.getMonth());
    }
  }, [value]);

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

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  const todayIso = toIso(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate()
  );
  const days = buildCalendar(viewYear, viewMonth);

  return (
    <div className="date-field" ref={rootRef}>
      <button
        type="button"
        id={id}
        className="date-field__trigger"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        <span className={value ? "date-field__value" : "date-field__placeholder"}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <span className="date-field__icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.75" />
            <path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </span>
      </button>
      {required && !value && (
        <input
          tabIndex={-1}
          aria-hidden
          required
          value=""
          onChange={() => undefined}
          className="date-field__validator"
        />
      )}

      {open && (
        <div className="date-field__popover" role="dialog" aria-label="Choose date">
          <div className="calendar">
            <div className="calendar__header">
              <p className="calendar__title">{monthLabel(viewYear, viewMonth)}</p>
              <div className="calendar__nav">
                <button type="button" className="calendar__nav-btn" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
                  ‹
                </button>
                <button type="button" className="calendar__nav-btn" aria-label="Next month" onClick={() => shiftMonth(1)}>
                  ›
                </button>
              </div>
            </div>

            <div className="calendar__weekdays">
              {WEEKDAYS.map((label, index) => (
                <span key={`${label}-${index}`} className="calendar__weekday">
                  {label}
                </span>
              ))}
            </div>

            <div className="calendar__grid">
              {days.map((cell) => {
                const iso = toIso(cell.year, cell.month, cell.day);
                const isSelected = value === iso;
                const isToday = todayIso === iso;
                return (
                  <button
                    key={iso + (cell.outside ? "-out" : "")}
                    type="button"
                    className={[
                      "calendar__day",
                      cell.outside ? "calendar__day--outside" : "",
                      isSelected ? "calendar__day--selected" : "",
                      isToday && !isSelected ? "calendar__day--today" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => {
                      onChange(iso);
                      setOpen(false);
                    }}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            <div className="calendar__footer">
              <button
                type="button"
                className="calendar__footer-btn"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                Clear
              </button>
              <button
                type="button"
                className="calendar__footer-btn"
                onClick={() => {
                  onChange(todayIso);
                  setViewYear(new Date().getFullYear());
                  setViewMonth(new Date().getMonth());
                  setOpen(false);
                }}
              >
                Today
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
