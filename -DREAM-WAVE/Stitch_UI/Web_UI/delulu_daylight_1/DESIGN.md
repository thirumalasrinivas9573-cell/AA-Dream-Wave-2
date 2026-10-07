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
  tertiary: '#006a43'
  on-tertiary: '#ffffff'
  tertiary-container: '#008656'
  on-tertiary-container: '#f6fff6'
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
  tertiary-fixed: '#75fbb8'
  tertiary-fixed-dim: '#55de9d'
  on-tertiary-fixed: '#002112'
  on-tertiary-fixed-variant: '#005233'
  background: '#f9f9ff'
  on-background: '#001c3b'
  surface-variant: '#d5e3ff'
typography:
  display-hero:
    fontFamily: Outfit
    fontSize: 56px
    fontWeight: '700'
    lineHeight: 64px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Outfit
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Outfit
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.025em
  headline-xl-mobile:
    fontFamily: Outfit
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Outfit
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: Outfit
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Outfit
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.03em
  label-sm:
    fontFamily: Outfit
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.05em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system embodies an airy, optimistic, and luminous atmosphere reminiscent of a pristine morning sky. It pairs high-clarity utility with a daydream-like aesthetic, engineered specifically for visionary creators, forward-thinking operators, and AI-driven workflows. 

The aesthetic blends **Modern Minimalism** with **Atmospheric Layering**:
- **Tone & Atmosphere:** Inspiring, crystalline, serene, and effortlessly sophisticated. It trades heavy artificial tech tropes for expansive breathing room, subtle luminous depth, and natural clarity.
- **Stylistic Signatures:** 
  - Bento-grid composition anchored by hyper-curated, generous radii.
  - Soft-focus blue luminescence replacing high-opacity dropshadows and stark structural dividers.
  - Tactile floating elements, including a slim floating icon rail that hovers effortlessly over morning-sky ambient washes.
  - Refined micro-interactions that emphasize fluidity and spring physics over abrupt state cuts.

## Colors

The palette is engineered around an elevated daytime sky canvas, balancing ethereal tints with robust WCAG AA compliance.

### Core Swatches
- **Canvas / Sky White (`#F7FCFF`):** The foundational backdrop. Provides a tinted, expansive canvas that eliminates pure-white eye strain while remaining crisp.
- **Surface Pure White (`#FFFFFF`):** Reserved for elevated bento cards and floating modal layers, creating gentle contrast against `#F7FCFF`.
- **Primary Daylight Blue (`#2F8FDD`):** Primary action color for buttons, key interaction states, active selections, and brand focal points. Interacts exclusively with `#FFFFFF` text. Hover variant is darkened to `#2478BE`.
- **Accent Cyan (`#00C2DE`):** Used exclusively for vibrant data visualization, progress rings, telemetry indicators, active micro-icons, and sparkle accents. *Accessibility Rule: Never pair white text directly over `#00C2DE`; use it as an outline, background ring, or filled element with deep ocean navy text.*
- **Deep Ocean Navy (`#0B2545`):** High-contrast neutral for headings, titles, and critical interface elements, delivering structural anchoring.
- **Secondary Atmospheric Slate (`#5A7089`):** Subdued neutral for secondary labels, metadata, captions, and structural icon elements.
- **Success Green (`#1FB77A`):** For positive status indicators ("ON TRACK"), validation checkmarks, and healthy telemetry.
- **Warning Amber (`#F5A524`):** Strictly isolated for alerts, pending approvals, and caution banners.

### Tonal Tiers & Ambient Fills
- **Tint 50 (`#EBFAFF`):** Soft chip backgrounds, passive badge containers, and hover fills.
- **Tint 100 (`#D4F1FE`):** Selected table rows, subtle active chips, and progress track backgrounds.
- **Tint 200 (`#AAD3F1`):** Focused ring rings, secondary borders, and disabled visual fills.

