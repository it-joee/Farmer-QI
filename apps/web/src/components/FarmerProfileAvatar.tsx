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
}

export function FarmerProfileAvatar({ name, portraitUrl }: FarmerProfileAvatarProps) {
  const initials = initialsFromName(name);
  const src = portraitUrl ? apiAssetUrl(portraitUrl) : null;

  return (
    <div className="farmer-profile-avatar">
      {src ? (
        <img src={src} alt={`${name} portrait`} />
      ) : (
        <span className="farmer-profile-avatar__initials" aria-label={`${name} initials`}>
          {initials}
        </span>
      )}
    </div>
  );
}
