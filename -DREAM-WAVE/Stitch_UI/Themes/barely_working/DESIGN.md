---
name: Barely Working
colors:
  surface: '#0f131c'
  surface-dim: '#0f131c'
  surface-bright: '#353943'
  surface-container-lowest: '#0a0e16'
  surface-container-low: '#181c24'
  surface-container: '#1c2028'
  surface-container-high: '#262a33'
  surface-container-highest: '#31353e'
  on-surface: '#dfe2ee'
  on-surface-variant: '#c5c6ce'
  inverse-surface: '#dfe2ee'
  inverse-on-surface: '#2c303a'
  outline: '#8f9098'
  outline-variant: '#44474d'
  surface-tint: '#b7c7ea'
  primary: '#b7c7ea'
  on-primary: '#21304c'
  primary-container: '#5a6988'
  on-primary-container: '#e1e9ff'
  inverse-primary: '#4f5e7d'
  secondary: '#b3c7f1'
  on-secondary: '#1b3052'
  secondary-container: '#35496d'
  on-secondary-container: '#a5b9e2'
  tertiary: '#bbc7e1'
  on-tertiary: '#253045'
  tertiary-container: '#5e6980'
  on-tertiary-container: '#e1e9ff'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d7e2ff'
  primary-fixed-dim: '#b7c7ea'
  on-primary-fixed: '#0a1b36'
  on-primary-fixed-variant: '#384764'
  secondary-fixed: '#d7e3ff'
  secondary-fixed-dim: '#b3c7f1'
  on-secondary-fixed: '#031b3c'
  on-secondary-fixed-variant: '#33476a'
  tertiary-fixed: '#d7e2fe'
  tertiary-fixed-dim: '#bbc7e1'
  on-tertiary-fixed: '#101c2f'
  on-tertiary-fixed-variant: '#3c475d'
  background: '#0f131c'
  on-background: '#dfe2ee'
  surface-variant: '#31353e'
typography:
  display-hero:
    fontFamily: Sora
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-hero-mobile:
    fontFamily: Sora
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Sora
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Sora
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Sora
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Sora
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: 0em
  body-lg:
    fontFamily: IBM Plex Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: 0em
  body-md:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0.01em
  body-sm:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.015em
  label-lg:
    fontFamily: IBM Plex Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-md:
    fontFamily: IBM Plex Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.03em
  label-caps:
    fontFamily: IBM Plex Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.06em
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
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system delivers a calm, low-stimulation digital sanctuary built for deep focus, restorative productivity, and thoughtful downtime. Conceived for creative operators, knowledge workers, and technical professionals who experience digital burnout from hyper-vibrant, high-contrast dashboards, the aesthetic prioritizes atmospheric rest without sacrificing technical precision.

The visual direction merges **Nordic Minimalism** with **Warm Tactile Understatement**. Rather than demanding attention through stark black-and-white contrasts or loud saturated accents, the interface wraps interactions in muted charcoal depths, dusty slate blues, and soft matte surfaces. The emotional tone is grounded, relaxed, mature, and reassuringly deliberate—evoking the feeling of a quiet rain-soaked twilight studio, paper-mache notebooks, and slate ceramics.

## Colors

The palette relies on a tonal, low-stimulation dark continuum designed to eliminate optical fatigue. Visual hierarchy is achieved through subtle value shifting rather than harsh luminosity jumps.

- **Background Canvas (`#242831`):** The grounding deep charcoal surface upon which all elements rest.
- **Card & Container Surfaces (`#333743`):** Elevated charcoal tone providing immediate distinction while maintaining a soft, atmospheric density.
- **Primary Accent (`#5A6988`):** Dusty slate blue applied to actionable targets, focused control toggles, and primary navigation states. Hover states scale softly to `#6A7A9C`.
- **Secondary Accent (`#9DB1DA`):** An airy, muted light blue deployed for high-value metrics, active icons, dynamic progress rings, and focal telemetry.
- **Support Fills & Badges (`#3F4A60`, `#7686A6`):** Secondary contextual markers, non-intrusive container backgrounds, and subdued state indicators.
- **Typography Continuum:**
  - Main text: `#E8EAEE` (crisp, high-legibility silver-white avoiding eye strain).
  - Secondary text: `#A09FA5` (gentle ash for narrative support and meta details).
  - Muted labels: `#BCBFC6` (structural descriptors and static keys).
- **Semantic Accents:**
  - Restful Success: `#5FC99B` (sage green for affirmations and completions).
  - Warm Amber: `#E8B04B` (soft honey amber reserved for non-aggressive notices and banners).
- **Hero Wash:** Linear gradient transitions from `#3F4A60` to `#5A6988` at a 135-degree angle with a 15% noise texture to yield a tactile matte finish.

## Typography

The typographic pairing balances the geometric structure of **Sora** with the utilitarian clarity of **IBM Plex Sans**.

