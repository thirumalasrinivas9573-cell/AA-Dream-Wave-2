# Dream Wave — Web Foundation

Enterprise frontend foundation for the Dream Wave AI Learning Platform.

This package is **architecture and engineering-environment focused**. It does not include product dashboards, authentication flows, marketing landing pages, AI features, or business logic.

---

## Project Overview

| Item      | Value                       |
| --------- | --------------------------- |
| Package   | `dreamwave-web`             |
| Framework | Next.js 16 (App Router)     |
| Language  | TypeScript (strict)         |
| Styling   | Tailwind CSS v4 + shadcn/ui |
| Runtime   | React 19                    |

---

## Getting Started

### Requirements

- Node.js **20.9+**
- npm **10+**

### Install

```bash
cd web
npm install
npm run prepare:env
```

### Develop

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Verify before merge

```bash
npm run verify
```

Runs typecheck → lint → format check → production build.

---

## Development Workflow

1. Create or switch to a focused branch/task.
2. Inspect existing folders before adding files (`docs/CONVENTIONS.md`).
3. Implement the smallest reusable change.
4. Run `npm run lint:fix` and `npm run format`.
5. Run `npm run verify`.
6. Open a review with acceptance criteria.

Never skip inspection. Prefer improving existing modules over creating duplicates.

---

## Folder Responsibilities

```
web/
├── docs/                   # Engineering docs (conventions, standards)
├── public/                 # Static assets
└── src/
    ├── app/                # Routes, layouts, loading/error/not-found
    ├── animations/         # Motion tokens (prep)
    ├── assets/             # Bundled media
    ├── components/
    │   ├── ui/             # shadcn primitives
    │   ├── layout/         # Shells (prepared)
    │   ├── shared/         # Cross-feature UI (prepared)
    │   ├── common/         # EmptyState, ErrorBoundary, etc.
    │   ├── providers/      # Theme, Query, future Auth/Toast/Modal
    │   └── three/          # R3F scenes (prepared)
    ├── config/             # App + env validation
    ├── constants/
    ├── contexts/
    ├── hooks/
    ├── lib/                # utils, api prep, three prep, errors
    ├── services/           # Future service layer
    ├── store/              # Zustand factory (no business stores)
    ├── styles/             # tokens + base global architecture
    ├── themes/
    ├── types/
    └── utils/
```

See also: [docs/CONVENTIONS.md](./docs/CONVENTIONS.md)

---

## Coding Standards

- **TypeScript:** `strict` + unused checks, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- **Lint:** Next.js core-web-vitals + TypeScript + import sort + unused imports + naming conventions
- **Format:** Prettier + Tailwind class sorting
- **Components:** small, composable, single responsibility
- **State:** Zustand for client UI state; TanStack Query for server/async state
- **Styles:** semantic CSS variables; no ad-hoc hardcoded brand systems yet
- **A11y:** semantic HTML, focus-visible, reduced-motion support in base styles
- **Imports:** `@/*` path alias only (no duplicate alias map)

---

## Project Scripts

| Script                 | Purpose                                       |
| ---------------------- | --------------------------------------------- |
| `npm run dev`          | Development server                            |
| `npm run build`        | Production build                              |
| `npm run start`        | Serve production build                        |
| `npm run lint`         | ESLint                                        |
| `npm run lint:fix`     | ESLint autofix (includes import sort)         |
| `npm run format`       | Prettier write                                |
| `npm run format:check` | Prettier check                                |
| `npm run typecheck`    | `tsc --noEmit`                                |
| `npm run clean`        | Remove `.next`, `out`, coverage, tsbuildinfo  |
| `npm run clean:all`    | Clean + remove `node_modules`                 |
| `npm run prepare:env`  | Copy `.env.example` → `.env.local` if missing |
| `npm run verify`       | Full quality gate                             |

---

## Contribution Guidelines

1. Follow naming rules in `docs/CONVENTIONS.md`.
2. Do not commit secrets or `.env.local`.
3. Do not add feature folders until the relevant phase prompt.
4. Do not implement auth, payments, or API business logic in this package unless explicitly requested.
5. Keep providers as shells until product requirements land.
6. Prefer extending `components/common` and `components/ui` over one-off page markup.
7. Every PR should pass `npm run verify`.

---

## Architecture Notes

### Tailwind v4

There is **no legacy `tailwind.config.js` theme**. Configuration is CSS-first via:

- `src/app/globals.css` — Tailwind import, `@theme`, semantic tokens
- `src/styles/tokens.css` — layout/spacing token preparation
- `src/styles/base.css` — scrollbar, selection, focus, reduced motion, containers
- `postcss.config.mjs` — `@tailwindcss/postcss`
- `tailwind.config.ts` — documentation stub only (exports nothing)

### Providers

`AppProviders` composes:

1. Theme (active)
2. Query (active)
3. Auth / Notification / Modal / Toast (shells only)

### Errors & states

| Concern         | Location                               |
| --------------- | -------------------------------------- |
| Typed errors    | `src/lib/errors`                       |
| Client boundary | `components/common/error-boundary.tsx` |
| Route error     | `app/error.tsx`                        |
| Global error    | `app/global-error.tsx`                 |
| 404             | `app/not-found.tsx`                    |
| Loading         | `app/loading.tsx`                      |
| Empty UI shell  | `components/common/empty-state.tsx`    |
| Skeleton        | `components/common/skeleton.tsx`       |
| Error UI        | `components/common/error-ui.tsx`       |
| Retry pattern   | `components/common/retry-action.tsx`   |

### Environment

Public values are validated with Zod in `src/config/env.ts` and exposed through `src/config/app.config.ts`. Server-only secret placeholders live in `.env.example` and must never be prefixed with `NEXT_PUBLIC_`.

### Shared infrastructure

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for providers, hooks, utilities, constants, and types.

See [docs/LAYOUT_AND_THEME.md](./docs/LAYOUT_AND_THEME.md) for root layout, theme, routing groups, fonts, and a11y.

---

## Technology Stack

**Runtime:** Next.js, React 19, Tailwind v4, shadcn/ui, CVA, clsx, tailwind-merge, Lucide, next-themes, Zustand, TanStack Query, React Hook Form, Zod, Framer Motion, GSAP, Three.js, R3F, Drei

**Tooling:** TypeScript, ESLint, Prettier, rimraf, EditorConfig

---

## Relationship to Legacy Code

Legacy Vite app: `../client/`. Legacy API: `../server/`. This `web/` package is the enterprise frontend foundation. Migration is a separate phase.

---

## Phase Gate

**Prompt 1.1:** Foundation scaffold — complete  
**Prompt 1.2:** Engineering environment — complete  
**Prompt 1.3:** Core architecture / providers / shared infrastructure — complete  
**Prompt 1.4:** Global layout, theme foundation & validation — complete

Phase 1 global foundation is complete. Do **not** start Phase 2 until explicitly instructed.
