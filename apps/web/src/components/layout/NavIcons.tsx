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

const filledIconProps = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  width: 20,
  height: 20,
  fill: "currentColor",
};

export function NavIconOverview() {
  return (
    <svg {...filledIconProps}>
      <path d="M19.75 21H14v-5.005a2 2 0 1 0-4 0V21H4.25C3.56 21 3 20.44 3 19.75v-9.315l8.13-7.885a1.24 1.24 0 0 1 1.74 0L21 10.435v9.315c0 .69-.56 1.25-1.25 1.25Zm-4.25-1.5h4v-8.435L12 3.795 4.5 11.07v8.435h4V16c0-1.93 1.57-3.5 3.5-3.5s3.5 1.57 3.5 3.5v3.505-.005Z" />
    </svg>
  );
}

export function NavIconFarmers() {
  return (
    <svg {...filledIconProps}>
      <path fillRule="evenodd" clipRule="evenodd" d="M10.5 13c3.035 0 5.5-2.465 5.5-5.5S13.535 2 10.5 2A5.503 5.503 0 0 0 5 7.5c0 3.035 2.465 5.5 5.5 5.5Zm0-9.5c2.205 0 4 1.795 4 4s-1.795 4-4 4-4-1.795-4-4 1.795-4 4-4Zm2.93 11H7.57a4.762 4.762 0 0 0-4.59 3.52l-1.015 3.785 1.45.39L4.43 18.41A3.253 3.253 0 0 1 7.57 16h5.86c1.47 0 2.76.99 3.14 2.41l1.015 3.785 1.45-.39-1.015-3.785a4.752 4.752 0 0 0-4.59-3.52Zm7.07-3H23V13h-2.5v2.5H19V13h-2.5v-1.5H19V9h1.5v2.5Z" />
    </svg>
  );
}

export function NavIconAggregators() {
  return (
    <svg {...filledIconProps}>
      <path fillRule="evenodd" clipRule="evenodd" d="M7 9C5.07 9 3.5 7.43 3.5 5.5S5.07 2 7 2s3.5 1.57 3.5 3.5S8.93 9 7 9Zm0-5.5a2 2 0 1 0-.001 3.999A2 2 0 0 0 7 3.5Zm6.5 2C13.5 7.43 15.07 9 17 9s3.5-1.57 3.5-3.5S18.93 2 17 2s-3.5 1.57-3.5 3.5Zm1.5 0a2 2 0 1 1 3.999-.001A2 2 0 0 1 15 5.5Zm-6.5 7c0 1.93 1.57 3.5 3.5 3.5s3.5-1.57 3.5-3.5S13.93 9 12 9s-3.5 1.57-3.5 3.5Zm1.5 0a2 2 0 1 1 3.999-.001A2 2 0 0 1 10 12.5Zm5.92 7.425.61 2.27v-.005l1.45-.39-.61-2.265a2.75 2.75 0 0 0-2.655-2.04h-5.43c-1.24 0-2.335.84-2.655 2.04l-.61 2.27 1.45.39.61-2.27c.145-.545.64-.925 1.205-.925h5.43c.565 0 1.06.38 1.205.925Zm4.505-7 .74 2.77 1.45-.39-.74-2.765a2.75 2.75 0 0 0-2.655-2.04h-2.215V12h2.215c.565 0 1.06.38 1.205.925Zm-19.04 2.38 1.45.39v-.005l.74-2.77c.145-.545.64-.925 1.205-.925h2.215v-1.5H4.78c-1.24 0-2.335.84-2.655 2.04l-.74 2.77Z" />
    </svg>
  );
}

export function NavIconOfftakers() {
  return (
    <svg {...filledIconProps}>
      <path fillRule="evenodd" clipRule="evenodd" d="M18.795 6.5H16.5V4H7v1.5h8v10.63c-.425.35-.74.825-.895 1.37h-6.71c-.33-1.15-1.385-2-2.645-2A2.755 2.755 0 0 0 2 18.25 2.755 2.755 0 0 0 4.75 21c1.255 0 2.315-.85 2.645-2h6.715c.33 1.15 1.385 2 2.645 2s2.315-.85 2.645-2h1.355c.69 0 1.25-.56 1.25-1.25v-5.7L18.8 6.5h-.005ZM17.93 8l2.02 3.5H16.5V8h1.43ZM4.75 19.5a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm12 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm2.645-2c-.33-1.15-1.385-2-2.645-2-.085 0-.165.005-.25.015V13h4v4.5h-1.105ZM12 7.5H4V9h8V7.5ZM2 11h6v1.5H2V11Z" />
    </svg>
  );
}

