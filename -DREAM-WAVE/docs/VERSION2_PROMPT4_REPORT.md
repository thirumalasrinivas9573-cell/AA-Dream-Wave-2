# Dream Wave AI — Version 2 Prompt 4 Engineering Report

**Owner:** Thirumala Srinivas  
**Scope:** AI Study Planner, Smart Daily Scheduling, Focus Mode, Productivity Intelligence  
**Status:** Complete

---

## 1. Files Inspected

- `server/models/Task.js`, `FocusSession.js`, `Goal.js`, `Roadmap.js`
- `server/controllers/taskController.js` (focus handlers, analytics)
- `server/services/mentorContextEngine.js`, `goalIntelligenceService.js`, `progressEngine.js`
- `server/routes/tasks.js`, `server/server.js`
- `client/src/modules/student/pages/Dashboard.jsx`, `Tasks.jsx`, `Mentor.jsx`
- `client/src/modules/student/components/tasks/TaskWorkspace.jsx`
- `client/src/modules/student/routes.jsx`, `StudentSidebar.jsx`
- `server/tests/tasksProductivity.test.js`, `goalIntelligence.test.js`

## 2. Files Created

### Backend
- `server/models/ScheduleItem.js`
- `server/models/PlannerPreferences.js`
- `server/services/scheduleEngine.js`
- `server/services/priorityEngine.js`
- `server/services/planValidator.js`
- `server/services/plannerService.js`
- `server/services/plannerIntelligenceService.js`
- `server/controllers/plannerController.js`
- `server/routes/planner.js`
- `server/tests/planner.test.js`

### Frontend
- `client/src/shared/services/plannerService.js`
- `client/src/modules/student/hooks/usePlanner.js`
- `client/src/modules/student/hooks/useFocusSession.js`
- `client/src/modules/student/components/planner/PlannerWorkspace.jsx`
- `client/src/modules/student/pages/StudyPlanner.jsx`
- `client/src/modules/student/pages/FocusMode.jsx`
- `client/src/modules/student/styles/planner.css`

## 3. Files Modified

- `server/models/FocusSession.js` — pause/resume fields, goal link, timer mode, notes
- `server/controllers/taskController.js` — paused duration in stopFocus
- `server/services/mentorContextEngine.js` — planner context block
- `server/server.js` — `/api/planner` route
- `client/src/shared/services/api.js` — `plannerApi`
- `client/src/modules/student/routes.jsx` — `/student/planner`, `/student/focus`
- `client/src/modules/student/layouts/StudentSidebar.jsx` — Study Planner nav
- `client/src/modules/student/pages/Dashboard.jsx` — Today's Plan widget

## 4. Files Removed

None.

## 5. Existing Planner Components Reused

- Task due-date schedule derivation on Dashboard (fallback when no planner items)
- Task-scoped focus in `TaskWorkspace.jsx` (canonical task focus endpoints preserved)
- Goal intelligence weekly review widget on Dashboard

## 6. Existing Focus Components Reused

- `FocusSession` model and task controller focus start/stop (extended, not replaced)
- Task analytics focus minutes aggregation

## 7. Canonical Data Sources

| Entity | Source |
|--------|--------|
| Tasks | `Task` model / `/api/tasks` |
| Goals | `Goal` model / `/api/goals` |
| Roadmaps | `Roadmap` model / `/api/roadmap` |
| Schedule items | `ScheduleItem` model / `/api/planner/schedule` |
| Planner preferences | `PlannerPreferences` / `/api/planner/preferences` |
| Focus sessions | `FocusSession` / `/api/planner/focus/*` + `/api/tasks/:id/focus/*` |

Tasks are never duplicated inside planner documents — schedule items store references only.

## 8. Study Planner Implementation

- Route: `/student/planner`
- Tabs: Today, Week, Overdue, Preferences
- Shows today's blocks, progress, focus time, goal/roadmap priorities, AI recommendations

## 9. Daily Planning Engine

- Deterministic priority sort via `priorityEngine.js`
- Time blocking via `scheduleEngine.js` with session/break lengths from preferences
- `buildDeterministicDailyItems()` fills available minutes without AI writes

## 10. Weekly Planning Engine

- Distributes ranked tasks across Mon–Sun using weekly availability
- `GET /api/planner/week` returns per-day blocks, deadlines, overload flags

## 11. AI Plan Generation

- `POST /api/planner/plan/daily/suggest` — deterministic plan + optional AI summary/tips
- `POST /api/planner/plan/weekly/suggest` — balanced weekly preview
- AI never writes to MongoDB directly; OpenAI used only for interpretation when key present

## 12. Plan Approval Workflow

