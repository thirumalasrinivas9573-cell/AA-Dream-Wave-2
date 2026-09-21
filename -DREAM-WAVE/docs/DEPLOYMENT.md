# Dream Wave AI Version 1 Deployment

## Release components

- Primary SPA: `client/` on Netlify.
- API: `server/` on Render using root `render.yaml`.
- Database: MongoDB Atlas or equivalent managed MongoDB.
- Node.js: `20.19.0`.

`web/`, `mobile/`, and `dream-wave-ai/` are not part of the Version 1 deployment artifact.

## Pre-deployment gate

1. Complete every action in `docs/SECURITY_RELEASE_BLOCKERS.md`.
2. Verify provider credentials are stored only in deployment secret stores.
3. Run:

```bash
npm --prefix client ci
npm --prefix client run lint
npm --prefix client run build
npm --prefix server ci
npm --prefix server test
npm --prefix web ci
npm --prefix web run verify
npm audit --omit=dev --audit-level=high
```

4. Confirm MongoDB backup and restore readiness.
5. Confirm the production CORS origins and public URLs.

## API deployment

Render reads `/render.yaml`, installs production dependencies in `server/`, starts `npm start`, and checks `/health`. Populate every secret marked `sync: false`.

Deploy with `autoDeploy: false` after CI passes. Verify:

- `/health` returns healthy.
- production environment validation completes.
- MongoDB indexes initialize without conflict warnings.
- email and phone OTP work using production providers.
- refresh-cookie rotation works over HTTPS.
- Stripe webhook signature verification succeeds when payments are enabled.

## SPA deployment

Set Netlify base directory to `client`; `client/netlify.toml` runs the build and publishes `dist`. Configure `VITE_API_URL` only when the API is on a separate origin.

The deployment includes:

- SPA fallback to `index.html`.
- immutable caching for hashed assets.
- HSTS, CSP, frame denial, nosniff, referrer, and permissions policies.

Smoke-test public, student, admin, institution, and company route refreshes to verify fallback routing.

## Post-deployment checks

- Sign up/login/refresh/logout and device revocation.
- Student dashboard, goals, tasks, roadmaps, profile, settings, certificates.
- Library metadata and authenticated PDF reader.
- Career opportunities, resume PDF, application tracking.
- Unified search, notifications, discovery privacy.
- Admin-only stats and organization approval.
- 401, 403, 404, 429, 500, offline, and retry experiences.

## Rollback

Keep the prior immutable client deployment and API release available. Roll back application code before performing data rollback. Database rollback requires an approved restore plan; do not automatically reverse schema/index changes against live data.
