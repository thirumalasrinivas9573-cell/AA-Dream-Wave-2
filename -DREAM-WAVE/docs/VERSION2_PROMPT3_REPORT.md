# Dream Wave AI — Version 2 Prompt 3 Engineering Report

**Intelligent Goal Planning · Dynamic Roadmap · Milestone Intelligence · Adaptive Progress**

Date: 2026-08-01

---

## 1. FILES INSPECTED

- `server/models/Goal.js`, `Task.js`, `Roadmap.js`, `User.js`, `UserProfile.js`
- `server/controllers/goalController.js`, `taskController.js`, `roadmapController.js`
- `server/services/aiRoadmapService.js`, `aiTaskService.js`, `mentorContextEngine.js`
- `server/utils/calculateProgress.js`
- `server/routes/goals.js`, `roadmap.js`
- `client/src/modules/student/pages/Goals.jsx`, `Roadmap.jsx`, `Dashboard.jsx`
- `client/src/modules/student/components/goals/GoalWorkspace.jsx`
- `client/src/modules/student/components/roadmap/RoadmapWorkspace.jsx`
- `server/tests/goalsRoadmap.test.js`, `intelligence.test.js`, `mentor.test.js`

## 2. FILES CREATED

- `server/services/progressEngine.js`
- `server/services/roadmapValidator.js`
- `server/services/goalIntelligenceService.js`
- `server/controllers/goalIntelligenceController.js`
- `server/tests/goalIntelligence.test.js`
- `client/src/shared/services/goalIntelligenceService.js`
- `docs/VERSION2_PROMPT3_REPORT.md`

## 3. FILES MODIFIED

- `server/models/Goal.js` — `planning` status, extended categories
- `server/models/Roadmap.js` — `changeHistory[]` for adaptation versioning
- `server/utils/calculateProgress.js` — delegates to `progressEngine`
- `server/controllers/goalController.js` — categories/statuses, milestone sync, `syncCompletion` fix
- `server/controllers/taskController.js` — unified progress sync
- `server/controllers/roadmapController.js` — validation, learningStages mapping, progress sync
- `server/services/aiRoadmapService.js` — server-side roadmap validation
- `server/services/mentorContextEngine.js` — next-action + progress breakdown in mentor context
- `server/routes/goals.js` — intelligence routes
- `client/src/shared/services/api.js` — `goalIntelligenceApi`
- `client/src/modules/student/components/goals/GoalWorkspace.jsx` — Smart Goal Builder, AI panel
- `client/src/modules/student/pages/Goals.jsx` — AI builder entry point
- `client/src/modules/student/pages/Roadmap.jsx` — adaptation preview/apply UI
- `client/src/modules/student/pages/Dashboard.jsx` — next action + weekly review widgets
- `client/src/modules/student/styles/goals-roadmap.css` — AI/roadmap UI styles

## 4. FILES REMOVED

None.

## 5. EXISTING GOAL SYSTEM REUSED

Canonical `Goal` collection and `/api/goals` routes extended. No duplicate GoalsV2.

## 6. EXISTING TASK SYSTEM REUSED

Canonical `Task` collection. AI suggestions use `source: 'ai'` with explicit accept endpoint only.

## 7. EXISTING ROADMAP SYSTEM REUSED

Canonical `Roadmap` collection with `data`, `learningStages`, manual architecture fields preserved.

## 8. LEGACY/DUPLICATE DATA FINDINGS

- `User.goals[]` / `User.tasks[]` — legacy, unused; no new writes added
- Previous triple progress writers consolidated via `progressEngine.syncGoalProgress`

## 9. SMART GOAL BUILDER

- `POST /api/goals/intelligence/suggest` + `clarify` + `save`
- Client `SmartGoalBuilder` dialog: suggest → preview → edit/remove/regenerate → explicit save
- Library resources limited to real Dream Wave books (no fabricated PDFs)

## 10. ROADMAP GENERATION ENGINE

- Existing `aiRoadmapService.generateRoadmap` retained
- Output validated via `roadmapValidator` before persistence
- `learningStages` auto-derived from validated `nextSteps`

## 11. ROADMAP VALIDATION

- `validateRoadmapPayload` enforces structure, limits, allowed types
- `POST /api/goals/intelligence/validate-roadmap` for explicit validation
- Malformed AI output falls back safely

