import type { ComponentType } from "react";

const iconProps = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  width: 20,
  height: 20,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.25,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function NavIconOverview() {
  return (
    <svg {...iconProps}>
      <path d="M3 12C3 7.75737 3 5.63605 4.31802 4.31803C5.63604 3.00002 7.75736 3.00002 12 3.00002C16.2426 3.00002 18.364 3.00002 19.682 4.31803C21 5.63605 21 7.75737 21 12C21 16.2427 21 18.364 19.682 19.682C18.364 21 16.2426 21 12 21C7.75736 21 5.63604 21 4.31802 19.682C3 18.364 3 16.2427 3 12Z" />
      <path d="M3.5 8.00002H20.5" />
      <path d="M17 17C17 14.2386 14.7614 12 12 12C9.23858 12 7 14.2386 7 17" />
      <path d="M12.707 15.293L11.2928 16.7072" />
    </svg>
  );
}

export function NavIconFarmers() {
  return (
    <svg {...iconProps}>
      <path d="M17 8.5C17 5.73858 14.7614 3.5 12 3.5C9.23858 3.5 7 5.73858 7 8.5C7 11.2614 9.23858 13.5 12 13.5C14.7614 13.5 17 11.2614 17 8.5Z" />
      <path d="M19 20.5C19 16.634 15.866 13.5 12 13.5C8.13401 13.5 5 16.634 5 20.5" />
    </svg>
  );
}

export function NavIconEvents() {
  return (
    <svg {...iconProps}>
      <path d="M16 2V6M8 2V6" />
      <path d="M13 4H11C7.22876 4 5.34315 4 4.17157 5.17157C3 6.34315 3 8.22876 3 12V14C3 17.7712 3 19.6569 4.17157 20.8284C5.34315 22 7.22876 22 11 22H13C16.7712 22 18.6569 22 19.8284 20.8284C21 19.6569 21 17.7712 21 14V12C21 8.22876 21 6.34315 19.8284 5.17157C18.6569 4 16.7712 4 13 4Z" />
      <path d="M3 10H21" />
      <path d="M15.5 15.5V17.5M17 16.5C17 17.3284 16.3284 18 15.5 18C14.6716 18 14 17.3284 14 16.5C14 15.6716 14.6716 15 15.5 15C16.3284 15 17 15.6716 17 16.5Z" />
    </svg>
  );
}

export function NavIconReports() {
  return (
    <svg {...iconProps}>
      <path d="M7 18V16M12 18V15M17 18V13M2.5 12C2.5 7.52166 2.5 5.28249 3.89124 3.89124C5.28249 2.5 7.52166 2.5 12 2.5C16.4783 2.5 18.7175 2.5 20.1088 3.89124C21.5 5.28249 21.5 7.52166 21.5 12C21.5 16.4783 21.5 18.7175 20.1088 20.1088C18.7175 21.5 16.4783 21.5 12 21.5C7.52166 21.5 5.28249 21.5 3.89124 20.1088C2.5 18.7175 2.5 16.4783 2.5 12Z" />
      <path d="M5.99219 11.4863C8.14729 11.5581 13.0341 11.2328 15.8137 6.82132M13.9923 6.28835L15.8678 5.98649C16.0964 5.95738 16.432 6.13785 16.5145 6.35298L17.0104 7.99142" />
    </svg>
  );
}

export function NavIconUsers() {
  return (
    <svg {...iconProps}>
      <path d="M14.5 8.5C14.5 6.015 12.485 4 10 4C7.515 4 5.5 6.015 5.5 8.5C5.5 10.985 7.515 13 10 13C12.485 13 14.5 10.985 14.5 8.5Z" />
      <path d="M16.5 20.5C16.5 16.91 13.59 14 10 14C6.41 14 3.5 16.91 3.5 20.5" />
      <path d="M18.5 11.5C18.5 10.015 19.765 8.75 21.25 8.75" />
      <path d="M20.5 20.5C20.5 17.738 18.485 15.5 16 15.5" />
    </svg>
  );
}

export type NavIconKey = "overview" | "farmers" | "events" | "reports" | "users";

const NAV_ICONS: Record<NavIconKey, ComponentType> = {
  overview: NavIconOverview,
  farmers: NavIconFarmers,
  events: NavIconEvents,
  reports: NavIconReports,
  users: NavIconUsers,
};

export function NavIcon({ name }: { name: NavIconKey }) {
  const Icon = NAV_ICONS[name];
  return (
    <span className="app-nav__icon">
      <Icon />
    </span>
  );
}
