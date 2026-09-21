# Dream Wave — Core Architecture (Prompt 1.3)

Shared infrastructure for providers, configuration, hooks, utilities, and types.

## Provider Architecture

Providers live in `src/components/providers` (not a duplicate top-level `providers/` folder).

| Provider               | Purpose                                          |
| ---------------------- | ------------------------------------------------ |
| `ThemeProvider`        | Light / dark / system theme via next-themes      |
| `ApplicationProvider`  | Exposes validated `appConfig` + meta to the tree |
| `QueryProvider`        | TanStack Query client defaults                   |
| `AuthProvider`         | Future auth shell                                |
| `NotificationProvider` | Future notification shell                        |
| `ModalProvider`        | Future modal host shell                          |
| `ToastProvider`        | Future toast shell                               |
| `TooltipProvider`      | App-level tooltip delay defaults (shadcn)        |
| `AppProviders`         | Root composition used by `app/layout.tsx`        |

Composition order: Theme → Application → Query → Auth → Notification → Modal → Toast → Tooltip.

## Configuration Architecture

| Module                 | Role                                          |
| ---------------------- | --------------------------------------------- |
| `config/env.ts`        | Zod validation for public env                 |
| `config/app.config.ts` | Single runtime config object                  |
| `config/index.ts`      | Barrel export                                 |
| `constants/*`          | Static tokens (routes, layout, z-index, etc.) |

Import `appConfig` instead of hardcoding values.

## Constants

- `routes` — path constants
- `layout` — header/sidebar/footer/container sizes
- `breakpoints` — responsive px values
- `animation` — duration/easing (also re-exported by `animations/`)
- `z-index` — stacking scale
- `storage` — localStorage keys (theme key consumed by `themes/`)
- `typography` — font weights

## Types

Centralized under `src/types/`:

`application`, `component`, `theme`, `animation`, `api`, `three`, `utility`, `provider`

No business domain models.

## Utilities

`src/utils/` — pure helpers:

`cn`, date/number formatters, debounce/throttle, storage, theme, viewport, device, env

`src/lib/utils.ts` remains the shadcn `cn` source; `utils/cn.ts` re-exports it (no duplicate implementation).

## Hooks

| Hook              | Purpose                             |
| ----------------- | ----------------------------------- |
| `useTheme`        | Typed theme API                     |
| `useBreakpoint`   | Active breakpoint + min-width flags |
| `useMediaQuery`   | CSS media query subscription        |
| `useMounted`      | Client mount flag                   |
| `useLocalStorage` | JSON localStorage state             |
| `useDebounce`     | Debounced value                     |
| `usePrevious`     | Previous render value               |
| `useWindowSize`   | Viewport size                       |
| `useKeyboard`     | Keyboard listener                   |
| `useApplication`  | App config context                  |

## Error / State Foundations

| Piece                   | Location                                        |
| ----------------------- | ----------------------------------------------- |
| Typed errors            | `lib/errors`                                    |
| Error boundary          | `components/common/error-boundary`              |
| Error UI                | `components/common/error-ui`                    |
| Retry pattern           | `components/common/retry-action`                |
| Empty state             | `components/common/empty-state`                 |
| Skeleton                | `components/common/skeleton`                    |
| Route error/loading/404 | `app/error.tsx`, `loading.tsx`, `not-found.tsx` |

## Folder Responsibility Notes

- Providers stay under `components/providers` to align with Next.js/shadcn conventions.
- No second `src/providers` directory (avoids duplication).
- Animation timing tokens have one source: `constants/animation.ts`.
