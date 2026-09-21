# Organization tenancy (CTO-008 → CTO-014)

## Current foundation

| Concept | Implementation |
|---------|----------------|
| Organization | `server/models/Organization.js` — name, slug, **type** (`institution` \| `company` \| `team`), plan, owner |
| Membership | `server/models/OrgMembership.js` — roles `owner` \| `admin` \| `member` |
| Invites | `server/models/OrgInvite.js` — pending email invites (14-day TTL) |
| User link | `User.organizationId` (optional; `null` = personal account) |
| Resource stamp | Goals, Tasks, Chat, Documents, Quizzes, Habits, Skills, StudyPlans, Roadmaps |
| Scope helper | `server/utils/orgScope.js` — list filter, create stamp, accessible find |
| Institution overview | `GET /api/orgs/:id/overview` + `/institution` UI (CTO-014) |

### APIs

| Method | Path | Access |
|--------|------|--------|
| POST | `/api/orgs` | Auth — create org (caller = owner); optional `type` |
| GET | `/api/orgs/me` | Auth — current org + role |
| GET | `/api/orgs/:id/overview` | Org owner/admin — cohort totals + member activity |
| GET | `/api/orgs/:id/members` | Org owner/admin |
| POST | `/api/orgs/:id/members` | Org owner/admin — existing user joins **or** pending email invite |
| PATCH | `/api/orgs/:id/members/:membershipId` | Org owner/admin — set role `admin` \| `member` |
| DELETE | `/api/orgs/:id/members/:membershipId` | Org owner/admin — remove member (not owner) |
| GET | `/api/orgs/:id/invites` | Org owner/admin — pending invites |
| DELETE | `/api/orgs/:id/invites/:inviteId` | Org owner/admin — revoke |
| GET | `/api/orgs/invite/:token` | Public — preview invite for signup |

Authz: `server/middleware/orgAuth.js` → `requireOrgRoles(...)`.

## Resource scoping (CTO-009 → CTO-011)

| Actor | Create | List / get / mutate |
|-------|--------|---------------------|
| Personal (`organizationId` null) | No org stamp | Own resources only (`user = me`) |
| Org member | Stamps `organizationId` from `User.organizationId` | Own resources only |
| Org owner / admin | Same stamp | Own **or** any resource tagged with their org |

Org owner/admin may also download org-tagged document/chat assets via `/api/assets/:filename`.

Rules:

1. `organizationId` is **never** taken from the request body — only from the authenticated user.
2. Personal accounts keep working unchanged.
3. Cross-org access is denied (404 / 403 for assets).

## Rules

1. Personal accounts keep working with `organizationId = null`.
2. A user may belong to **one** organization in v1.
3. Org `plan` defaults to `free`; do not client-elevate to paid org plans.
4. Member invite: existing accounts join immediately; unknown emails receive a signup link (`/signup?invite=…`).

## Institution UI (CTO-012 → CTO-014)

Settings → Organization (owner/admin):

- Lists members and pending invites
- Invite by email (join or email invite)
- Revoke pending invites
- Signup page accepts `?invite=` token and auto-joins on register

Institution console (`/institution`, CTO-014):

- Read-only cohort overview for owner/admin
- Totals for org-stamped goals, tasks, documents, habits, skills, study plans, roadmaps, chats
- Per-member activity (goals/tasks/credits), capped at 100
- Deep-link to Settings for roster/invite management
- Regular members see a forbidden message; users without an org are prompted to create one in Settings

## Not in this task (future CTO work)

- Multi-org membership
- Class/cohort CRUD beyond overview
- Transfer ownership
- Planner / Books / Community org scoping (if needed)
- Hard email verification gate is optional via `REQUIRE_EMAIL_VERIFIED=true`
