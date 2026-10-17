---
name: Midnight Intelligence
colors:
  surface: '#0a1325'
  surface-dim: '#0a1325'
  surface-bright: '#31394d'
  surface-container-lowest: '#050e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f32'
  surface-container-high: '#212a3d'
  surface-container-highest: '#2c3548'
  on-surface: '#dae2fc'
  on-surface-variant: '#c1c6d5'
  inverse-surface: '#dae2fc'
  inverse-on-surface: '#283044'
  outline: '#8b919e'
  outline-variant: '#414753'
  surface-tint: '#aac7ff'
  primary: '#aac7ff'
  on-primary: '#003064'
  primary-container: '#0466c8'
  on-primary-container: '#dee7ff'
  inverse-primary: '#005db8'
  secondary: '#5de6ff'
  on-secondary: '#00363e'
  secondary-container: '#00cbe6'
  on-secondary-container: '#00515d'
  tertiary: '#a9c7ff'
  on-tertiary: '#003063'
  tertiary-container: '#2a67b9'
  on-tertiary-container: '#dee7ff'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#aac7ff'
  on-primary-fixed: '#001b3e'
  on-primary-fixed-variant: '#00468d'
  secondary-fixed: '#a2eeff'
  secondary-fixed-dim: '#2fd9f4'
  on-secondary-fixed: '#001f25'
  on-secondary-fixed-variant: '#004e5a'
  tertiary-fixed: '#d6e3ff'
  tertiary-fixed-dim: '#a9c7ff'
  on-tertiary-fixed: '#001b3d'
  on-tertiary-fixed-variant: '#00468c'
  background: '#0a1325'
  on-background: '#dae2fc'
  surface-variant: '#2c3548'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 56px
    fontWeight: '700'
    lineHeight: 64px
  display-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
  headline-xl-mobile:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  metric-val:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 36px
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Manrope
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Manrope
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Space Grotesk
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1.5rem
  margin: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style
The design system defines an authoritative, high-clarity command deck designed for mission-critical artificial intelligence workflows and technical orchestration. It targets engineers, AI system operators, and data architects who require low-fatigue environments for prolonged monitoring and high-density telemetry.

The aesthetic fuses modern **Glassmorphism** with refined **Technical Futurism**. Translucent structural panels, sharp atmospheric cyan accents, and deep atmospheric radial glows establish a hyper-focused visual field. The UI evokes computational depth, silent efficiency, and technical precision without feeling chaotic or overwhelming.

## Colors
The color foundation is built on deep cosmic values to anchor the viewport and reduce luminescence strain. 

- **Background:** Primary canvas background is `#040C1E`, enriched with strategic radial ambient glows of `#0353A4` behind critical focal zones.
- **Surfaces & Cards:** Gradient planes ranging from `#001845` to `#0A1F4D` modulated with `rgba(0, 229, 255, 0.12)` keyline borders.
- **Brand Primary:** `#0466C8` anchors primary interactive targets, shifting to `#0353A4` under hover states.
- **Accent Cyan:** `#22D3EE` serves as the high-visibility tactical layer: utilized selectively for progress rings, telemetry indicators, active micro-elements, and real-time state nodes.
- **Feedback & Semantics:** Positive states render in `#34D399` (Success Green); latency and caution states in `#F5B942` (Telemetry Amber).
- **Typography Tones:** Primary copy renders in crisp `#F2F7FF`, while metadata, labels, and secondary supporting content use `#9FB3D1`.

## Typography
Typographic rules rely on an explicit split between analytical calculation and sustained reading:

- **Headlines & Metric Data:** Handled by **Space Grotesk**. Its geometric quirks and tabular clarity enhance system readings, command prompts, telemetry counters, and section headers.
- **Narrative & System Copy:** Handled by **Manrope**. Its open apertures and balanced proportions maintain effortless legibility across complex diagnostic logs, operational updates, and multi-paragraph terminal reports.
- **Metrics & Numbers:** All numeric readouts must activate tabular figures (`tnum`) in CSS font-variant settings to prevent visual jitter during live stream updates.

## Layout & Spacing
The layout model employs a 12-column responsive fluid grid structured around an 8px base module:

- **Desktop (1280px+):** 12 columns with 24px (`1.5rem`) gutters and 32px (`2rem`) outer margins. Command consoles, side panels, and canvas viewports operate with fixed minimum sidebars (280px) and a fluid central execution stage.
- **Tablet (768px - 1279px):** 8 columns with 20px gutters and 24px margins. Diagnostic side panels collapse into sliding overlay sheets.
- **Mobile (< 768px):** 4 columns with 16px gutters and 16px margins. Telemetry displays reflow from horizontal distribution into stacked card streams.

## Elevation & Depth
Depth is produced through translucent glassmorphic layering, subtle rim light borders, and ambient colored radiance rather than traditional heavy drop shadows.

