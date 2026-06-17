/**
 * FarmerIQ reference palette — programmatic access for charts, maps, etc.
 * CSS mirror: ./colors.css
 */
export const palette = {
  neutral: {
    bg: "#f7f8f7",
    surface: "#ffffff",
    surfaceMuted: "#f8f9f7",
    border: "#e8ebe8",
    borderStrong: "#d8dcd8",
  },
  text: {
    primary: "#181818",
    secondary: "#757575",
    muted: "#bdbdbd",
    inverse: "#ffffff",
  },
  green: {
    50: "#f4fbf0",
    100: "#e8f8d8",
    200: "#daf0cb",
    300: "#c8f0a8",
    400: "#b8e890",
    500: "#b0ec80",
    600: "#8fd066",
  },
  orange: {
    50: "#fff8ef",
    100: "#fff3e0",
    200: "#ffd8a7",
    300: "#fad1a0",
    400: "#ebc48c",
    500: "#deb781",
    600: "#c9925a",
  },
  wheat: {
    100: "#f4fbf0",
    200: "#e8f8dc",
    300: "#c8f4a4",
    400: "#b8e890",
    500: "#9fd86e",
  },
  corn: {
    100: "#fff8ef",
    200: "#ffe8c8",
    300: "#fad1a0",
    400: "#ebc48c",
    500: "#deb781",
  },
  semantic: {
    primary: "#c8f0a8",
    primaryHover: "#b8e890",
    primarySoft: "#e8f8d8",
    primaryTrack: "#e8f8d8",
    accent: "#ffd8a7",
    accentSoft: "#fff3e0",
    accentText: "#c9925a",
    success: "#b0ec80",
    warningBg: "#fff3e0",
    warningText: "#c9925a",
    buttonPrimaryBg: "#181818",
    buttonPrimaryHover: "#000000",
    buttonPrimaryText: "#ffffff",
    cardGreen: "#e8f8d8",
    cardGreenSoft: "#e1efd7",
    iconGreenBg: "#b0ec80",
    calendarActive: "#b0ec80",
  },
} as const;

/** Ordered scales for charts and map overlays. */
export const chartScales = {
  green: [
    palette.green[100],
    palette.green[300],
    palette.green[400],
    palette.green[500],
    palette.green[600],
  ],
  orange: [
    palette.orange[100],
    palette.orange[200],
    palette.orange[300],
    palette.orange[400],
    palette.orange[500],
  ],
  wheat: [
    palette.wheat[100],
    palette.wheat[200],
    palette.wheat[300],
    palette.wheat[400],
    palette.wheat[500],
  ],
  corn: [
    palette.corn[100],
    palette.corn[200],
    palette.corn[300],
    palette.corn[400],
    palette.corn[500],
  ],
} as const;

export type Palette = typeof palette;
