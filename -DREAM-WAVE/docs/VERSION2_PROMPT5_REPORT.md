# Dream Wave AI — Version 2 Prompt 5 Engineering Report

**Owner:** Thirumala Srinivas  
**Scope:** Smart Digital Library, Goal-to-Books, AI Reading Assistant, Knowledge Organization  
**Status:** Complete

---

## 1. Files Inspected

- `server/models/LibraryBook.js`, `LibraryProgress.js`, `LibraryAnnotation.js`, `LibraryReadingSession.js`
- `server/controllers/libraryController.js`, `server/routes/library.js`
- `server/services/goalIntelligenceService.js`, `mentorContextEngine.js`, `recommendationEngine.js`
- `client/src/modules/digital-library/*` (LibraryHome, PdfReader, BookDetail, LibraryWorkspace)
- `client/src/modules/student/pages/Books.jsx`, `GoalWorkspace.jsx`
- `server/tests/libraryKnowledgeCenter.test.js`
- Legacy (not modified): `server/routes/books.js`, `web/` Next.js catalog

## 2. Files Created

### Backend
- `server/models/LibraryDocumentChunk.js`
- `server/services/libraryDocumentService.js`
- `server/services/libraryReadingAssistantService.js`
- `server/services/libraryResourceService.js`
- `server/controllers/libraryIntelligenceController.js`
- `server/tests/libraryIntelligence.test.js`

### Frontend
- `client/src/modules/digital-library/components/ReadingAssistantPanel.jsx`
- `client/src/modules/digital-library/components/LibraryIntelligence.jsx`

## 3. Files Modified

- `server/models/LibraryBook.js` — student owner, resourceType, processingStatus, user-uploaded license
- `server/models/LibraryProgress.js` — readingStatus enum
- `server/models/Goal.js` — bookId/source on resource links
- `server/models/Roadmap.js` — libraryBookIds on learning stages
- `server/controllers/libraryController.js` — PDF access for private uploads, readingStatus sync, user-uploaded license
- `server/routes/library.js` — intelligence routes + PDF upload
- `client/src/shared/services/api.js` — extended `libraryApi`
- `client/src/modules/digital-library/pages/LibraryHome.jsx` — My Library, goal/roadmap sections
- `client/src/modules/digital-library/pages/PdfReader.jsx` — indexing, Knowledge Tools, Reading Assistant
- `client/src/modules/digital-library/pages/BookDetail.jsx` — wired Knowledge Tools
- `client/src/modules/digital-library/styles/library.css` — assistant + resource styles
- `client/src/modules/student/components/goals/GoalWorkspace.jsx` — library recommendations panel

## 4. Files Removed

None.

## 5. Canonical Library Architecture

**Production path:** `libraryApi` → `/api/library` → MongoDB library models → `client/src/modules/digital-library/*` + `student/pages/Books.jsx`

| Entity | Canonical Model |
|--------|-----------------|
| Catalog resources | `LibraryBook` |
| User reading state | `LibraryProgress` (unique userId+bookId) |
| Annotations | `LibraryAnnotation` |
| Reading sessions | `LibraryReadingSession` |
| Document chunks (RAG) | `LibraryDocumentChunk` |
| Collections | `LibraryCollection` |

Legacy `/api/books` (Google Books) and `web/` static catalog remain untouched.

## 6. Duplicate/Legacy Findings

| Item | Status |
|------|--------|
| `LibraryProgress` embedded bookmarks/notes | LEGACY — unused; `LibraryAnnotation` is canonical |
| `/api/books` | LEGACY — not modified |
| `web/` knowledge catalog | DUPLICATED — out of scope |
| `LibraryWorkspace.KnowledgeTools` placeholder | Replaced by `LibraryIntelligence.jsx` |

## 7. Resource Data Model

Extended `LibraryBook` with: `resourceType`, `processingStatus`, `indexedAt`, `uploadedBy`, `ownerType: student`

## 8. Resource Provenance Model

Existing `license` block preserved + `user-uploaded` type. `libraryResourceService.accessLabel()` maps to: PUBLIC_DOMAIN, OPEN_ACCESS, USER_UPLOADED, INSTITUTION_LICENSED, EXTERNAL_LINK, METADATA_ONLY, INTERNAL_RESOURCE

## 9. Copyright/Access Controls

- No fake PDFs or download links
- `getPdf` validates student ownership for private uploads
- Download only when `license.allowDownload`
- External URLs require HTTPS in production
- Path traversal blocked on local PDF serving

## 10. Library Home

Upgraded with: Continue Reading (existing), **My Library**, **For Your Goals**, **Roadmap Resources**, Recommended, collections (existing)

## 11. Search Implementation

- Existing paginated `/library/search` and `/library/books` retained
- New `/library/resources/search` with filters
- New `/library/search/natural` — NL query → structured search (AI optional)

## 12. My Library

`GET /library/my` — saved, reading, completed, archived, recently viewed, uploaded (student docs)

## 13. Reading Progress

