# LASYA V2 — Prompt 3: Institution Student Intelligence (COMPLETE)

## Feature Overview

Enterprise-grade Institution Student Intelligence for the Lasya Institution Portal (`web/` port 5174/3000), backed by MongoDB APIs on `server/` (port 5001). Covers student directory, detail workspace, analytics, reports, talent discovery, RBAC, audit logging, and dashboard integration.

**Rule:** Student Portal (`client/`) and AI modules are not modified.

---

## Architecture

```
web/src/lib/api/          → API clients + Zod validation schemas
web/src/store/            → student-management-store (API + demo hybrid)
web/src/components/       → institution/students/*, institution-dashboard.tsx

server/routes/institutionStudents.js     → REST mount at /api/institution/students
server/controllers/                      → Thin handlers
server/services/                         → Business logic, caching, aggregation
server/validation/                       → Request validation middleware
server/dtos/                             → Audit/export/dashboard DTOs
server/middleware/institutionPermission.js → RBAC
server/models/InstitutionStudent.js      → Canonical student records (tenant-scoped)
```

---

## API Endpoints (`/api/institution/students/*`)

All routes require: `auth` → `requireRole('institution')` → `resolveOrganization` → `resolveInstitutionMember` → `requirePermission(...)`.

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/meta` | member | Enum constants |
| GET | `/permissions` | member | RBAC meta + current role |
| GET | `/stats` | analytics.read | Dashboard stats + activity |
| GET | `/activity` | analytics.read | Institution activity timeline |
| GET | `/filters` | students.read | Lookup filter options (cached) |
| GET | `/analytics` | analytics.read | Aggregated dashboard metrics |
| GET | `/reports/types` | reports.read | Available report types |
| GET | `/reports/:type` | reports.read | Report preview (paginated) |
| GET | `/reports/:type/export` | reports.generate | CSV/XLSX/PDF export |
| GET | `/` | students.read | Paginated directory |
| POST | `/` | students.manage | Create student |
| GET | `/:id` | students.read | Student detail DTO |
| PATCH | `/:id` | students.manage | Update student |
| PATCH | `/:id/placement` | placement.manage | Placement lifecycle |
| POST | `/:id/notes` | notes.manage | Institution notes (typed) |
| POST | `/:id/verify-skill` | students.verify | Verify shared skill |
| POST | `/:id/achievements/:index/verify` | students.verify | Verify achievement |
| POST | `/:id/certificates/:index/verify` | students.verify | Verify certificate |
| GET | `/:id/audit` | students.read | Per-student audit log |
| GET | `/:id/placement-summary` | students.read | Privacy-safe placement summary |
| GET | `/:id/documents/:docIndex` | documents.read | Authorized document access |
| POST | `/import/preview` | students.import | Import validation |
| POST | `/import/confirm` | students.import | Import confirm |
| POST | `/import` | students.import | Bulk import |
| POST | `/bulk` | students.manage | Bulk actions |
| GET/POST | `/cohorts` | read / cohorts.manage | Cohort management |
| GET | `/talent/discover` | students.read | Talent discovery |
| POST | `/talent/smart-search` | students.read | NL → filter search |
| GET/POST | `/saved-filters` | students.read | Saved filter configs |

---

## Permission Matrix

| Permission | OWNER | ADMIN | PLACEMENT_OFFICER | FACULTY | STAFF | VIEWER |
|------------|-------|-------|-------------------|---------|-------|--------|
| students.read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| students.manage | ✓ | ✓ | — | — | — | — |
| students.import | ✓ | ✓ | — | — | ✓ | — |
| students.export | ✓ | ✓ | ✓ | — | — | — |
| students.verify | ✓ | ✓ | — | — | — | — |
| analytics.read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| reports.read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| reports.generate | ✓ | ✓ | ✓ | — | — | — |
| placement.manage | ✓ | ✓ | ✓ | — | — | — |
| documents.read | ✓ | ✓ | ✓ | — | — | — |
| notes.manage | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| tags.manage | ✓ | ✓ | ✓ | — | — | — |
| cohorts.manage | ✓ | ✓ | — | — | — | — |

---

## Database Changes

### Models (reuse — no duplicate student entities)
- `InstitutionStudent` — canonical institution-owned student records
- `InstitutionStudentNote` — institution-private notes (never synced to AI)
- `InstitutionStudentAudit` — administrative audit trail
- `InstitutionMember` — RBAC membership
- `InstitutionCohort`, `InstitutionSavedFilter` — cohorts and saved filters

### New indexes on `InstitutionStudent`
- `{ institutionId, department }`
- `{ institutionId, course }`
- `{ institutionId, batch }`
- `{ institutionId, placement.lifecycleStatus }`
- `{ institutionId, email }`
- `{ institutionId, createdAt }`

---

## Privacy

Institution APIs **never** expose:
- AI conversations, AI memory, goals, tasks, planner, knowledge graph
- Private research, private projects, recommendation history, personal notes

Enforced via:
- `institutionStudentPrivacy.js` visibility filters
- DTO serializers (no raw MongoDB documents)
- Separate `InstitutionStudentNote` collection (not student AI memory)
- Private certificates/documents filtered at serialization

---

## Configuration

| Variable | Required | Purpose |
|----------|----------|---------|
| `MONGODB_URL` | Yes | Database |
| `JWT_SECRET` | Yes | Authentication |
| `PORT` | No (5001) | Server port |
| `NEXT_PUBLIC_API_BASE_URL` | Yes (web) | Frontend API base |
| `NEXT_PUBLIC_INSTITUTION_DEMO_DATA` | No | `true` = localStorage demo mode |

---

## Verification

```bash
# Comprehensive integration + security + privacy tests (44 checks)
cd server && npm run verify:institution-students

# Frontend
cd web && npm run typecheck && npm run build
```

---

## Known Limitations

1. **Multi-staff tenancy:** Each institution user currently owns their own institution profile via `resolveOrganization`. Shared staff accounts on a single institution require future `InstitutionMember` invitation flow.
2. **XLSX/PDF export:** XLSX returns CSV content with appropriate mime; PDF is text-based placeholder.
3. **Placement store (UI):** `/institution/placements` localStorage store not yet wired to company `RecruitmentApplication` API.
4. **Import UI:** Backend preview/confirm exists; frontend wizard uses simplified CSV upload.
5. **Cohort UI:** Backend complete; dedicated cohort management page pending.

---

## Deployment Notes

- Run server with `npm start` (production) or `npm run dev` (development)
- Build web with `npm run build`; serve via Next.js
- No database migrations required (Mongoose auto-creates collections)
- Indexes created on model load
- Cache is in-memory (per server instance); safe to invalidate on mutations

---

## Frontend Routes

| Route | Component |
|-------|-----------|
| `/institution/students` | Student directory |
| `/institution/students/[id]` | Detail workspace |
| `/institution/students/analytics` | Live analytics dashboard |
| `/institution/students/reports` | Report center |
| `/institution/students/talent` | Talent discovery |
| `/institution/dashboard` | Integrated live widgets |
| `/institution/reports` | Global report hub |
