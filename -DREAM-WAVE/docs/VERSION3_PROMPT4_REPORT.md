# Version 3 Prompt 4 — AI Research & Knowledge Workspace Engineering Report

**Date:** 2026-08-03  
**Scope:** Student Research Workspace (Thirumala V3 P4)  
**Status:** Implemented, tested, production build verified

---

## 1. Executive Summary

Dream Wave now includes a **source-grounded AI Research & Knowledge Workspace** — not a generic chat clone. Students move from research question → project → sources → document indexing → grounded AI → notes → claims → citations → synthesis → report → knowledge connections.

Built on canonical systems: library chunking pattern, mentor context engine, knowledge graph, unified search. **Does not duplicate** Library, Mentor, Search, or Knowledge Graph.

**10/10 research tests pass.** **Client production build passes.**

---

## 2. P1/P2/P3 Baseline (Verified)

| Layer | Status | Reuse in P4 |
|-------|--------|-------------|
| V3 P1 Intelligence | WORKING | Graph edges, context engine, mentor integration |
| V3 P2 Concepts | PARTIAL (inline P3) | Not primary for research |
| V3 P3 Academics | WORKING | Parallel private notes pattern |
| Career R&D Reports | WORKING | Separate — career JSON reports, not student research workspace |
| Library document intelligence | WORKING | Chunking + citation pattern reused |
| Web research UI | PLACEHOLDER | Not used — built in canonical `client/` |

---

## 3. Architecture

```
ResearchProject (DRAFT | ACTIVE | COMPLETED | ARCHIVED)
  ├── question, topics, goalId, roadmapId, bookId, subjectId
  ├── researchPlan[] (confirmed steps)
  ├── synthesis, findings, report.sections[]
  └── connections (skills, careerRoles, learningActions)

ResearchSource → ResearchSourceChunk (indexed text)
ResearchNote (private)
ResearchClaim → citations[] (source-grounded)
```

**API:** `/api/research/*` (student auth)  
**Flag:** `RESEARCH_V3_ENABLED !== 'false'`

---

## 4. Files Created

### Models
- `server/models/ResearchProject.js`
- `server/models/ResearchSource.js`
- `server/models/ResearchSourceChunk.js`
- `server/models/ResearchNote.js`
- `server/models/ResearchClaim.js`

### Services
- `server/services/researchService.js`
- `server/services/researchDocumentService.js`
- `server/services/researchGroundingService.js`
- `server/services/researchSynthesisService.js`

### API
- `server/controllers/researchController.js`
- `server/routes/research.js`

### Client
- `client/src/modules/student/pages/ResearchHome.jsx`
- `client/src/modules/student/pages/ResearchWorkspace.jsx`
- `client/src/modules/student/styles/research.css`
- `client/src/shared/services/researchService.js`

### Tests & Docs
- `server/tests/v3Research.test.js`
- `docs/VERSION3_PROMPT4_REPORT.md`

---

## 5. Files Modified

- `server/models/KnowledgeGraphEdge.js` — `research_project`, `research_source` entities
- `server/server.js` — mount `/api/research`
- `server/services/studentContextEngine.js` — `RESEARCH_HELP` intent + context
- `server/controllers/searchController.js` — private research search providers
- `client/src/shared/services/api.js` — `researchApi`
- `client/src/modules/student/routes.jsx` — research routes
- `client/src/modules/student/layouts/StudentSidebar.jsx` — Research nav

**Lasya-owned files touched:** None

---

## 6. Key Features

| Feature | Implementation |
|---------|----------------|
| Research Project | CRUD with states, goal/roadmap/book links |
| Research Plan | AI propose → student confirm → apply |
| Sources | Text upload, hash dedup, chunk indexing |
| Grounded AI Chat | Excerpt retrieval + citation JSON (library pattern) |
| Notes | Private per project |
| Claims | With citation objects + confidence |
| Synthesis | Multi-source synthesis + connections |
| Report | Structured sections from synthesis |
| Citations | Never invented when no excerpts; confidence labels |
| Privacy | Student-scoped; cross-student isolation tested |
| Search | `research`, `research_projects` workspace types |
| Mentor | Research context in `RESEARCH_HELP` |

---

## 7. API Endpoints

| Method | Path |
|--------|------|
| GET | `/api/research/overview` |
| GET/POST | `/api/research/projects` |
| GET/PUT/DELETE | `/api/research/projects/:id` |
| POST | `/api/research/projects/:id/sources` |
| POST | `/api/research/projects/:id/notes` |
| POST | `/api/research/projects/:id/claims` |
| POST | `/api/research/projects/:id/plan/propose` |
| POST | `/api/research/projects/:id/plan/apply` |
| POST | `/api/research/projects/:id/chat` |
| POST | `/api/research/projects/:id/synthesize` |

---

## 8. Test Results

```
node --test tests/v3Research.test.js → 10/10 PASS
client npm run build → PASS
```

Tests cover: ownership, chunk indexing, hash dedup, notes/claims, graph edges, grounded chat fallback, plan proposal, synthesis structure, cross-student isolation.

---

## 9. Known Limitations

1. Source ingestion is text paste (PDF/OCR reuse from library not wired in UI yet)
2. Keyword retrieval only (no vector embeddings — matches library MVP)
3. R&D Reports page remains separate career-oriented tool
4. Research chat not persisted as conversation history (stateless per request)
5. Library book linking via `bookId` on project — auto-index from library not yet exposed in UI

---

## 10. Recommended V3 Prompt 5 Direction

**Cross-domain evidence orchestration:** unify research findings → concept mastery → portfolio projects → career skill evidence with explainable NBA and shareable (opt-in) portfolio artifacts.

---

## Final State

Dream Wave supports the research journey:

**QUESTION → PROJECT → SOURCES → RETRIEVAL → GROUNDED AI → NOTES → CLAIMS → CITATIONS → SYNTHESIS → REPORT → CONNECTIONS**

Student-controlled · Source-grounded · Private · Integrated · Production-oriented
