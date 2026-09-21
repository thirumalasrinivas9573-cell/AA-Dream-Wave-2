# LASYA Version 2 — Prompt 3: Advanced Applicant Tracking System

## Summary

Enterprise ATS built on MongoDB with server-enforced pipeline transitions, company tenant isolation, recruitment-safe candidate snapshots, and a full Company Portal workspace under `/company/recruitment/*`.

## Canonical Application Model

**Collection:** `recruitmentapplications` (`RecruitmentApplication`)

Single source of truth — no duplicate ApplicationV2 collections.

## Routes

| Route | Purpose |
|-------|---------|
| `/company/recruitment` | ATS command center (stats + funnel) |
| `/company/recruitment/applications` | Application table (search, filters, bulk, URL state) |
| `/company/recruitment/pipeline` | Kanban pipeline (drag → API, server validates) |
| `/company/recruitment/applications/[id]` | Application workspace |

## API (`/api/recruitment/*`)

Company-role + `resolveOrganization` required.

- `GET /meta`, `/stats`, `/funnel`
- `GET/POST /applications`, `GET /applications/:id`
- `GET /applications/:id/transitions` — allowed next stages
- `PATCH /applications/:id/stage` (validated transitions)
- `PATCH /applications/:id/assign`, `/tags`, `/ratings`
- `POST /applications/:id/notes`, `/interviews`, `/assessments`, `/offer`
- `POST /applications/bulk/assign`, `/bulk/stage`, `/bulk/tags`
- `POST /interviews/:id/feedback`
- `GET/POST /jobs`, `GET/POST /internships`

## Verification

```bash
cd server && npm run verify:recruitment
cd web && npm run typecheck && npm run build
```

Verified flows: create, valid/invalid transitions, allowed transitions, internal notes, tenant isolation, interview schedule + feedback, offer release, rejection, bulk tags, stats, funnel.
