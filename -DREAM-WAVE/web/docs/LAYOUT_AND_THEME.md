# Dream Wave — Global Layout & Theme (Prompt 1.4)

## Global Layout Architecture

```
app/layout.tsx                 Root entry: fonts, metadata, viewport, providers, skip link
app/(marketing)/layout.tsx     Public route group shell
app/(marketing)/page.tsx       Foundation bootstrap route (not a product landing page)
app/(platform)/layout.tsx      Future authenticated shell (no feature pages yet)
app/error.tsx | loading.tsx | not-found.tsx | global-error.tsx | manifest.ts
```

Root layout responsibilities:

- HTML `lang`, theme hydration suppression
- Font CSS variables
- SEO metadata + viewport/theme-color
- Skip-to-content link
- `AppProviders` composition
- `#app-root` flex column shell

## Provider Architecture

Order in `AppProviders`:

1. ThemeProvider
2. ApplicationProvider
3. QueryProvider
4. AuthProvider (shell)
5. NotificationProvider (shell)
6. ModalProvider (shell)
7. ToastProvider (shell)
8. TooltipProvider

No duplicate nesting. Future providers register here only.

## Theme Architecture

- `themes/themeConfig` — default system theme, class attribute, persistence key
- Semantic tokens in `globals.css` (`:root` / `.dark`)
- `enableColorScheme` + CSS `color-scheme`
- Smooth background/color transitions (disabled under reduced motion)
- `THEME_TOKEN_SLOTS` reserved for Design System (no hardcoded brand colors)

## Routing Architecture

| Group         | Purpose                         |
| ------------- | ------------------------------- |
| `(marketing)` | Public surfaces                 |
| `(platform)`  | Future authenticated product UI |

Protected path helpers: `src/lib/routing/protected.ts`  
Auth middleware is intentionally not implemented yet.

## Global Style Architecture

| File                | Role                                                                      |
| ------------------- | ------------------------------------------------------------------------- |
| `app/globals.css`   | Tailwind + shadcn tokens + theme CSS variables                            |
| `styles/tokens.css` | Container, spacing, font-weight token prep                                |
| `styles/base.css`   | Reset helpers, scrollbar, selection, focus, motion, skip-link, containers |

## Font System

`src/lib/fonts.ts`

- Primary: Geist Sans → `--font-sans` / `--font-heading`
- Secondary: Geist Mono → `--font-mono`
- `display: "swap"`, preload enabled

## Performance Foundation

- `next.config.ts` — AVIF/WebP images, package import optimization
- `lib/performance` — `lazyClientComponent`, `performanceMonitor` stubs

## Accessibility Foundation

- Semantic landmarks (`main`, skip link)
- Focus-visible styles
- Reduced motion support
- `lang="en"`, `color-scheme`
