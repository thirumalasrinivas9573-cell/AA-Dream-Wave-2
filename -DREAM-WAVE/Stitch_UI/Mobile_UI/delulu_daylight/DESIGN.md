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
  tertiary: '#246185'
  on-tertiary: '#ffffff'
  tertiary-container: '#427a9f'
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
  tertiary-fixed: '#c8e6ff'
  tertiary-fixed-dim: '#96cdf5'
  on-tertiary-fixed: '#001e2f'
  on-tertiary-fixed-variant: '#004c6e'
  background: '#f9f9ff'
  on-background: '#001c3b'
  surface-variant: '#d5e3ff'
typography:
  display-hero:
    fontFamily: Outfit
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
  display-hero-mobile:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Outfit
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Outfit
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: Outfit
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Outfit
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Outfit
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Outfit
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.375rem
  space-sm: 0.75rem
  space-md: 1.25rem
  space-lg: 1.75rem
  space-xl: 2.5rem
---

## Brand & Style

The design system embodies an airy, optimistic, and luminous atmosphere engineered specifically for modern students navigating high-ambition academic journeys. It moves away from cold, stress-inducing productivity tooling into an uplifting daylight sanctuary where aspirational ("delulu") goals feel reachable, structured, and clear.

The design movement combines soft atmospheric glassmorphism with high-key airy minimalism:
- **Atmosphere:** Expansive, weightless, cloud-level clarity fueled by delicate cerulean washes and light gradients.
- **Glass & Surface:** Frosted pale-blue glass layers, translucent container tiers, and subtle luminous edge-highlights.
- **Tone:** Encouraging, crisp, intellectually playful, and calm without drifting into sterile clinical minimalism.

## Colors

The palette relies on a nuanced luminous sky-scale, grounded by deep navy ink to ensure strict visual hierarchy and AA/AAA contrast.

### Palette Architecture
- **Canvas & Base Atmosphere:** Multi-stop ambient linear gradient running from top-left `#E6F3FD` through `#D4ECFB` down to `#F0F8FE`.
- **Card Surfaces:** Pale blue-white tonal blends (`#F3FAFF` to `#EAF5FD`) overlaying the canvas.
- **Frosted Translucency:** `rgba(217, 236, 250, 0.80)` with high-pass backdrop blur.
- **Interactive Primary:** `#2F8FDD` (CTA fills, active indicators, interactive icons), shifting to `#2478BE` on hover. Contrast typography on primary fills is always clean pure white (`#FFFFFF`).
- **Focus & Accent:** Electric Cyan `#00C2DE` reserved for progress gauges, active AI stream trackers, and dynamic state pulses.
- **Tonal Chips & Fills:** `#EBFAFF` (level 1), `#D4F1FE` (level 2), `#BFE0F7` (level 3), `#AAD3F1` (level 4), and `#8CC3EB` (level 5).
- **Ink & Typography:** Deep ocean navy `#0B2545` for primary readability; muted maritime slate `#4F6A85` for meta-text, disabled states, and secondary hints.
- **Feedback Accents:** Success emerald `#1FB77A` and mindful warning amber `#F5A524`.

## Typography

Typography pairs the structural, geometric warmth of Outfit for display and labeling with the ergonomic, highly legible Plus Jakarta Sans for dense body text, task breakdowns, and prompt generation outputs.

- **Headlines & Metric Callouts:** Rendered in Outfit (`600` and `700` weights). Kerning should be tightened slightly (`-0.01em` to `-0.02em`) on display sizes to create an editorial, modern app presence.
- **Running & Conversational Copy:** Rendered in Plus Jakarta Sans. Line heights are comfortably generous (`1.5` to `1.6`) to prevent cognitive exhaustion during long revision blocks.
- **Labels, Pills & Microcopy:** Rendered in Outfit (`600` weight) in sentence case to preserve friendly approachability without looking overly administrative.

## Layout & Spacing

The dashboard relies on an asymmetric, breathing 12-column fluid grid system on desktop, collapsing smoothly to an 8-column layout on tablet and a single-column stacked layout on mobile devices.

### Breakpoints & Layout Adaptations
- **Desktop (≥ 1280px):** 12 columns, `gutter: 1.5rem`, `margin: 2rem`. AI companion widgets and study planners can dock side-by-side with modular flex ratios (`8:4` or `9:3`).
- **Tablet (768px – 1279px):** 8 columns, `gutter: 1.25rem`, `margin: 1.5rem`. Secondary sidebars collapse into persistent horizontal floating summary strips.
- **Mobile (< 768px):** 4 columns / single track, `gutter-mobile: 1rem`, `margin-mobile: 1rem`. Glass navigation shifts into a bottom dock.

Interior component padding prioritizes ample whitespace (`space-md` for ordinary elements, `space-lg` for primary card bodies) to evoke open skies and reduce visual clutter.

## Elevation & Depth