### Hero & Atmospheric Gradient
- **Skywash Hero Gradient:** A multi-stop radial blend transitioning smoothly from `#FFFFFF` through soft sky blue (`#BFE6FA`) into light cyan (`#7FDCF0`). All content set against this gradient uses deep ocean navy (`#0B2545`) to guarantee maximum contrast and legibility.

## Typography

The typographic hierarchy pairs the geometric, optimistic cadence of **Outfit** for headlines and structural tags with the crisp, humanist readability of **Plus Jakarta Sans** for body copy and dense interface content.

### Hierarchy & Usage
- **Display & Headings (Outfit):** Set with tight tracking to accentuate its geometric qualities. Used for page titles, card headers, and AI prompts. Headings above 24px automatically reduce tracking to keep words cohesive.
- **Body & Continuous Text (Plus Jakarta Sans):** Base body size never falls below 15px to uphold effortless legibility against light-tinted backgrounds. The x-height is tall, open, and paired with generous line-heights (1.6x) to preserve the airy aesthetic.
- **Labels & Micro-UI (Outfit):** Micro-copy, badges, tabs, and interactive labels switch back to Outfit in semi-bold and bold weights, slightly tracked out to create crisp visual punctuation.

## Layout & Spacing

The layout is built upon an open, asymmetrical **Bento Grid** architecture framed by persistent, floating navigation modules.

### Grid & Layout Structure
- **Desktop (1200px+):** 
  - Main workspace sits on a 12-column responsive fluid bento grid with `1.5rem` (`24px`) gutters.
  - Left edge is anchored by a persistent, floating 72px slim icon rail offset by a `1.5rem` canvas margin.
  - Outer screen boundaries maintain a generous `2rem` (`32px`) margin to simulate an unobstructed canvas.
- **Tablet (768px – 1199px):** 
  - Transitions to an 8-column layout. 
  - Icon rail collapses into a floating bottom pill bar or remains a compact 64px left rail based on application mode.
  - Gutters compress to `1rem` (`16px`).
- **Mobile (< 768px):** 
  - Collapses to a 4-column single-flow layout.
  - Navigation converts to a floating bottom bar hovering 16px above the home indicator.
  - Canvas margins compress to `1rem` (`16px`) to maximize screen real estate.

### Spacing Principles
Component padding strictly preserves an "airy morning room" feel. Bento cards should favor generous internal padding (`space-xl` or `32px` on desktop; `space-lg` or `24px` on mobile) to keep nested content floating without visual friction.

## Elevation & Depth

Depth in this system avoids heavy drop shadows, harsh dark occlusions, or neon blooms. Instead, elevation is expressed through translucent, blue-tinted ambient scattering and ultra-fine chromatic borders.

### Depth Levels
- **Level 0 (Canvas):** Flat base `#F7FCFF` with optional gentle radial atmospheric blurs (`#BFE6FA` and `#7FDCF0` at 15–25% opacity with 120px blur radii).
- **Level 1 (Bento Cards & Base Surfaces):** `#FFFFFF` fill with a delicate outline of `1px solid rgba(60, 150, 220, 0.12)` and an ambient shadow of `0 10px 30px -5px rgba(47, 143, 221, 0.08)`.
- **Level 2 (Floating Rails & Action Panels):** `#FFFFFF` fill with subtle backdrop-filter blur (`16px`), `1px solid rgba(60, 150, 220, 0.18)`, and a dual-stage shadow:
  - Ambient: `0 16px 40px -10px rgba(47, 143, 221, 0.12)`
  - Edge clarity: `0 2px 6px 0 rgba(11, 37, 69, 0.03)`
- **Level 3 (Modals, Command Bars & Flyouts):** Pure `#FFFFFF` surface suspended with:
  - `0 25px 60px -15px rgba(11, 37, 69, 0.12)`, combined with a soft atmospheric halo: `0 0 40px 0 rgba(0, 194, 222, 0.10)`.

### Border Discipline
Never use neutral dark or solid grey borders. All structural delineation is achieved through water-tinted cyan-blue borders at 8% to 18% alpha (`rgba(60, 150, 220, x)`), preserving the crystalline glass look.

## Shapes

