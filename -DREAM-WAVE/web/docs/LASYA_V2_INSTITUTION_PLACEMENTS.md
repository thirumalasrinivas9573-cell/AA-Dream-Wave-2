# LASYA V2 — Prompt 4/5: Institution Placements & Campus Drive Management (COMPLETE)

## Feature Overview

Placement Office workspace for the Lasya Institution Portal (`web/` port 5174/3000), backed by MongoDB APIs on `server/` (port 5001). Covers company directory (via partnerships), campus opportunities, eligibility engine, student applications, review workflow, student pools, interviews, offers, and analytics.

**Rules:**
- Student Portal (`client/`) is not modified.
- Reuses existing `Company`, `InstitutionCompanyPartnership`, `RecruitmentApplication`, `RecruitmentJob`, `RecruitmentInternship`, `RecruitmentInterview`, `RecruitmentOffer`, and institution RBAC.
- No duplicate company records — companies come from active partnerships only.

---

## Architecture

```
web/src/lib/api/institution-placements.ts  → API client + DTO mappers
web/src/store/placement-management-store.ts → API + demo hybrid store
web/src/components/institution/placements/*   → Management UI (9 tabs)

server/routes/institutionPlacements.js        → REST mount at /api/institution/placements
server/controllers/institutionPlacementController.js
server/services/institutionPlacementService.js
server/services/institutionPlacementEligibilityService.js
server/models/CampusOpportunity.js            → Unified institution-published opportunities
server/constants/institutionPlacements.js     → Types, statuses, pool presets
```

---

## API Endpoints (`/api/institution/placements/*`)

All routes require: `auth` → `requireRole('institution')` → `resolveOrganization` → `resolveInstitutionMember` → `requirePermission(...)`.

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/meta` | member | Opportunity types, eligibility statuses, pool presets |
| GET | `/stats` | analytics.read | Placement KPIs |
| GET | `/workspace` | students.read | Full workspace snapshot |
| GET | `/companies` | students.read | Company directory (partnership-linked) |
| GET | `/opportunities` | students.read | Paginated opportunities (campus + linked jobs/internships) |
| POST | `/opportunities` | placement.manage | Create campus opportunity |
| PATCH | `/opportunities/:id` | placement.manage | Update campus opportunity |
| GET | `/applications` | students.read | Server-side filtered applications |
| POST | `/applications` | placement.manage | Submit application (eligibility + duplicate check) |
| PATCH | `/applications/:id/review` | placement.manage | Stage transition + internal notes |
| POST | `/applications/:id/withdraw` | placement.manage | Withdraw before deadline |
| GET | `/opportunities/:opportunityId/eligibility` | students.read | Bulk eligibility for opportunity |
| GET | `/opportunities/:opportunityId/eligibility/:studentId` | students.read | Single-student eligibility |
| GET | `/interviews` | students.read | Institution-scoped interviews |
| GET | `/offers` | students.read | Institution-scoped offers |
| GET | `/dashboard` | analytics.read | Live dashboard widgets |
| GET | `/drives` | students.read | Campus drive list |
| POST | `/drives/:id/action` | placement.manage | publish / cancel / close / archive / lifecycle |
| PATCH | `/drives/:id/workflow` | placement.manage | Customize workflow stages |
| POST | `/drives/:driveId/shortlist/generate` | placement.manage | Auto/manual shortlist |
| POST | `/drives/:driveId/shortlist/approve` | placement.manage | Approve shortlist |
| POST | `/drives/:driveId/shortlist/publish` | placement.manage | Publish results |
| GET | `/companies/:companyId/engagement` | students.read | Company collaboration stats |
| POST | `/applications/reject` | placement.manage | Bulk reject candidates |
| POST | `/interviews` | placement.manage | Schedule interview |
| PATCH | `/interviews/:id` | placement.manage | Reschedule interview |
| POST | `/interviews/:id/cancel` | placement.manage | Cancel interview |
| POST | `/interviews/:id/outcome` | placement.manage | Attendance + feedback |
| POST | `/offers` | placement.manage | Release offer |
| PATCH | `/offers/:id` | placement.manage | Update acceptance status |
| POST | `/notifications` | placement.manage | Send placement notifications |
| GET | `/students/:studentId/placement-history` | students.read | Full placement timeline |
| GET | `/analytics` | analytics.read | Real-time placement analytics (aggregated from DB) |
| GET | `/reports/types` | reports.read | Supported report type identifiers |
| GET | `/reports/:type` | reports.read | Report preview (pagination, search, filters) |
| GET | `/reports/:type/export` | reports.generate | Export CSV/XLSX/PDF (audit-logged) |

---

## Campus Drive Lifecycle

Drive actions: `publish`, `cancel`, `close`, `archive`, `open_registration`, `close_registration`, `start`, `complete`

Each drive includes: company, opportunity, drive date, registration deadline, venue/online platform, expected hiring count, eligibility rules, required documents, configurable workflow stages, and drive status.

Default workflow: Registration Open → Registration Closed → Eligibility Verification → Resume Screening → Online Assessment → Technical Interview → HR Interview → Final Selection → Offer Released → Joining Confirmation

---

## Placement Tracking & Notifications

Per-student `placement.statusHistory` preserves: not_applied, applied, shortlisted, interview_scheduled, selected, offer_received, offer_accepted, joined, declined.

In-app notifications via `platformNotificationService` for opportunity published, registration reminders, interviews, results, and offers.

---

Configurable rules on `CampusOpportunity.eligibilityRules`:

- Department, branch, program, batch, semester
- Minimum CGPA, max backlogs, graduation year
- Required skills, required certifications

Display statuses: `eligible`, `conditionally_eligible`, `not_eligible`, plus application pipeline statuses (`application_submitted`, `under_review`, `shortlisted`, `rejected`, `offer_received`, `joined`).

Each evaluation returns human-readable `reasons` and `conditions` arrays.

---

## Opportunity Types

`full_time`, `internship`, `apprenticeship`, `graduate_program`, `fellowship`, `hackathon`, `sponsored_project`, `training`, `campus_drive`

---

## Placement Analytics & Report Center

Analytics are computed from live MongoDB aggregations — no estimated or hardcoded chart data.

**Metrics:** total/active opportunities, applications submitted, students eligible/selected/placed, placement %, highest/average package, internship listings, company/department/batch breakdowns, application pipeline, offer outcomes.

**Reports:** placement summary, company hiring, student placement, internship, offer acceptance, campus drive, recruitment timeline, department placement, batch placement.

Exports require `reports.generate` permission and are recorded in the audit log (`placement_report_generated`, `placement_report_exported`).

---

Placement Ready, Internship Eligible, High CGPA, Final Year, AI/ML, Software Development, Data Science, Cloud Computing — plus institution cohorts.

---

## Frontend Routes

| Route | Component |
|-------|-----------|
| `/institution/placements` | `PlacementManagementPage` |
| `/institution/placements/analytics` | `PlacementAnalyticsPage` |
| `/institution/placements/reports` | `PlacementReportsPage` |

Live API mode activates when authenticated and demo data is disabled (`isInstitutionDemoDataEnabled()`).

---

## Verification

```powershell
cd server
npm run verify:institution-placements   # 19 checks — placement lifecycle + analytics + reports
npm run verify:institution-students     # 44 checks — student intelligence
npm run verify:institution-all          # Combined

