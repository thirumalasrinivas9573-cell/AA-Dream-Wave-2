# Dream Wave — Project Conventions

Mandatory naming and organization rules for the `web/` package.

## Components

| Kind             | Pattern                       | Example           |
| ---------------- | ----------------------------- | ----------------- |
| React component  | `PascalCase`                  | `EmptyState`      |
| File (component) | `kebab-case.tsx`              | `empty-state.tsx` |
| shadcn/ui        | keep registry names           | `button.tsx`      |
| Three.js scene   | `PascalCase` + `Scene` suffix | `OrbitHeroScene`  |
| Provider         | `PascalCase` + `Provider`     | `ThemeProvider`   |

## Hooks

| Pattern              | Example              |
| -------------------- | -------------------- |
| `use` + `PascalCase` | `useMediaQuery`      |
| File: `use-*.ts`     | `use-media-query.ts` |

## Contexts

| Pattern                    | Example             |
| -------------------------- | ------------------- |
| `PascalCase` + `Context`   | `SidebarContext`    |
| Hook: `use` + context name | `useSidebarContext` |

## Utilities & libraries

| Kind               | Pattern                                  | Example             |
| ------------------ | ---------------------------------------- | ------------------- |
| Function           | `camelCase`                              | `toUserSafeMessage` |
| Constant           | `UPPER_SNAKE_CASE` or `camelCase` export | `APP_NAME`          |
| Type / Interface   | `PascalCase`                             | `AppErrorCode`      |
| Zustand store hook | `use` + `PascalCase` + `Store`           | `useUiShellStore`   |
| Animation helper   | `camelCase` or motion token object       | `MOTION_DURATION`   |

## Routes (App Router)

| Kind      | File            |
| --------- | --------------- |
| Page      | `page.tsx`      |
| Layout    | `layout.tsx`    |
| Loading   | `loading.tsx`   |
| Error     | `error.tsx`     |
| Not found | `not-found.tsx` |

## Folders

- Use `kebab-case` for multi-word folders.
- Keep feature folders out of the foundation until Phase 1.3+.
- Prefer composition: place shared UI in `components/shared` or `components/common`.

## Imports

1. Side-effect imports
2. External packages
3. Internal `@/` aliases
4. Relative imports (avoid when `@/` works)

Enforced by `eslint-plugin-simple-import-sort`.