The design system relies on hyper-smooth, sweeping corner curves that reinforce a friendly, modern daydream character.

### Shape Scales
- **Bento Cards & Containers:** Standardized at `24px` to `28px` corner radius (`rounded-3xl`). This large curvature transforms standard utility boxes into organic, tactile pods.
- **Floating Icon Rail & Interactive Shells:** Fully pill-shaped or matched to `28px` with circular interior interactive hit-targets.
- **Buttons, Inputs & Chips:** Fully pill-shaped (`9999px`) or `16px` minimum for structured data fields.
- **Status & Indicator Badges:** Always full pill (`rounded-full`) with balanced horizontal padding.

## Components

### Buttons
- **Primary Action:** Solid `#2F8FDD` fill, pure white `#FFFFFF` text (Outfit Medium/Semi-Bold), full pill shape (`rounded-full`). Padding: `12px 24px` (or `10px 20px` for compact). Micro-shadow: `0 4px 14px rgba(47, 143, 221, 0.35)`. Hover: `#2478BE` with smooth 200ms cubic-bezier transition; scale `1.02`. Active: scale `0.98`.
- **Secondary / Soft Button:** Tinted fill `#EBFAFF`, text `#2F8FDD`, 1px border `rgba(60, 150, 220, 0.16)`. Hover: `#D4F1FE`.
- **Tertiary / Ghost Button:** Transparent background, text `#5A7089`. Hover: text `#0B2545`, fill `rgba(235, 250, 255, 0.6)`.

### Chips & Badges
- **Status Badge ("ON TRACK"):** Background `#EBFAFF`, text `#1FB77A`, 1px border `rgba(31, 183, 122, 0.20)`. Preceded by a 6px glowing dot in `#1FB77A`.
- **Approval / Warning Banner:** Background `#FFF9EE`, text `#B27200`, 1px border `rgba(245, 165, 36, 0.25)`.
- **Filter Chips:** Pill shape, background `#EBFAFF`, text `#5A7089`. When selected: background `#2F8FDD`, text `#FFFFFF`, shadow `0 2px 8px rgba(47, 143, 221, 0.25)`.

### Form Controls & Inputs
- **Text Inputs:** Background `#FFFFFF`, 1px border `rgba(60, 150, 220, 0.20)`, radius `16px`. Text `#0B2545`, placeholder `#5A7089` (at 60% opacity). Focus state: border `#2F8FDD`, subtle ring `0 0 0 3px rgba(47, 143, 221, 0.15)`.
- **Checkboxes & Radios:** 20px diameter/width, radius 6px (checkbox) or circular (radio). Unchecked: background `#FFFFFF`, border `1.5px solid rgba(60, 150, 220, 0.3)`. Checked: background `#2F8FDD`, white checkmark/dot, border-color `#2F8FDD`.

### Bento Cards
- Standard pure white `#FFFFFF` surface, corner radius `24px`–`28px`, 1px border `rgba(60, 150, 220, 0.12)`, shadow `0 10px 30px -5px rgba(47, 143, 221, 0.08)`.
- Header section uses Outfit Semi-Bold in `#0B2545`. Internal micro-dividers are discouraged; rely instead on `space-md` or `space-lg` spacing or `#EBFAFF` sub-containers.

### Floating Icon Rail (72px)
- Fixed or floating vertical bar: 72px wide, background `#FFFFFF` with `backdrop-filter: blur(16px)`, border `1px solid rgba(60, 150, 220, 0.18)`, radius `24px` or `rounded-full`.
- Icons centered in 44x44px target boxes. Inactive: `#5A7089`. Active: background `#EBFAFF`, icon color `#2F8FDD`, with a delicate 3px vertical accent bar or circular soft-glow backing.

### Progress Rings & Accent Displays
- Background track: `#EBFAFF` or `#D4F1FE`.
- Filled stroke / indicator: vibrant Accent Cyan (`#00C2DE`) or Primary Blue (`#2F8FDD`). Central typography uses Outfit Bold in Deep Ocean Navy (`#0B2545`).