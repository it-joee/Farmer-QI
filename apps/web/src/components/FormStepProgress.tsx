export interface FormStepItem {
  readonly id: number;
  readonly title: string;
}

interface FormStepProgressProps {
  steps: readonly FormStepItem[];
  currentStep: number;
  onStepSelect?: (stepId: number) => void;
}

function StepCheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function FormStepProgress({
  steps,
  currentStep,
  onStepSelect,
}: FormStepProgressProps) {
  return (
    <nav className="step-progress" aria-label="Form steps">
      {steps.map((s) => {
        const isActive = currentStep === s.id;
        const isDone = currentStep > s.id;
        const className = `step-progress__item${isActive ? " step-progress__item--active" : ""}${
          isDone ? " step-progress__item--done" : ""
        }${onStepSelect ? " step-progress__item--clickable" : ""}`;

        const content = (
          <>
            <span className="step-progress__number">
              {isDone ? <StepCheckIcon /> : s.id}
            </span>
            <span className="step-progress__label">{s.title}</span>
          </>
        );

        if (onStepSelect) {
          return (
            <button
              key={s.id}
              type="button"
              className={className}
              aria-current={isActive ? "step" : undefined}
              onClick={() => onStepSelect(s.id)}
            >
              {content}
            </button>
          );
        }

        return (
          <div
            key={s.id}
            className={className}
            aria-current={isActive ? "step" : undefined}
          >
            {content}
          </div>
        );
      })}
    </nav>
  );
}
