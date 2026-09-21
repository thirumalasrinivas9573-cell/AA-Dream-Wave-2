# LASYA Version 1 — Institution Portal

**Status: ENGINEERING COMPLETE**

Production-ready frontend for the Dream Wave Institution Portal and public
Institution Discovery Platform. This document is the release reference for
Version 1.

---

## 1. Architecture summary

- **Framework:** Next.js 16 (App Router, Turbopack) + React 19 + TypeScript (strict, `noUncheckedIndexedAccess`).
- **Styling:** Tailwind CSS with semantic design tokens (no scattered inline CSS; dynamic data-driven values only, following the shared `ProgressBar` precedent).
- **State:** Zustand stores (one per domain) with hydration + `localStorage` persistence via a shared `createAppStore` factory.
- **Rendering strategy:** Route-level `next/dynamic` code-splitting with skeleton fallbacks; public institution profiles are pre-rendered (SSG via `generateStaticParams`).
- **SEO:** Per-route metadata, canonical URLs, Open Graph, Twitter cards, `CollegeOrUniversity` JSON-LD, and a generated sitemap.

## 2. Folder structure (Institution scope)

```
web/src/
├─ app/
│  ├─ (platform)/institution/         # Admin portal routes (dashboard, modules, analytics, reports)
│  └─ (marketing)/institutions/       # Public discovery + profiles + compare
│     ├─ page.tsx                     # Discovery explorer
│     ├─ [slug]/page.tsx              # SSG public profile (metadata + JSON-LD)
│     ├─ compare/page.tsx             # Comparison (Suspense-wrapped)
│     ├─ loading.tsx / error.tsx
├─ components/
│  ├─ institution/                    # Admin modules + shared institution UI
│  │  ├─ analytics/                   # Enterprise Analytics & Report centers
│  │  ├─ academics/ admissions/ ...   # Per-module UI
│  │  ├─ campus/                      # Campus experience
│  │  └─ shared/entity-toolbar.tsx    # Reusable panel/filter/pagination
│  └─ discovery/                      # Public discovery platform UI
├─ constants/                         # Routes, seeds, directory data
├─ store/                             # Zustand domain stores
├─ types/                             # Domain models
└─ lib/institution-seo.ts            # SEO metadata + JSON-LD builders
```

## 3. Route documentation

### Admin portal (`/institution/*`)
Dashboard, Admissions, Students, Faculty, Departments/Academics, Courses,
Subjects, Placements, Campus (Announcements/Events/Gallery/Clubs/News),
Analytics, Reports, Notifications, Profile, Settings — each with
`/analytics` and `/reports` sub-routes where applicable.

### Public discovery (`/institutions*`)
| Route | Rendering | Purpose |
| --- | --- | --- |
| `/institutions` | Static | Discovery explorer (search, filters, sort, compare selection) |
| `/institutions/[slug]` | SSG | Public institution profile (all sections + JSON-LD) |
| `/institutions/compare` | Static + client | Compare 2–4 institutions (URL-driven) |

## 4. Reusable / shared components

- **Institution UI:** `InstitutionPageHeader`, `InstitutionMetricCard`, `DataToolbar`, `StatusBadge`, `SimpleModal`, `PaginationBar`.
- **Entity toolbar:** `EntityPanel`, `EntityFilterSelect`, `EntityPagination`, `usePagination`.
- **Charts:** `InstitutionLineChart`, `InstitutionBarChart`, `InstitutionDistributionChart` + analytics primitives `ProgressRing`, `TrendIndicator`, `ScoreCard`, `HeatMap`, `AiInsightCard`.
- **Discovery:** `RatingStars`, `LogoBadge`, `VerificationBadge`, `TypeBadge`, `StatTile`, `InfoRow`, `DiscoverySection`, `InstitutionCard`.
- **Cross-cutting:** `Card`, `Badge`, `Button`/`buttonVariants`, `Input`, `Label`, `EmptyState`, `RouteLoading`, `ErrorUI`, `RetryAction`, `Spinner`, `ProgressBar`.

## 5. Data integration

The Analytics Center consumes existing domain stores read-only via
`useInstitutionAnalytics` (admissions, students, faculty, academic, placement,
campus) — no duplicated APIs or business logic. The public discovery layer uses
a dedicated directory dataset whose shape mirrors the admin domains, so the
flagship institution can later be bound directly to live stores.

## 6. Accessibility & performance

- Keyboard-navigable tabs/filters, ARIA roles/labels, visible focus rings, semantic HTML, `aria-live` result counts.
- Memoized filtering/aggregation, code-split routes, SSG profiles, deterministic (SSR-safe) derived values.

## 7. Future integration notes (Version 2)

- Bind discovery flagship profile to live institution stores.
- Wire AI Insight surfaces to the intelligence service (UI is architecture-ready).
- Add review submission/moderation and media (`next/image`) for gallery.
- Financial report + student-satisfaction data sources (architecture-ready placeholders).
