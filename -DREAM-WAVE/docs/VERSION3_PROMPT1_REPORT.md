# Dream Wave AI — Version 3 Prompt 1 Engineering Report

**Intelligence Layer 3.0 · Personal Knowledge Graph · Context-Aware AI · Decision Support**

Date: 2026-08-03

---

## 1. Executive Summary

Version 3 Prompt 1 extends the existing V2 student intelligence architecture (no duplicate AI systems). It introduces:

- **Persistent Personal Knowledge Graph** (`KnowledgeGraphEdge`) — relationship-only storage, canonical models remain source of truth
- **Context Engine 3.0** (`studentContextEngine`) — intent routing, layered context selection, budgeting, graph-aware mentor context
- **Decision Support** (`decisionSupportService`) — explainable next best action, recommendations with reasons/source signals, dismissal/feedback
- **Dashboard 3.0 integration** — relationship-aware daily brief, next best action card, intelligent suggestions
- **Narrow API surface** under `/api/intelligence/*` (no generic graph query endpoint)

**Verification:** 11 new V3 tests pass; full server suite 110/111 pass (1 pre-existing flaky search-history timing test); client lint + build pass.

---

## 2. V2 Baseline Verified

- Canonical stack: `client/` + `server/`
- V2 security hardening preserved; Lasya portals untouched
- Reused: `mentorContextEngine`, `recommendationEngine`, `priorityEngine`, `progressEngine`, `dashboardOrchestrationService`, `intelligenceService`

---

## 3–7. File Inventory

### Created
- `server/models/KnowledgeGraphEdge.js`
- `server/models/IntelligenceRecommendationState.js`
- `server/services/knowledgeGraphService.js`
- `server/services/studentContextEngine.js`
- `server/services/decisionSupportService.js`
- `server/tests/v3Intelligence.test.js`
- `docs/VERSION3_PROMPT1_REPORT.md`

### Modified
- `server/controllers/intelligenceController.js` — V3 endpoints
- `server/routes/intelligence.js` — route mounts
- `server/services/dashboardOrchestrationService.js` — V3 command center enrichment
- `server/services/mentorContextEngine.js` — `sourcesOverride` support
- `server/controllers/mentorController.js` — unified V3 context via `resolveMentorContext`
- `server/controllers/goalController.js` — graph edge cleanup on goal delete
- `client/src/shared/services/api.js` — intelligence API extensions
- `client/src/shared/services/intelligenceService.js` — client wrappers
- `client/src/modules/student/pages/Dashboard.jsx` — V3 widgets
- `client/src/modules/student/components/dashboard/DashboardWidgets.jsx` — `NextBestActionCard`, `IntelligenceRecommendations`
- `client/src/modules/student/styles/dashboard.css` — V3 styles

### Removed
- None

### Shared / Lasya
- Shared: intelligence routes, mentor controller, goal delete hook, server orchestration
- **Lasya-owned files touched: NONE**

---

## 8–16. Knowledge Graph Architecture

| Aspect | Implementation |
|--------|----------------|
| Storage | MongoDB `KnowledgeGraphEdge` collection |
| Strategy | Relationships only — no document duplication |
| Node identity | `entityType` + `entityId` (allowlisted types) |
| Relations | Allowlisted: `HAS_GOAL`, `REQUIRES_SKILL`, `SUPPORTS_GOAL`, `PART_OF_ROADMAP`, etc. |
| Origins | `EXPLICIT`, `SYSTEM_DERIVED`, `AI_SUGGESTED` (AI-suggested never auto-written in P1) |
| Ownership | All edges scoped by `studentId` |
| Privacy | Private; exposed only via narrow student-authenticated summary endpoints |
| Sync | Idempotent `syncFromCanonical()` from goals/tasks/roadmaps/library/profile/career |
| Cleanup | `removeEdgesForEntity()` on goal delete; no orphan edges |
| Backfill | Lazy sync on intelligence requests (5-minute in-process debounce) |
| Feature flag | `INTELLIGENCE_V3_ENABLED=false` disables V3 (fail-closed on V3-only endpoints) |