Visual depth is achieved through ambient light-scattering and frosted refraction rather than opaque shadow stacking.

### Surface System
- **Layer 0 (Canvas Base):** Ambient sky canvas gradient (`#E6F3FD` to `#F0F8FE`).
- **Layer 1 (Resting Cards):** Solid-translucent pale-blue gradients (`#F3FAFF` to `#EAF5FD`) framed with a crisp `1px solid rgba(255, 255, 255, 0.8)`.
- **Layer 2 (Floating Glass & Modals):** Frosted sky acrylic (`rgba(217, 236, 250, 0.80)`) with `backdrop-filter: blur(16px)` and an internal `inset 0 1px 1px 0 rgba(255, 255, 255, 0.9)`.
- **Layer 3 (Popovers, Selects, Overlays):** `#FFFFFF` with `rgba(255, 255, 255, 0.95)` translucency.

### Ambient Shadow Formulas
- **Soft Ambient Tier (Resting Cards):**  
  `0 8px 24px -4px rgba(47, 143, 221, 0.08), 0 2px 6px -1px rgba(11, 37, 69, 0.03)`
- **Elevated Hover Tier:**  
  `0 16px 36px -6px rgba(47, 143, 221, 0.16), 0 4px 12px -2px rgba(11, 37, 69, 0.04)`
- **Glass Drop:**  
  `0 20px 48px -10px rgba(0, 194, 222, 0.12), 0 10px 20px -5px rgba(47, 143, 221, 0.08)`

## Shapes

The design system maintains generous, friendly rounding across all components. High-level content containers and primary study cards adopt a `24px` to `28px` corner radius (`rounded-xl` to custom outer panels), reflecting cloud-like softness while preventing visual collision.

- **Primary Cards & Modals:** `24px` to `28px` border radius.
- **Inner Interactive Panels & Wells:** `16px` (`rounded-lg`).
- **Input Fields & Action Controls:** `12px` to `16px`.
- **Pills, Badges, Status Chips & Primary Action Buttons:** Fully pill-shaped (`9999px`) to invite natural touch and click interactions.

## Components

### Buttons
- **Primary Action:** Solid `#2F8FDD` background, pure white `#FFFFFF` text, Outfit `600`, pill-shaped (`rounded-full`). Soft glow shadow: `0 4px 14px rgba(47, 143, 221, 0.35)`. Transitions to `#2478BE` on hover with a `transform: translateY(-1px)`.
- **Secondary (Frosted Sky):** Translucent fill `#EBFAFF`, border `1px solid #AAD3F1`, text `#2F8FDD`. On hover, background shifts to `#D4F1FE`.
- **Ghost Action:** Borderless, text `#4F6A85`, hover background `rgba(217, 236, 250, 0.45)`, text `#0B2545`.

### Chips & Badges
- **Status Pills:** Background `#EBFAFF` or `#D4F1FE`, text `#0B2545`, padding `4px 12px`, radius `9999px`, with an optional `6px` circular status indicator light (e.g., `#00C2DE` for live AI tasks, `#1FB77A` for completed modules).
- **Interactive Topic Filters:** Resting state `#EBFAFF` with text `#4F6A85`. Selected state fills `#2F8FDD` with white text `#FFFFFF`.

### Cards & Panels
- **Study Canvas Card:** Linear gradient `#F3FAFF` to `#EAF5FD`, border `1px solid rgba(255, 255, 255, 0.8)`, corner radius `26px`, padding `space-lg`.
- **Interactive Metric Card:** Resting ambient shadow; on hover, shifts `translateY(-2px)` with shadow bloom `0 16px 32px rgba(47, 143, 221, 0.14)`.

### Input Fields & Prompts
- **AI Prompt Bar:** Floating translucent `#F3FAFF` input with `1.5px solid #BFE0F7`, Outfit placeholder text in `#4F6A85`, height `56px`, pill radius (`28px`), with embedded cyan `#00C2DE` spark button.
- **Form Text Fields:** Height `44px`, background `rgba(255, 255, 255, 0.75)`, border `1px solid #AAD3F1`, focus ring `0 0 0 3px rgba(0, 194, 222, 0.25)` with border color shifting to `#2F8FDD`.

### Checkboxes & Radios
- **Selection Base:** `20px` size, rounded `6px` for checkbox, circular for radio. Resting border `1.5px solid #AAD3F1`, background `#FFFFFF`.
- **Checked State:** Background `#2F8FDD` with clean white checkmark vector, accompanied by a subtle ambient blue pulse ring.

### Specialized AI Dashboard Components
- **Progress Gauge (Donut / Ring):** Background stroke `#D4F1FE`, active progress stroke `#00C2DE` with rounded caps, center text Outfit `700` in `#0B2545`.
- **AI Delulu Roadmap Node:** Frosted floating glass pill `#D9ECFA` (`80%` opacity) with active beacon glowing `#00C2DE`.