- **Sora (Headlines):** Used strictly across display titles and section headings. Sora's open apertures, geometric stability, and gentle curves inject an authentic, quiet confidence without drawing jarring decorative attention.
- **IBM Plex Sans (Body & Labels):** Provides engineered readability and comfortable rhythm across long-form reading, dense metric rows, and interactive controls.
- Headlines maintain tight negative tracking (`-0.01em` to `-0.02em`) to bind words into coherent visual thoughts. Body copy relies on generous line heights (1.55x to 1.62x) to preserve whitespace and breathing room across darker surfaces.

## Layout & Spacing

This design system employs a **fluid grid with contained max-widths** (1280px) to prevent sprawling, detached layouts on ultra-wide screens.

- **Desktop (1024px+):** 12-column grid, `1.5rem` (24px) gutters, `2.5rem` (40px) outer margins. Cards span standard blocks of 4, 6, 8, or 12 columns.
- **Tablet (768px - 1023px):** 8-column grid, `1.25rem` (20px) gutters, `2rem` (32px) outer margins.
- **Mobile (<768px):** 4-column grid, `1rem` (16px) gutters, `1.25rem` (20px) outer margins. Multi-column cards stack vertically into unified fluid rows.

Spacing follows an intentional cadence: expansive internal container padding (`1.5rem` to `2rem`) pairs with generous element separation to avoid visual density. Layouts must emphasize empty space as a functional component that reduces cognitive load.

## Elevation & Depth

Elevation is established via **subtle luminance transitions and matte ambient occlusion**, avoiding glossy reflections or dramatic high-opacity drop shadows.

1. **Surface 0 (Base Canvas):** `#242831`. Completely flat, non-reflective base plane.
2. **Surface 1 (Cards, Modules):** `#333743`. Layered with a hairline perimeter border: `1px solid rgba(188, 191, 198, 0.12)`. Supported by a wide, soft matte shadow: `0 12px 32px -4px rgba(13, 15, 20, 0.45)`.
3. **Surface 2 (Popovers, Overlays, Floating Controls):** `#3F4A60`. Rimmed with `1px solid rgba(188, 191, 198, 0.18)` and an extended ambient shadow: `0 20px 48px -8px rgba(10, 12, 16, 0.65)`.
4. **Interactive States:** Hover effects never utilize upward physical translation or exaggerated elevation shifts. Instead, elevate gently through a faint inner glow (`inset 0 1px 0 rgba(255, 255, 255, 0.08)`) and border brightening to `rgba(188, 191, 198, 0.22)`.

## Shapes

The geometric silhouette across this design system is generously rounded, organic, and calm. 

- **Primary Cards & Containers:** Radii strictly adhere to **24px - 28px** (`rounded-xl` to custom `rounded-[26px]`), evoking the smoothed edges of tumbled river stones or architectural acoustic panels.
- **Buttons, Form Inputs, & Interactive Surfaces:** Rendered with standard `12px - 14px` (`rounded-lg`) corner radii to maintain crisp tactile predictability.
- **Chips, Pills, & Status Badges:** Fully rounded capsule forms (`rounded-full` / `9999px`) to create an immediate structural contrast against large rectangular containers.

## Components

### Buttons & Interactive Controls
- **Primary Buttons:** Background in `#5A6988` with `#FFFFFF` text. Height of 44px, padding `0 1.25rem`, border radius of 14px. On hover, background shifts quietly to `#6A7A9C`. Focus ring: 2px offset border in `#9DB1DA`.
- **Secondary / Ghost Buttons:** Background in `rgba(63, 74, 96, 0.35)` with `#E8EAEE` text and a subtle `1px solid rgba(188, 191, 198, 0.12)` border. On hover, background deepens to `#3F4A60`.

### Cards & Grouping Containers
- Built on `#333743` with `1px solid rgba(188, 191, 198, 0.12)` borders and `26px` corner rounding.
- Internal padding is locked to `1.5rem` (mobile) and `2rem` (desktop). 
- Headers inside cards utilize Sora Semibold (`headline-sm`) in `#E8EAEE` paired with `#A09FA5` subtitles.

### Chips & Badges
- Capsule-shaped components utilizing `#3F4A60` fills with `#E8EAEE` labels for category markers, or `#7686A6` fills for selected filter chips.
- Padding is compact: `4px 12px`, typography set to `label-caps`.

### Form Inputs & Checkboxes
- **Inputs:** Dark recessed base `#242831` with a `1px solid rgba(188, 191, 198, 0.15)` border and 12px radii. Text sits in `#E8EAEE`, placeholder text in `#A09FA5`. Focus state smoothly activates a `#9DB1DA` 1px border.
- **Checkboxes & Radios:** Unchecked states feature an empty `#242831` frame with an ash border. Checked state fills with `#5A6988` and displays a `#FFFFFF` micro-check.

### Progress Gauges & Rings
- Track troughs use `#242831`. Active progress fills use `#9DB1DA` with round caps. Quantitative metrics set within use Sora Semibold in `#9DB1DA`.

### Ambient Notification Banners
- Non-critical alerts utilize a muted honey amber base `#E8B04B` applied at 10% opacity, with a hairline amber border and solid `#E8B04B` iconography alongside `#E8EAEE` copy.