- Preview returned with `requiresApproval: true`
- Student selects items → `POST /api/planner/plan/apply`
- Supports accept selected / accept all / cancel
- Duplicate generation protected via in-memory lock (8s TTL)

## 13. Priority Engine

Transparent scoring factors: overdue, due-soon, goal priority, goal deadline, roadmap stage, in-progress status. `explainPriority()` provides "why first" text.

## 14. Schedule Conflict Engine

- Overlap detection on same date/time ranges
- Duplicate task-on-date warnings
- Past-date validation
- Returns HTTP 409 with conflict list

## 15. Overload Detection

- Compares planned minutes vs available minutes
- Surfaces warning in preview and today view
- Does not auto-trim schedule

## 16. Adaptive Rescheduling

- `POST /api/planner/adapt/suggest` suggests moving incomplete blocks to next day
- Does not auto-rewrite existing schedule

## 17–19. Goal / Roadmap / Milestone Integration

- Schedule items reference `goalId`, `roadmapId`, optional `milestoneKey`
- Today view enriches items with goal/roadmap data
- Links navigate to canonical Goals/Tasks pages

## 20. Task Integration

- Pending/overdue tasks feed priority engine
- Completing schedule item optionally marks canonical task complete
- Task completion elsewhere reflected via enrichment (`isCompleted`)

## 21. Focus Mode Implementation

- Route: `/student/focus?task=:id`
- Clean full-screen UI — no decorative animations
- Timer presets: 25 / 45 / 60 / custom

## 22. Focus Timer Reliability

- Elapsed time computed from `startedAt`, `pausedDurationSeconds`, `pausedAt` timestamps
- Client syncs from server on load; interval refresh while active
- Survives tab backgrounding better than decrement-only timers

## 23. Productivity Metrics

- `GET /api/planner/metrics` — focus minutes, sessions, tasks completed, plan completion rate
- Insights generated only from real aggregated data

## 24. Daily Summary

- `GET /api/planner/summary/daily` — planned/completed/remaining, focus time, goal progress snapshot

## 25. Weekly Review

- Dashboard reuses Prompt 3 weekly goal review widget
- Planner metrics panel adds study-time and plan-rate context

## 26. AI Mentor Integration

- `mentorContextEngine` loads today's schedule, availability, focus time when planner keywords/actions detected

## 27. Dashboard Integration

- "Today's Plan" panel loads `/api/planner/today`
- Quick action: Study Planner
- Fallback to task due dates when no schedule items

## 28. Security Controls

- All planner routes require `auth` middleware
- Queries scoped by `req.user._id`
- Cross-student schedule/focus access returns 404

## 29. Privacy Controls

- Planner/focus data student-private
- AI context sends minimal planner fields only
- No exposure to company/recruiter/public APIs

## 30. Database Changes

- New collections: `scheduleitems`, `plannerpreferences`
- Extended `FocusSession` schema (backward compatible)

## 31. API Changes

New mount: `/api/planner/*` (today, week, schedule CRUD, plan suggest/apply, metrics, focus session lifecycle)

## 32. Performance Improvements

- Lean queries with field projections
- Paginated focus history (default 20, max 50)
- Deterministic planning avoids OpenAI for core scheduling

## 33. Tests Actually Executed

| Suite | Result |
|-------|--------|
| `server/tests/planner.test.js` | **8/8 passed** |
| `server/tests/tasksProductivity.test.js` | **4/4 passed** |
| `server/tests/goalIntelligence.test.js` | **7/7 passed** |
| `client npm run lint` | **0 errors** |
| `client npm run build` | **Success** |

## 34. Build Results

- Client production build: **success** (7.64s)
- New chunks: `StudyPlanner-*.js`, focus/planner CSS bundled

## 35. Known Limitations

- Weekly availability UI is preferences-only (no per-day visual editor yet)
- AI weekly/daily plans use deterministic ordering; AI adds interpretation not reordering
- Institution events not yet merged into planner fixed blocks (display-ready via dashboard events)
- Manual drag-and-drop calendar not implemented (intentionally minimal)
- In-memory AI generation lock is single-process (not distributed)

## 36. Technical Debt

- Unify task focus (`/api/tasks/:id/focus`) and planner focus (`/api/planner/focus`) UIs fully
- Persist AI plan preview server-side for multi-device resume (currently client-held)
- Add notification hooks for upcoming blocks (reuse `/api/notifications`)
- Distributed rate-limit lock for plan generation in multi-instance deploys

---

**Prompt 4 completion criteria:** met. System is stable, buildable, secure, and backward-compatible with Lasya's Institution/Company portals.
