# Cycle 2 · Prompt 10 — Cleanup Report (pre-deletion)

Generated before any deletions. Only **HIGH** confidence items will be deleted.

## Verified SAFE TO DELETE (HIGH)

### Company portal stub pages (routes only redirect)
- `client/src/modules/company/pages/JobPosts.jsx`
- `client/src/modules/company/pages/Recruitment.jsx`
- `client/src/modules/company/pages/Promotions.jsx`
- `client/src/modules/company/pages/HRDashboard.jsx`
- `client/src/modules/company/pages/ResumeScreening.jsx`
- `client/src/modules/company/pages/CandidateRanking.jsx`
- `client/src/modules/company/pages/InterviewPipeline.jsx`
- `client/src/modules/company/pages/Attendance.jsx`
- `client/src/modules/company/pages/Performance.jsx`
- `client/src/modules/company/pages/Payroll.jsx`
- `client/src/modules/company/pages/Notifications.jsx`
- `client/src/modules/company/pages/Certificates.jsx`

### Superseded public profiles
- `client/src/modules/profiles/pages/CompanyPublic.jsx`
- `client/src/modules/profiles/pages/InstitutionPublic.jsx`
- (remove empty `profiles/` tree if empty after)

### Dead route wrappers
- `client/src/modules/company/routes/index.jsx`
- `client/src/modules/institution/routes/index.jsx`

### Unused shared component
- `client/src/shared/components/portal/CategoryCrudPage.jsx`

### Orphan server models
- `server/models/Role.js`
- `server/models/Session.js`

## KEEP (not deleted)

- All routed company/institution/student/library/discovery/admin pages
- `client/src/shared/**` (canonical `@shared`)
- Historical root `*.md` summaries (docs clutter, not runtime dead code — archive recommended later)
- `web/` Next.js app (separate surface)
- Seed scripts, `institution-seed.ts`
- Server deps `firebase`/`puppeteer`/`pdfkit`/`nodemailer` — MEDIUM unused; deferred to avoid breaking optional tooling

## MEDIUM (deferred)

- Prune unused server packages after dedicated dependency audit
- Archive 40+ root historical markdown files into `docs/archive/`
- Refresh `web/package-lock.json` Three.js remnants

## Already gone

- `CINEMATIC_ENGINE_SUMMARY.md`
- Three.js client experiments
- `client/src/modules/shared` (lifted to `client/src/shared`)
