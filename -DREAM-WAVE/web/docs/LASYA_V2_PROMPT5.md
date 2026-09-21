# LASYA V2 — Prompt 5: Company Recruitment, ATS & Candidate Pipeline 2.0

## Overview

Enterprise Applicant Tracking System for the Company Portal (`web/`), backed by `/api/recruitment/*` on `server/`. Extends Prompt 3 ATS with full company workspace: profile, job/internship lifecycle, applicant directory, customizable pipeline, and shortlist management.

**Rules:** Reuses existing auth, notifications, and recruitment models. No duplicate company records (`ownerUserId` unique). Tenant isolation via `resolveOrganization`.

---

## Company Workspace Routes

| Route | Component |
|-------|-----------|
| `/company/profile` | Company profile editor |
| `/company/recruitment` | Recruitment overview + funnel |
| `/company/recruitment/jobs` | Job management (draft → published → closed → archived) |
| `/company/recruitment/internships` | Internship management |
| `/company/recruitment/applications` | Application list |
| `/company/recruitment/applicants` | Candidate-centric applicant directory |
| `/company/recruitment/shortlist` | Shortlist management + bulk actions |
| `/company/recruitment/pipeline` | Kanban pipeline |
| `/company/recruitment/pipeline/settings` | Custom pipeline stage labels |
| `/company/recruitment/interviews` | Interview management |
| `/company/recruitment/panels` | Interview panel management |
| `/company/recruitment/team` | Recruitment team RBAC |
| `/company/recruitment/communication` | Communication center |
| `/company/recruitment/talent` | Talent discovery search |

---

## API Endpoints (`/api/recruitment/*`)

All routes: `auth` → `requireRole('company')` → `resolveOrganization`

| Method | Path | Description |
|--------|------|-------------|
| GET/PATCH | `/profile` | Company profile |
| GET/PATCH | `/pipeline` | Pipeline stage configuration |
| GET | `/applicants` | Candidate directory (aggregated) |
| GET | `/shortlist` | Shortlisted applications |
| POST | `/shortlist/bulk` | Bulk shortlist actions |
| GET/POST | `/jobs` | List/create jobs |
| GET/PATCH | `/jobs/:id` | Job detail/update |
| POST | `/jobs/:id/action` | publish, close, archive, reopen |
| GET/POST | `/internships` | List/create internships |
| GET/PATCH | `/internships/:id` | Internship detail/update |
| POST | `/internships/:id/action` | Lifecycle actions |
| POST | `/assessments/:id/complete` | Complete assessment |

### Interview, Offer & Team (Prompt 5 extension)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/interviews` | interviews.manage | List all interviews |
| PATCH | `/interviews/:id` | interviews.manage | Reschedule interview |
| POST | `/interviews/:id/cancel` | interviews.manage | Cancel interview |
| POST | `/interviews/:id/outcome` | interviews.manage | Attendance + structured evaluation |
| GET/POST | `/panels` | panels.manage | Interview panel CRUD |
| POST | `/applications/:id/offer/draft` | offers.manage | Create offer draft |
| POST | `/offers/:id/action` | offers.manage | approve, send, withdraw, accept, decline |
| PATCH | `/applications/:id/onboarding` | applications.manage | Update onboarding status |
| GET | `/talent/discover` | talent.discover | Search applicant pool |
| POST | `/communications` | communications.send | Bulk candidate notifications |
| PATCH | `/team` | team.manage | Recruitment team RBAC |
| GET | `/partners` | member | Partner institutions |

---

## Listing Lifecycle

Job/internship statuses: `draft`, `published`, `closed`, `archived` (legacy `open`/`paused` mapped via aliases).

Actions: `publish`, `close`, `archive`, `reopen`

---

## Pipeline Customization

Companies store `pipelineStages` on the `Company` model — enable/disable stages and custom labels. Kanban uses configured stages; server-side stage transitions remain validated against canonical `APPLICATION_STAGES`.

---

## Verification

```powershell
cd server
npm run verify:recruitment

cd web
npm run typecheck
npm run build
```

---

## Key Files

### Backend
- `server/constants/companyRecruitment.js`
- `server/models/Company.js` (extended profile + pipeline)
- `server/models/RecruitmentJob.js` / `RecruitmentInternship.js`
- `server/services/recruitmentService.js`
- `server/controllers/recruitmentController.js`
- `server/routes/recruitment.js`

### Frontend
- `web/src/lib/api/recruitment.ts`
- `web/src/types/recruitment.ts`
- `web/src/components/company/recruitment/*`
- `web/src/constants/partnership.ts` (routes + nav)