cd web
npm run typecheck
npm run build
```

---

## Key Design Decisions

1. **CampusOpportunity** — Single model for institution-published drives, hackathons, fellowships, etc.
2. **Partnership-linked companies** — No duplicate `Company` records; directory reads active `InstitutionCompanyPartnership` rows.
3. **RecruitmentApplication extension** — Added `institutionStudentId`, `campusOpportunityId`, `opportunityType: 'campus_opportunity'`.
4. **Stage mapping** — Canonical backend stages (`recruitment.js`) mapped to legacy UI stages in the API client.
5. **Privacy** — Student snapshots exclude UserProfile/AI data; internal review notes are private.

---

## Files Added/Modified (Prompt 4)

### Backend (new)
- `server/constants/institutionPlacements.js`
- `server/models/CampusOpportunity.js`
- `server/services/institutionPlacementEligibilityService.js`
- `server/services/institutionPlacementService.js`
- `server/services/institutionPlacementAnalyticsService.js`
- `server/services/institutionPlacementReportService.js`
- `server/services/institutionCampusDriveService.js`
- `server/services/institutionPlacementHistoryService.js`
- `server/controllers/institutionPlacementController.js`
- `server/routes/institutionPlacements.js`
- `server/scripts/verify-institution-placements.js`

### Backend (modified)
- `server/models/RecruitmentApplication.js` — institution student + campus opportunity fields
- `server/server.js` — mount `/api/institution/placements`
- `server/package.json` — verify scripts
- `server/validation/institutionStudentValidation.js` — extended ID param validation
- `server/services/institutionStudentService.js` — persist CGPA/backlogs on create

### Frontend (new)
- `web/src/lib/api/institution-placements.ts`

### Frontend (modified)
- `web/src/store/placement-management-store.ts` — API wiring
- `web/src/components/institution/placements/placement-management-page.tsx`
- `web/src/components/institution/placements/placement-insights.tsx`

---

## Known Limitations

- Multi-staff single institution uses per-user institution resolution (pre-existing).
- Student self-apply flows through institution API (no `client/` changes).
- Recruiter CRUD in UI remains local/demo — live companies come from partnerships.
- PDF export returns structured plain-text content (not a rendered PDF binary).