export function NavIconEvents() {
  return (
    <svg {...filledIconProps}>
      <path fillRule="evenodd" clipRule="evenodd" d="M17.5 3h.75A2.755 2.755 0 0 1 21 5.75v12.5A2.755 2.755 0 0 1 18.25 21H5.75A2.755 2.755 0 0 1 3 18.25V5.75A2.755 2.755 0 0 1 5.75 3h.75V2H8v1h8V2h1.5v1Zm-11 1.5h-.75c-.69 0-1.25.56-1.25 1.25V7.5h15V5.75c0-.69-.56-1.25-1.25-1.25h-.75V6H16V4.5H8V6H6.5V4.5Zm-.75 15h12.5c.69 0 1.25-.56 1.25-1.25V9h-15v9.25c0 .69.56 1.25 1.25 1.25Zm5.5-8.5h1.5v5H14v1.5h-4V16h1.25v-2.5H10V12h1.25v-1Z" />
    </svg>
  );
}

export function NavIconReports() {
  return (
    <svg {...filledIconProps}>
      <path fillRule="evenodd" clipRule="evenodd" d="M11.25 11.25V2h1.5v9.25H22v1.5h-.813a3.875 3.875 0 1 1-6.124 0H12.75V22h-1.5v-9.25H2v-1.5h9.25Zm6.875 1.5a2.375 2.375 0 1 0 0 4.75 2.375 2.375 0 0 0 0-4.75ZM6.5 5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm-3 1.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0Zm13.25 0a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm-2.25.75a2.25 2.25 0 1 1 4.5 0 2.25 2.25 0 0 1-4.5 0ZM7 18a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm-2.5 1a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0Z" />
    </svg>
  );
}

export function NavIconUsers() {
  return (
    <svg {...filledIconProps}>
      <path fillRule="evenodd" clipRule="evenodd" d="M10.5 3.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM5 7.5a5.5 5.5 0 1 1 11 0 5.5 5.5 0 0 1-11 0Zm-.571 10.91-1.015 3.784-1.45-.388L2.98 18.02a4.752 4.752 0 0 1 4.59-3.52H11V16H7.57a3.25 3.25 0 0 0-3.141 2.41Zm11.32-.91a1.75 1.75 0 1 1 3.5 0 1.75 1.75 0 0 1-3.5 0Zm-1.413.75H13v-1.5h1.337c.081-.343.216-.665.397-.956l-.944-.944 1.06-1.06.944.943c.292-.18.613-.315.956-.396V13h1.5v1.337c.343.081.665.216.956.396l.944-.943 1.06 1.06-.943.944c.18.291.315.613.396.956H22v1.5h-1.337a3.231 3.231 0 0 1-.396.956l.944.944-1.061 1.06-.944-.943c-.291.18-.613.315-.956.396V22h-1.5v-1.337a3.232 3.232 0 0 1-.956-.396l-.943.943-1.061-1.06.944-.944a3.229 3.229 0 0 1-.397-.956Z" />
    </svg>
  );
}

export function NavIconTrash() {
  return (
    <svg {...filledIconProps}>
      <path fillRule="evenodd" clipRule="evenodd" d="M21 5h-5v-.25A2.755 2.755 0 0 0 13.25 2h-2.5A2.755 2.755 0 0 0 8 4.75V5H3v1.5h1v12.75A2.755 2.755 0 0 0 6.75 22h10.5A2.755 2.755 0 0 0 20 19.25V6.5h1V5ZM9.5 4.75c0-.69.56-1.25 1.25-1.25h2.5c.69 0 1.25.56 1.25 1.25V5h-5v-.25Zm9 14.5c0 .69-.56 1.25-1.25 1.25H6.75c-.69 0-1.25-.56-1.25-1.25V6.5h13v12.75Zm-8-9.75H9v8h1.5v-8Zm3 0H15v8h-1.5v-8Z" />
    </svg>
  );
}

export type NavIconKey = "overview" | "farmers" | "aggregators" | "offtakers" | "events" | "reports" | "users" | "trash";

const NAV_ICONS: Record<NavIconKey, ComponentType> = {
  overview: NavIconOverview,
  farmers: NavIconFarmers,
  aggregators: NavIconAggregators,
  offtakers: NavIconOfftakers,
  events: NavIconEvents,
  reports: NavIconReports,
  users: NavIconUsers,
  trash: NavIconTrash,
};

export function NavIcon({ name }: { name: NavIconKey }) {
  const Icon = NAV_ICONS[name];
  return (
    <span className="app-nav__icon">
      <Icon />
    </span>
  );
}