- **Base Layer (Canvas):** Pure `#040C1E` with fixed radial background glows (`radial-gradient(circle at 50% 0%, #0353A4 0%, transparent 60%)`) at 15% opacity.
- **Surface Layer 1 (Containers):** Linear background fill from `rgba(0, 24, 69, 0.75)` to `rgba(10, 31, 77, 0.75)`, paired with a `1px` solid border of `rgba(0, 229, 255, 0.12)` and a `16px` backdrop filter blur. Ambient drop: `0 8px 32px -8px rgba(0, 0, 0, 0.5)`.
- **Surface Layer 2 (Raised Panels / Overlays):** Linear background fill from `rgba(4, 102, 200, 0.15)` to `rgba(10, 31, 77, 0.85)`, paired with `rgba(0, 229, 255, 0.24)` edge borders, `24px` backdrop blur, and dual glow shadows: `0 12px 40px -10px rgba(0, 0, 0, 0.7), 0 0 24px -4px rgba(3, 83, 164, 0.3)`.
- **Interactive Focus & Active States:** Borders amplify to `rgba(34, 211, 238, 0.6)` accompanied by an outer halo: `0 0 16px rgba(34, 211, 238, 0.25)`.

## Shapes
To counterbalance the dark, technical, and rigid command-center environment, the system utilizes deeply rounded geometries ranging strictly between 24px and 28px for primary containers. This soft-form glass architecture creates an organic, sophisticated vessel for complex technical interactions.

- **Primary Cards & Modals:** Standardized corner radius of `24px` (`rounded-lg`) to `28px` (`rounded-xl`).
- **Input Fields & Display Chips:** Standardized corner radius of `16px` to full pill (`9999px`) shapes for execution buttons, status indicators, and badges.
- **Interior Micro-Elements:** Nested nested controls or telemetry meters scale down to `12px` to preserve visual concentricity with parent cards.

## Components

### Buttons
- **Primary:** Background `#0466C8`, text `#F2F7FF`, rounded-pill (`9999px`), 14px uppercase label in Space Grotesk. Hover shifts to `#0353A4` with a subtle `0 0 20px rgba(4, 102, 200, 0.45)` aura.
- **Secondary / Glass:** Background `rgba(0, 24, 69, 0.6)`, border `1px solid rgba(0, 229, 255, 0.18)`, text `#22D3EE`. Hover increases border to `rgba(0, 229, 255, 0.5)` with `background: rgba(3, 83, 164, 0.25)`.
- **Ghost:** Transparent background, text `#9FB3D1`. Hover state turns text `#F2F7FF` with a subtle `rgba(255, 255, 255, 0.05)` fill.

### Cards & Panels
- Constructed with smooth linear gradients (`#001845` to `#0A1F4D`), backdrop blur of `16px`, corner radius of `26px`, and an uninterrupted `1px` border of `rgba(0, 229, 255, 0.12)`.
- Padding defaults to `24px` (`space-lg`), with internal section dividers rendered as low-opacity hairline gradients (`to right, transparent, rgba(0, 229, 255, 0.15), transparent`).

### Telemetry & Progress Rings
- Background tracks use `rgba(255, 255, 255, 0.06)` with round caps.
- Dynamic fill meters utilize `#22D3EE` featuring an active end-node glow (`0 0 10px #22D3EE`). Metric readouts within rings render in Space Grotesk Bold.

### Input Fields
- Surface: `rgba(0, 12, 30, 0.6)`, height `48px`, border `1px solid rgba(0, 229, 255, 0.15)`, radius `16px`.
- Text is `#F2F7FF` with `#9FB3D1` for placeholder states. Focus elevates the border to `#22D3EE` with a distinct `0 0 0 3px rgba(34, 211, 238, 0.15)` focus ring.

### Chips & Status Badges
- Pill-shaped (`rounded-full`), `6px 12px` padding.
- Operational badge: `rgba(52, 211, 153, 0.12)` fill with `#34D399` label and an animated pulse indicator dot.
- Standby / Latency badge: `rgba(245, 185, 66, 0.12)` fill with `#F5B942` label.

### Checkboxes & Switches
- Checkboxes: 20x20px, `6px` radius, `1px solid rgba(0, 229, 255, 0.3)`. Checked state transitions to `#0466C8` with a `#22D3EE` check icon.
- Toggles: 44x24px pill track in `rgba(0, 24, 69, 0.8)`. Active state shifts the thumb to `#22D3EE` and track to `#0466C8`.

### Terminal Prompts & Command Console
- Integrated mono-block with deep black-navy fill (`rgba(2, 6, 16, 0.8)`), subtle top highlight border, displaying real-time AI node streaming with Space Grotesk syntax tags and cyan-flashed cursor blinks.