import { useNavigate } from "react-router-dom";

interface BackButtonProps {
  fallback?: string;
  className?: string;
}

export function BackButton({ fallback = "/farmers", className = "back-link" }: BackButtonProps) {
  const navigate = useNavigate();

  function handleClick() {
    const historyIdx = window.history.state?.idx;
    if (typeof historyIdx === "number" && historyIdx > 0) {
      navigate(-1);
      return;
    }
    navigate(fallback);
  }

  return (
    <button type="button" className={className} onClick={handleClick}>
      <span className="back-link__icon" aria-hidden="true">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width={20}
          height={20}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5.5 12.002H19" />
          <path d="M10.9999 18.002C10.9999 18.002 4.99998 13.583 4.99997 12.0019C4.99996 10.4208 11 6.00195 11 6.00195" />
        </svg>
      </span>
      Back
    </button>
  );
}
