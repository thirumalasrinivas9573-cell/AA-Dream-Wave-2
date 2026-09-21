# Version 2 Readiness

Version 1 establishes the supported baseline for the primary SPA and API. Version 2 development must begin only after the external security blockers are closed and a clean `v1.0.0` tag is created.

## Baseline guarantees

- Role-scoped portal routes and APIs.
- Rotating refresh-token sessions and verified OTP/password-reset flows.
- Owner-scoped learning, profile, library, career, search, and notification data.
- Approved-organization public discovery.
- Centralized student dashboard, search, notification, cache, retry, and error services.
- Production build, lint, dependency audit, and automated backend regression gates.

## Version 2 branch policy

- Branch from `v1.0.0`, never from an unverified deployment branch.
- Require CI and security review before merge.
- Put incomplete work behind disabled feature flags.
- Version breaking HTTP contracts under `/api/v2`.
- Include data migration, rollback, observability, and load-test plans.
- Keep `client/` and `server/` as the production owners until another workspace has an approved deployment plan.

## Prompt 1 complete (Intelligence Core)

- AI Home at `/student/intelligence` with daily brief, learning plan, recommendations, action center, memory, and insights architecture.
- API: `/api/intelligence/*` with modular `recommendationEngine` providers.
- Dashboard insight cards wired to `/api/intelligence/insights`.
- Unified search extended with `career` and `conversations`.
- See `docs/VERSION2_PROMPT1_REPORT.md` for full deliverables.

## Deferred engineering tracks

- Advanced AI Mentor context memory and personalized guidance (Prompt 2).
- Shared Socket.IO adapter and distributed cache for horizontal scaling.
- Browser E2E, automated accessibility, and visual-regression suites.
- Object storage with signed URLs and malware scanning for uploaded assets.
- Observability provider integration for errors, traces, metrics, and alerts.
- Formal OpenAPI generation and client typing.
- Legacy workspace removal and monorepo workspace tooling.

These are future improvements, not hidden Version 1 release requirements unless the deployment architecture changes.
