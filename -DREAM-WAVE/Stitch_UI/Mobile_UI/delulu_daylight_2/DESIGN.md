---
name: Delulu Daylight
colors:
  surface: '#f9f9ff'
  surface-dim: '#c7dbff'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d5e3ff'
  on-surface: '#001c3b'
  on-surface-variant: '#404751'
  inverse-surface: '#193151'
  inverse-on-surface: '#ebf1ff'
  outline: '#707882'
  outline-variant: '#c0c7d3'
  surface-tint: '#0062a0'
  primary: '#005f9c'
  on-primary: '#ffffff'
  primary-container: '#0079c4'
  on-primary-container: '#fdfcff'
  inverse-primary: '#9bcaff'
  secondary: '#006878'
  on-secondary: '#ffffff'
  secondary-container: '#49e1fd'
  on-secondary-container: '#006170'
  tertiary: '#37607a'
  on-tertiary: '#ffffff'
  tertiary-container: '#517994'
  on-tertiary-container: '#fcfcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d0e4ff'
  primary-fixed-dim: '#9bcaff'
  on-primary-fixed: '#001d35'
  on-primary-fixed-variant: '#00497a'
  secondary-fixed: '#a6eeff'
  secondary-fixed-dim: '#3dd8f5'
  on-secondary-fixed: '#001f25'
  on-secondary-fixed-variant: '#004e5b'
  tertiary-fixed: '#c7e7ff'
  tertiary-fixed-dim: '#a3cce9'
  on-tertiary-fixed: '#001e2e'
  on-tertiary-fixed-variant: '#204b64'
  background: '#f9f9ff'
  on-background: '#001c3b'
  surface-variant: '#d5e3ff'
typography:
  display-lg:
    fontFamily: Outfit
    fontSize: 56px
    fontWeight: '600'
    lineHeight: 64px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Outfit
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Outfit
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.015em
  headline-xl-mobile:
    fontFamily: Outfit
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: -0.005em
  headline-sm:
    fontFamily: Outfit
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  title-md:
    fontFamily: Outfit
    fontSize: 17px
    fontWeight: '500'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '500'
    lineHeight: 22px
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 2.5rem
  margin-sm: 1.25rem
  space-xs: 0.375rem
  space-sm: 0.75rem
  space-md: 1.25rem
  space-lg: 1.75rem
  space-xl: 2.5rem
---

## Brand & Style

This design system blends an ethereal, optimistic atmosphere with modern functional clarity. Rooted in an aesthetic of open skies, high-altitude light, and fluid technological intuition, the visual language balances translucent glassmorphism with crisp modern minimalism. It evokes calm ambition, hyper-clarity, and weightless focus. 

Designed for next-generation generative AI workflows, the user interface rejects dark terminal tropes in favor of an illuminated, ambient canvas. Micro-surfaces mimic frosted daylight panels with subtle blue refractions, precise border strokes, and diffuse oceanic ambient drop shadows. The overall interface is precise, expansive, structured, and entirely emoji-free, letting typography and atmospheric tone carry expressive weight.

## Colors

The palette establishes an illuminated daytime hierarchy with strict functional boundaries:

- **Canvas & Ambient Layers:** The root page background sits on `#E6F3FD`, supported by directional cloud-drift gradients shifting between `#D4ECFB` and `#F0F8FE`.
- **Surfaces & Cards:** Elevated card surfaces employ light blue-tinted gradients from `#F3FAFF` to `#EAF5FD`. Secondary nested containers, toolbars, and badges draw from the blue-scale fill continuum: Tier 1 `#EBFAFF`, Tier 2 `#D4F1FE`, Tier 3 `#BFE0F7`, and Tier 4 `#AAD3F1`.
- **Primary Brand:** `#2F8FDD` anchors main interactive triggers, key selections, and informational alerts. Interactive text over primary fills is always high-contrast solid white `#FFFFFF`.
- **Telemetry & Progress:** `#00C2DE` is dedicated strictly to activity indicators, computational progress rings, execution status bars, and streaming AI track indicators.
- **Typography & Content Hierarchy:** Text utilizes high-contrast deep ocean navy `#0B2545` for titles and primary reads. Supporting labels, metadata, and placeholder states use calm slate blue `#4F6A85`.
- **System States:** Operational signaling relies on `#1FB77A` for success, `#F5A524` for warning, `#E63946` for destructive or error events, and `#2F8FDD` for informative messaging.

## Typography

The typography couples geometric structure with refined, open curves. Headlines leverage Outfit for a modern architectural balance, using controlled letter-spacing to ground wide screen layouts. Body and utility roles employ clean, humanist sans-serif styling calibrated strictly at a minimum floor of 15px to preserve optical clarity against translucent and tinted pastel backdrops.