Existing `LibraryProgress` + auto `readingStatus` on save (saved/reading/completed)

## 14. Document Reader

Existing `PdfReader.jsx` upgraded: auto-index on first open, re-index button, AI tools panel, reading assistant tab

## 15. Private File Security

- Student uploads stored under `uploads/library/user-{userId}/`
- PDF access checks `ownerType === 'student'` ownership
- Cross-user reading assistant returns 403

## 16. User Upload System

`POST /library/uploads` — PDF only, 15MB max, multer memory → secure path write, `user-uploaded` license

## 17. Goal-to-Books Engine

`libraryResourceService.recommendForGoal()` — deterministic text/category/tag matching from goal + roadmap context with explanations

## 18. Roadmap Resource Mapping

`learningStages[].libraryBookIds[]` + `recommendForRoadmap()` + `linkResourceToRoadmapStage()`

## 19. Milestone Resource Mapping

Goal resources endpoint supports `?milestone=` for milestone-scoped recommendations

## 20. Recommendation Engine

Hybrid: deterministic DB search first; AI used only for NL search parsing and reading assistant (not on home load)

## 21. AI Reading Assistant

`POST /library/books/:id/reading-assistant` — chunk retrieval + grounded JSON response with citations

## 22. Document Retrieval Pipeline

Extract (client page text) → chunk (900 chars) → store `LibraryDocumentChunk` → keyword/text retrieve → AI context

## 23. Source-Grounding Controls

- `sourceGrounded` flag in response
- Explicit message when excerpts don't support answer
- Separate `generalNote` for non-document knowledge

## 24. Notes

Existing `LibraryAnnotation` type `note` — unchanged, private per user

## 25. Highlights

Existing `LibraryAnnotation` highlight/underline — unchanged

## 26. Bookmarks

Existing `LibraryAnnotation` bookmark + progress bookmarks — canonical via annotations API

## 27. Revision/Practice Foundation

- `POST /library/books/:id/practice-questions`
- `POST /library/books/:id/revision-cards` (requires student approval before save)

## 28. Planner Integration

`POST /library/reading/schedule` — creates canonical Task + optional ScheduleItem via plannerService

## 29. Focus Mode Integration

Reading sessions recorded via existing `LibraryReadingSession`; focus can be started from tasks created by schedule endpoint

## 30. AI Mentor Integration

Existing mentor library context retained; reading progress already in `mentorContextEngine`

## 31. Security Controls

- Auth on all private endpoints
- userId-scoped queries
- Upload type validation (PDF only)
- Path traversal prevention
- Prompt injection treated as untrusted document content

## 32. Privacy Controls

Private uploads, notes, highlights, progress, assistant history — student-scoped only

## 33. Prompt-Injection Controls

System prompt declares document text untrusted; injection test included in suite

## 34. Performance Improvements

- Paginated search unchanged
- Chunk indexing capped at 500 pages
- AI not called on library home load
- Document index reused (`processingStatus: ready`)

## 35. Database Changes

- New collection: `librarydocumentchunks`
- Extended: `librarybooks`, `libraryprogresses`, `goals`, `roadmaps`

## 36. API Changes

New routes under `/api/library`:
- `GET /my`, `GET /home/enriched`
- `GET /resources/search`, `POST /search/natural`
- `GET /goals/:goalId/resources`, `POST /goals/:goalId/link`
- `GET /roadmaps/:roadmapId/resources`, `POST /roadmaps/:roadmapId/link`
- `POST /books/:id/index`, `GET /books/:id/processing`
- `POST /books/:id/reading-assistant`, `/practice-questions`, `/revision-cards`
- `POST /reading/schedule`, `POST /uploads`

## 37. Tests Actually Executed

| Suite | Result |
|-------|--------|
| `libraryIntelligence.test.js` | **8/8 passed** |
| `libraryKnowledgeCenter.test.js` | **5/5 passed** |
| `planner.test.js` | **8/8 passed** |
| `goalIntelligence.test.js` | **7/7 passed** |
| Mentor tests | **12/12 passed** |
| Client lint | **0 errors** |
| Client build | **Success** |

## 38. Build Results

Client production build succeeded (PdfReader chunk ~479KB).

## 39. Known Limitations

- No vector embeddings — keyword/text index retrieval only
- Document indexing requires client-side text extraction (first 80 pages auto-indexed)
- NL search AI parsing optional without OpenAI key
- Institution resource display depends on Lasya's published collections (read-only consumption)
- Revision cards not persisted to DB yet (preview + approval flow only)

## 40. Technical Debt

- Remove unused embedded arrays from `LibraryProgress` schema (safe deprecation)
- Add vector embeddings when scale requires
- Persist approved revision cards to student study collection
- Wire `Books.jsx` Discover to NL search endpoint
- Consolidate legacy `/api/books` references in `web/` app (separate cleanup)

---

**Prompt 5 completion criteria:** met. Library is copyright-safe, goal-connected, and AI-grounded without fake resources.