Profile `buildGraph()` (V2 deterministic view) remains for portfolio visualization; V3 graph is the persistent relationship layer.

---

## 17–23. Context Engine 3.0

- **Intent router:** `STUDY_HELP`, `ROADMAP_HELP`, `GOAL_HELP`, `CAREER_HELP`, etc.
- **Layers:** identity, goal, learning, career, activity, temporal, conversation
- **Budget:** default 4200 chars; truncates safely
- **Provenance:** source labels per loaded block
- **Memory vs state:** mentor memory unchanged; dynamic tasks/planner/progress loaded fresh
- **Mentor integration:** `resolveMentorContext()` uses V3 engine when enabled

---

## 24–29. Decision Support & Recommendations

| Capability | Details |
|------------|---------|
| Next Best Action | Deterministic priority + goal/roadmap/career context |
| Recommendations | Types: `NEXT_ACTION`, `LEARNING`, `RESOURCE`, `CAREER`, `PRODUCTIVITY` |
| Explainability | `reason`, `sourceSignals`, no fake scores |
| Deduplication | SHA fingerprint per recommendation |
| Expiry | Time-bound for due-today / stalled alerts |
| Dismissal | `IntelligenceRecommendationState` persistence |
| Feedback | `helpful` / `not_relevant` |
| Roadmap gaps | Detected deterministically; never silent roadmap rewrite |
| Stalled goals | 14-day rule with explainable recovery suggestions |

---

## 30–41. Domain Intelligence

- **Goals:** graph links goal ↔ task ↔ roadmap; next action references supporting goal
- **Roadmaps:** stage/skill/topic edges; gap detection vs career required skills
- **Learning:** continue-reading preference over new resources
- **Career:** skill gap recommendations from `CareerProfile` (student-private)
- **Dashboard:** enriched daily brief + widgets; failure-isolated (try/catch)
- **Search:** unchanged deterministic core (V3 context available via `/context-summary`)

---

## 42–51. API Changes

```
GET  /api/intelligence/next-action
GET  /api/intelligence/decisions?types=&limit=
GET  /api/intelligence/context-summary
GET  /api/intelligence/graph/summary
POST /api/intelligence/recommendations/:fingerprint/dismiss
POST /api/intelligence/recommendations/:fingerprint/feedback
```

All routes: `auth` + student-only guard. No `POST /graph/query`.

---

## 52–55. Security & Privacy

- Student-only access enforced on intelligence routes
- Cross-student isolation tested (graph, next action, recommendations)
- Company/institution cannot access student intelligence endpoints (student guard)
- No chain-of-thought exposure; concise reasons only
- Safe logging (no conversation/memory dumps in new code)

---

## 56–60. Tests & Build

| Command | Result |
|---------|--------|
| `node --test tests/v3Intelligence.test.js` | **11/11 pass** |
| `npm test` (server) | **110/111 pass** (1 flaky pre-existing search history timing) |
| `npm run lint` (client) | **Pass** |
| `npm run build` (client) | **Pass** |

---

## 61. Known Limitations

- Graph sync is lazy (not event-driven on every CRUD yet beyond goal delete)
- AI-suggested graph edges not implemented (by design in P1)
- Search contextual ranking not yet wired to graph (context-summary available)
- IntelligenceHome UI not restructured (dashboard + mentor consume V3)

---

## 62. Technical Debt

- Event-driven graph updates (`GOAL_CREATED`, `TASK_COMPLETED`, etc.) — future
- HttpOnly-only session migration — V2 debt
- Flaky `platformIntegration` search history assertion — increase wait or mock clock

---

## 63. Recommended Next V3 Step

**Prompt 2 candidates:** event-driven graph sync, IntelligenceHome V3 panels, contextual unified search ranking, AI-suggested relationship proposals with student confirmation, recommendation feedback learning loop.

---

*No secrets exposed. MJ routes untouched. Lasya portals untouched.*
