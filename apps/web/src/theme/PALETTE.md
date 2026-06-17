# FarmerIQ Color Palette

Extracted from the agricultural dashboard reference UI (June 2026). Values were sampled from image pixels and grouped by visual role.

## Usage

**CSS** — import in `styles.css` or any component stylesheet:

```css
@import "./theme/colors.css";

.my-card {
  background: var(--palette-card-green);
  color: var(--palette-text);
}
```

**TypeScript** — for Recharts, MapLibre, or inline styles:

```ts
import { palette, chartScales } from "./theme/colors";
```

## Neutrals

| Token | Hex | Use |
|-------|-----|-----|
| `--palette-bg` | `#F7F8F7` | Page background |
| `--palette-surface` | `#FFFFFF` | Card surfaces |
| `--palette-surface-muted` | `#F8F9F7` | Subtle panel fill |
| `--palette-border` | `#E8EBE8` | Dividers, card edges |
| `--palette-border-strong` | `#D8DCD8` | Emphasized borders |

## Text

| Token | Hex | Use |
|-------|-----|-----|
| `--palette-text` | `#181818` | Headings, KPI values |
| `--palette-text-secondary` | `#757575` | Labels, subtitles |
| `--palette-text-muted` | `#BDBDBD` | Inactive dates, “See all” links |
| `--palette-text-inverse` | `#FFFFFF` | Text on dark buttons |

## Green (primary accent)

| Token | Hex | Sampled from |
|-------|-----|--------------|
| `--palette-green-50` | `#F4FBF0` | Lightest wash |
| `--palette-green-100` | `#E8F8D8` | Weather card, progress track |
| `--palette-green-200` | `#DAF0CB` | Soft mint panels |
| `--palette-green-300` | `#C8F0A8` | Progress bar fill |
| `--palette-green-400` | `#B8E890` | Hover / emphasis |
| `--palette-green-500` | `#B0EC80` | Icon backgrounds, calendar active |
| `--palette-green-600` | `#8FD066` | Strong accent |

## Orange / tan (secondary accent)

| Token | Hex | Sampled from |
|-------|-----|--------------|
| `--palette-orange-50` | `#FFF8EF` | Lightest peach wash |
| `--palette-orange-100` | `#FFF3E0` | Delay badge background |
| `--palette-orange-200` | `#FFD8A7` | Corn field mid-tone |
| `--palette-orange-300` | `#FAD1A0` | Warm highlight |
| `--palette-orange-400` | `#EBC48C` | Corn field strong |
| `--palette-orange-500` | `#DEB781` | Map mid-tone |
| `--palette-orange-600` | `#C9925A` | Delay badge text |

## Field map scales

**Wheat** — `#F4FBF0` → `#E8F8DC` → `#C8F4A4` → `#B8E890` → `#9FD86E`

**Corn** — `#FFF8EF` → `#FFE8C8` → `#FAD1A0` → `#EBC48C` → `#DEB781`

## Semantic shortcuts

| Token | Maps to |
|-------|---------|
| `--palette-primary` | Green 300 |
| `--palette-primary-soft` | Green 100 |
| `--palette-accent` | Orange 200 |
| `--palette-warning-bg` | Orange 100 |
| `--palette-warning-text` | Orange 600 |
| `--palette-button-primary-bg` | `#181818` |
| `--palette-calendar-active` | Green 500 |
