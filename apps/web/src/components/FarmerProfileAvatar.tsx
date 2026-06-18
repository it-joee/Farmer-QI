import { useEffect, useState } from "react";
import { apiAssetUrl } from "../lib/api-url";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

interface FarmerProfileAvatarProps {
  name: string;
  portraitUrl?: string | null;
  className?: string;
}

export function FarmerProfileAvatar({ name, portraitUrl, className }: FarmerProfileAvatarProps) {
  const initials = initialsFromName(name);
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
        <span className="farmer-profile-avatar__initials">{initials}</span>
      )}
    </div>
  );
}
