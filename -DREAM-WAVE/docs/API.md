# Dream Wave AI Version 1 API

Base path: `/api`. Protected requests use `Authorization: Bearer <access-token>`. Refresh operations use the configured HttpOnly cookie.

## Response contract

- Success: `{ "success": true, ...resourceFields }`
- Standard error: `{ "success": false, "code": "STABLE_CODE", "message": "Safe user message" }`
- Validation failures use `400`, authentication failures `401`, authorization failures `403`, missing resources `404`, conflicts `409`, rate limits `429`, unavailable integrations `503`, and unexpected failures `500`.
- Paginated endpoints expose `items`, `total`, `page`, and `limit`, or an explicit cursor and `nextCursor`.

## Authentication `/auth`

Registration/login, email and phone OTP, password reset, access-token refresh, logout, device sessions, login history, and onboarding. Login and challenge endpoints are rate-limited. Refresh tokens rotate and are session-family checked.

## Student learning

- `/goals`: owner-scoped CRUD, analytics, progress, milestones, and notes.
- `/tasks`: owner-scoped CRUD, analytics, duplication, focus sessions, and roadmap task generation.
- `/roadmap`: owner-scoped roadmap lifecycle and progress.
- `/report`: owner-scoped AI research reports.
- `/mentor`, `/ai`, `/lesson`: authenticated AI and learning endpoints with dedicated rate limits.

## Student identity `/profile`

- `GET/PUT /profile`: safe identity projection and optimistic revision updates.
- `PUT /profile/privacy`, `PUT /profile/preferences`
- `GET /profile/summary`, `GET /profile/knowledge-graph`
- Embedded CRUD for skills, projects, achievements, and credentials.
- `POST /profile/upload`: authenticated, size-limited, MIME and magic-byte validated.
- `GET /profile/public/:username`: privacy-projected public portfolio.
- `GET /profile/assets/:filename`: public images; credential files require owner access unless explicitly public.

## Career `/career`

Student-only career profile, dashboard/readiness, resume CRUD and PDF generation, approved job/internship exploration, applications, withdrawal, filters, and career notifications. Public resume PDFs use unguessable share tokens.

## Library `/library`

Catalog metadata, filters, categories, collections, and book details are public. Licensed PDF content, reading progress, annotations, sessions, favorites, downloads, recommendations, dashboard, and AI tools require authentication. Organization publishing endpoints require institution, company, or admin roles.

## Search `/search`

- `GET /search`: backwards-compatible public entity search.
- `GET /search/unified`: normalized results across public content and, for authenticated students, owner-scoped goals, tasks, roadmaps, reports, notifications, credentials, profile, resumes, and reading.
- `GET /search/filters`
- `DELETE /search/history`: student-owned history only.

Search validates category filters, escapes regular expressions, retains student history for a bounded TTL, and returns partial-source errors without exposing internal exceptions.

## Notifications `/notifications`

Authenticated list/filter/cursor operations plus read, read-all, archive, restore, pin, priority, and delete. Every mutation includes `userId` ownership in the database predicate. Admin-only creation supports normalized types, channels, priorities, sources, metadata, and dedupe keys.

## Dashboard `/dashboard/student`

Student-only synchronized aggregation of identity, goals, tasks, roadmaps, reading, credentials, applications, approved discovery content, notifications, and computed progress/statistics.

## Discovery and interactions

- `/discovery`: approved-organization feed, featured content, and home aggregation.
- `/interaction`: validated follow, bookmark, review, report, and application operations.
- `/content-reports`: authenticated moderation reports with target existence validation.

## Portals

- `/institution`: institution role and owner-scoped management; public listings expose approved/public organizations only.
- `/company`: company role and owner-scoped management; applications are company-scoped.
- `/admin`: admin role required for every route, including `/stats`; approvals, moderation, analytics, logs, and broadcasts.

## Operational

- `GET /health`: deployment health check.
- Stripe webhook requires a verified raw-body signature and bypasses generic client rate limiting so provider retries remain reliable.
- Unknown routes return a standardized `404 NOT_FOUND`.