- **Scale Floor:** To safeguard legibility against luminous blue layers, no font size descends below 15px. Contrast between utility labels and running text is governed by weight (500/600), case shifts, and color value rather than minute size reductions.
- **Editorial Balance:** Headings favor moderate weights (500 to 600) rather than heavy black styles to preserve the light, airy atmosphere of the interface.

## Layout & Spacing

The structural layout relies on an airy 12-column responsive fluid grid designed to create breathability between AI control consoles and output views:

- **Desktop (1200px+):** 12 columns with 24px (`1.5rem`) gutters and a minimum 40px (`2.5rem`) outer margin. Maximum content bounds settle at 1440px to prevent visual dispersion on ultra-wide screens.
- **Tablet (768px - 1199px):** 8 columns with 20px gutters and 24px margins. Prompt sidebars and visual preview canvases shift from side-by-side splits to proportional tabbed zones.
- **Mobile (< 768px):** 4 columns with 16px (`1rem`) gutters and 20px (`1.25rem`) safe canvas borders. Control clusters reflow to unified vertical stacks.

Spacing intervals adhere to generous padding increments to maintain open, daylight-inspired composition without cramped boundaries.

## Elevation & Depth

Visual depth is produced using luminous ambient stratification instead of heavy muddy drop shadows. Surfaces appear suspended within daylight:

- **Surface Tiers:**
  - Base: Solid canvas `#E6F3FD` layered under dynamic sky gradients (`#D4ECFB` to `#F0F8FE`).
  - Layer 1 (Primary Panels): Laminated cards using `#F3FAFF` to `#EAF5FD` gradient surfaces bordered by a hairline stroke (`1px solid rgba(255, 255, 255, 0.7)`).
  - Layer 2 (Floating Consoles): Semi-transparent frosted glass (`rgba(243, 250, 255, 0.75)` with `16px` backdrop-filter blur) for navigation bars, contextual tooltips, and floating prompt inputs.
- **Shadow Profiles:**
  - Ambient Low: `0 4px 16px -2px rgba(11, 37, 69, 0.04), 0 2px 6px -1px rgba(47, 143, 221, 0.06)`.
  - Ambient Raised: `0 12px 32px -4px rgba(11, 37, 69, 0.06), 0 4px 12px -2px rgba(47, 143, 221, 0.08)`.
  - Hover / Focus Lift: `0 20px 40px -6px rgba(11, 37, 69, 0.08), 0 8px 20px -2px rgba(0, 194, 222, 0.12)`.

## Shapes

The design uses broad, sculptural curvatures that balance organic atmosphere with technological order. Primary view containers, modal panels, and structural workflow cards implement a dominant 24px to 28px corner radius. Form inputs, operational buttons, segmented switch blocks, and interactive tags share a unified 14px radius, creating clear visual nesting within large containers.

## Components

### Buttons
- **Primary:** Background `#2F8FDD`, text `#FFFFFF`, border-radius 14px, internal padding `12px 24px`. Subtle top-lit highlight (`inset 0 1px 0 rgba(255, 255, 255, 0.25)`). Hover transforms to `#257ec5` with a delicate sky-blue ambient aura.
- **Secondary / Ghost:** Translucent fill using `#EBFAFF`, text `#0B2545`, 1px perimeter border of `#BFE0F7`. Hover fills with `#D4F1FE`.

### Input Fields & Controls
- Form controls feature an exact 14px radius, solid `#FFFFFF` or `rgba(255, 255, 255, 0.8)` fill, and a 1.5px border of `#BFE0F7`.
- Focus state switches the border to primary `#2F8FDD` with an outer glow of `0 0 0 3px rgba(47, 143, 221, 0.18)`. Placeholder text rests at secondary `#4F6A85`.

### Cards & Workspaces
- Surface bounds are defined by a 24px or 28px radius, built with linear gradient fills from `#F3FAFF` (top-left) to `#EAF5FD` (bottom-right).
- Outlined with crisp `1px solid rgba(255, 255, 255, 0.85)` borders to deliver crisp separation against the ambient canvas.

### Chips & Badges
- Filter tags and prompt attributes employ a 14px border radius, background `#EBFAFF`, text `#0B2545`, and a 1px border of `#D4F1FE`.
- Active tags invert to `#2F8FDD` fill with `#FFFFFF` text.

### Selection Controls (Checkboxes & Radios)
- Fixed dimensions with 6px radius for checkboxes and full circular curvature for radio controls. Bordered in `#AAD3F1`, activating into `#2F8FDD` with an inner white check glyph or central dot.

### Telemetry, Progress Rings & Meters
- Linear and circular generation progress visuals use the reserved accent `#00C2DE` set over background tracks of `#EBFAFF`.
- Progress rings include a soft outer blur (`0 0 10px rgba(0, 194, 222, 0.35)`) to signal active AI synthesis.

### Lists & Activity Feeds
- Transparent backdrops with rows divided by delicate hairline strokes (`1px solid #D4ECFB`). Active or highlighted rows transition to `#F3FAFF` with a rounded 14px edge inset.