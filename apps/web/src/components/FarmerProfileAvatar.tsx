import { useEffect, useState } from "react";
import { apiAssetUrl } from "../lib/api-url";
import { NavIconAggregators, NavIconOfftakers } from "./layout/NavIcons";

interface FarmerProfileAvatarProps {
  name: string;
  portraitUrl?: string | null;
  className?: string;
  variant?: "farmer" | "aggregator" | "offtaker";
}

function DefaultAvatarIcon({ variant }: { variant: "farmer" | "aggregator" | "offtaker" }) {
  if (variant === "aggregator") {
    return <NavIconAggregators size={36} />;
  }
  if (variant === "offtaker") {
    return <NavIconOfftakers size={36} />;
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={36}
      height={36}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="6.5" cy="16.5" r="4.5" />
      <circle cx="19" cy="18" r="3" />
      <path d="M2 10.4995C3.25349 9.55792 4.81159 9 6.5 9C10.6421 9 14 12.3579 14 16.5C14 16.596 13.9982 16.6915 13.9946 16.7866C13.9719 17.3913 13.9605 17.6937 14.1081 17.8469C14.2556 18 14.5282 18 15.0734 18H16" />
      <path d="M13 9L16.1057 9.58232C18.4466 10.0212 19.6171 10.2407 20.3085 11.0739C21 11.907 21 13.1047 21 15.5" />
      <path d="M20 12L19 12" />
      <path d="M13 12.5V9.58708C13 9.19778 12.9432 8.81056 12.8313 8.43768L11.5 3M4 9V3" />
      <path d="M3 3H13" />
      <path d="M18 9.5V8C18 6.89543 18.8954 6 20 6" />
      <path d="M7 9V3" />
    </svg>
  );
}

export function FarmerProfileAvatar({
  name: _name,
  portraitUrl,
  className,
  variant = "farmer",
}: FarmerProfileAvatarProps) {
  const src = portraitUrl ? apiAssetUrl(portraitUrl) : null;
  const [imageFailed, setImageFailed] = useState(false);
  const classes = ["farmer-profile-avatar", className].filter(Boolean).join(" ");

  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  const showPortrait = Boolean(src) && !imageFailed;

  return (
    <div className={classes}>
      {showPortrait ? (
        <img src={src!} alt="" onError={() => setImageFailed(true)} />
      ) : (
        <span className="farmer-profile-avatar__placeholder" style={{ display: "inline-flex" }} aria-hidden="true">
          <DefaultAvatarIcon variant={variant} />
        </span>
      )}
    </div>
  );
}