## 12. MILESTONE ENGINE

- Embedded goal milestones with dependencies, status, progress
- Milestone updates trigger deterministic progress recalculation

## 13. TASK INTEGRATION

- `suggest-tasks` / `accept-tasks` endpoints
- Goal detail AI panel with checkbox accept flow (no auto-flood)

## 14. PROGRESS ENGINE

- Weighted: milestones 35%, tasks 35%, roadmap 30%
- Single `syncGoalProgress` wired into task, roadmap, milestone controllers
- Manual progress check-ins preserved for journaling

## 15. NEXT BEST ACTION

- `getNextBestAction`: overdue task → open task → milestone → roadmap stage → goal setup
- Exposed via API and dashboard widget

## 16. ADAPTIVE ROADMAP SYSTEM

- `adapt-roadmap` preview with diff (added/removed/reordered stages)
- `apply` requires student approval; snapshots stored in `changeHistory`

## 17. AI MENTOR INTEGRATION

- `mentorContextEngine` includes progress breakdown + next best action for goal-related queries

## 18. LIBRARY INTEGRATION

- Goal suggestions query `LibraryBook` / `LibraryProgress` for real titles only

## 19. CAREER INTEGRATION

- Read-only career context in mentor engine; no ATS/company portal changes

## 20. SECURITY CONTROLS

- All intelligence routes behind `auth` middleware
- Ownership verified on every goal-scoped operation
- Mass-assignment limited to whitelisted suggestion fields on save

## 21. PRIVACY CONTROLS

- Goal/roadmap/task data user-scoped; selective fields sent to AI context engine

## 22. PERFORMANCE IMPROVEMENTS

- Deterministic progress/deadline logic (no AI on every bar update)
- Lean queries in progress engine with parallel fetches

## 23. DATABASE CHANGES

- `Goal`: `planning` status, extended category enum
- `Roadmap`: optional `changeHistory[]` array

## 24. API CHANGES

New under `/api/goals/intelligence/*`:

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/suggest` | AI goal suggestions |
| POST | `/clarify` | Broad goal refinement |
| POST | `/save` | Save reviewed suggestion |
| GET | `/weekly-review` | Weekly metrics |
| GET | `/conflicts` | Deadline overlap warnings |
| GET | `/:goalId/progress` | Progress breakdown |
| POST | `/:goalId/progress/sync` | Force sync |
| GET | `/:goalId/next-action` | Next best action |
| GET | `/:goalId/review` | Goal review |
| GET | `/:goalId/adapt-roadmap` | Adaptation preview |
| POST | `/:goalId/adapt-roadmap/apply` | Apply approved changes |
| POST | `/:goalId/suggest-tasks` | Task suggestions |
| POST | `/:goalId/accept-tasks` | Save selected tasks |

## 25. TESTS ACTUALLY EXECUTED

```
node --require ./tests/mongoSetup.js --test \
  tests/goalIntelligence.test.js \
  tests/goalsRoadmap.test.js \
  tests/intelligence.test.js \
  tests/mentor.test.js
```

**Result: 22/22 passed**

Also executed:

- `client`: `npm run lint` — 0 errors
- `client`: `npm run build` — success

Full server suite (`npm test`) hit MongoMemoryServer sandbox limits in CI-like environment; goal-related subset verified with full permissions.

## 26. BUILD RESULT

Production client build succeeded (Vite, 598 modules).

## 27. KNOWN LIMITATIONS

- AI goal/roadmap/adaptation endpoints require OpenAI; manual flows work without AI
- Roadmap adaptation preview calls AI (student must approve before apply)
- Study planner scheduling hooks exposed as structured data only (Prompt 4 scope)
- `createRoadmap` still auto-generates roadmap-linked tasks via existing `aiTaskService` (legacy behavior preserved)

## 28. TECHNICAL DEBT

- Manual progress check-ins can diverge briefly from computed progress until next sync event
- Full server test suite should run in environment with stable MongoMemoryServer
- Gamification hooks for first milestone/goal completed not wired in this pass
- Notification events for milestone/deadline warnings reuse existing service but not fully enumerated

---

**Prompt 3 status: COMPLETE**

Architecture prepared for **Prompt 4 — AI Study Planner & Smart Daily Scheduling**.
