# Dream Wave AI Version 1 Architecture

## Production topology

- `client/`: primary React 18 + Vite single-page application.
- `server/`: Express API, Socket.IO gateway, background-ready delivery services, and Mongoose persistence.
- MongoDB: identity, learning, library, career, interaction, notification, analytics, and session data.
- Netlify: static SPA hosting with immutable asset caching, SPA fallback, CSP, HSTS, and browser security headers.
- Render: Node 20 API deployment from `server/`, configured by the root `render.yaml`.
- `web/`: optional Next.js workspace; verified separately and not part of the Version 1 SPA deployment.

## Client structure

`client/src/App.jsx` composes the shared authentication, platform-data, and gamification providers. `AppRouter.jsx` owns public and portal route boundaries. Student routes are lazy-loaded from `modules/student/routes.jsx`.

Module code belongs under `client/src/modules/<module>/`:

- `student`: dashboard, goals, tasks, learning, mentor, reports, profile, settings.
- `career`: career dashboard, opportunities, applications, resume builder.
- `digital-library`: catalog, details, collections, reader, organization desk.
- `discovery` and `search`: public discovery, centralized notifications, unified search.
- `institution`, `company`, `admin`: role-scoped management portals.
- `institutions`, `companies`: approved public profiles and listings.

Reusable code belongs under `client/src/shared/`:

- `components`: UI primitives, error boundaries, authentication controls, platform search/notification components.
- `context`: authentication and cached platform state.
- `hooks`: shared notification, search, auth, and rendering hooks.
- `services`: HTTP API, TTL cache, retries, storage, dashboard, notification, profile, and search services.
- `utils`: URL and browser-safe helpers.

## Server structure

- `routes/`: HTTP namespace and middleware composition.
- `controllers/`: validation, ownership checks, orchestration, and response mapping.
- `models/`: Mongoose schemas and indexes.
- `middleware/`: JWT authentication, role guards, request security, rate limits.
- `services/`: notification delivery, email, Twilio Verify, OpenAI, response caching.
- `utils/`: environment validation, token/session security, index reconciliation, portal helpers.

## Security boundaries

- Access JWTs are short-lived Bearer tokens and must reference an active refresh-token session family.
- Refresh tokens are rotated through HttpOnly cookies; replay revokes the family.
- Every private portal uses server-side role and ownership checks. Client route guards are convenience controls, not authorization.
- Organizations bootstrap as `pending` and remain excluded from public discovery until admin approval.
- Student workspace search is owner-scoped. Public search and discovery include only approved/public organizations and public/discoverable students.
- Licensed PDF delivery requires authentication. Private profile credential files require ownership; only explicitly public credentials are anonymously accessible.
- Notification mutations are scoped by both notification ID and authenticated user ID.

## Shared data flow

The student dashboard uses `/api/dashboard/student` to aggregate synchronized profile, goal, task, roadmap, reading, career, discovery, and notification data. Unified search uses `/api/search/unified`; private providers are enabled only for authenticated students. `PlatformDataContext` deduplicates requests and coordinates notification/search state.

## Release boundaries

Version 1 production deployment consists of `client/` and `server/`. `web/`, `mobile/`, and the tracked legacy `dream-wave-ai/` tree are excluded from the deployment artifact. Future Version 2 work should preserve module ownership and introduce new capabilities behind versioned APIs or feature flags.
