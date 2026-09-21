# Dream Wave AI Developer Guide

## Requirements

- Node.js 20.19 or newer compatible Node 20 release.
- npm 10.
- MongoDB for development, or the memory-server test harness.

## Setup

```bash
npm run install:all
cp server/.env.example server/.env
npm run dev
```

Primary SPA: `http://127.0.0.1:5173`. API: `http://127.0.0.1:5001`. Health: `/health`.

## Ownership conventions

- New UI belongs in `client/src/modules/<domain>/`.
- Reusable UI, hooks, state, network services, and utilities belong in `client/src/shared/`.
- API routes compose middleware only; controllers own validation/orchestration; models own persistence validation/indexes.
- Never rely on client route guards for authorization.
- Organization data queries must include owner IDs; public queries must require approved/public owners.
- Do not return raw exception messages for unexpected failures.

## API changes

1. Add or update a Mongoose model and owner-first index.
2. Implement validation and stable error codes in a controller.
3. Compose `auth` and `requireRole` in the route.
4. Mount the route in `server.js`.
5. Add a typed-by-convention client method in `shared/services/api.js`.
6. Add ownership, validation, status-code, and regression tests.
7. Update `docs/API.md` and `docs/DATABASE.md`.

## Client changes

- Keep route pages lazy-loaded.
- Use shared `LoadingState`, `EmptyState`, `ErrorState`, and `Dialog`.
- Use `cacheService`/domain services for deduplication instead of parallel direct requests.
- Sanitize external links with `safeExternalUrl`.
- Fetch protected files through the authenticated API client.
- Include keyboard behavior, labels, focus states, reduced-motion behavior, and mobile layout rules.

## Quality commands

```bash
npm --prefix client run lint
npm --prefix client run build
npm --prefix server test
npm --prefix web run verify
npm audit --omit=dev --audit-level=high
```

Memory-server tests require permission to bind a local loopback port.

## Git and secrets

- Never commit `.env`, service-account JSON, editor AI keys, database credentials, or provider tokens.
- Example values must be obvious placeholders.
- Secret scanning and dependency audits are release gates.
- Do not rewrite shared history or rotate production credentials from an automated coding session; coordinate those actions with the repository owner and provider consoles.

## Version 2 preparation

Version 2 work should:

- branch from the security-clean Version 1 tag;
- use feature flags for incomplete capabilities;
- version breaking API changes;
- include migrations and rollback plans;
- preserve module boundaries and release tests;
- avoid deploying `web/` or mobile workspaces until they have explicit owners and deployment pipelines.
