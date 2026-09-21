# MJ Persistent Memory Engine (Sprint 4)

**Version:** 0.4.0-alpha  
**Module:** `server/src/mj/memory/`

## Overview

The MJ Persistent Memory Engine provides user-isolated, category-separated memory across conversations and sessions. It integrates with the central Processing Pipeline and exposes isolated REST endpoints under `/api/mj/memory/*`.

Dream Wave collections, auth, UI, and existing routes are **not modified**.

---

## Memory Layers

| Layer | Category | Collection | Persistence |
|-------|----------|------------|-------------|
| Working Memory | `working` | In-memory Map | Session TTL |
| Conversation Memory | `conversation` | `mj_conversations` | MongoDB |
| Project Memory | `project` | `mj_projects` | MongoDB |
| Task Memory | `task` | `mj_tasks` | MongoDB |
| Learning Memory | `learning` | `mj_learning` | MongoDB |
| Preference Memory | `preference` | `mj_preferences` | MongoDB |
| Knowledge Memory | `knowledge` | `mj_memory` | MongoDB |
| System Memory | `system` | `mj_memory` | MongoDB |

---

## Memory Pipeline

Every user request through `/api/mj/process` follows:

```
Receive Request
    ↓
Search Relevant Memory (MemoryRetrievalService)
    ↓
Rank Results (MemoryScorer)
    ↓
Inject Relevant Context (MemoryPipeline)
    ↓
Run AI Reasoning (ReasoningPipeline)
    ↓
Generate Response
    ↓
Summarize Interaction
    ↓
Store New Memory (MemoryStorageService)
    ↓
Update Existing Memory (access counts, recency)
```

Implementation: `memory/pipeline/MemoryPipeline.js`

---

## Retrieval Flow

1. **Keyword search** — regex across content, summary, tags, title, topic, name
2. **Category filter** — optional category/project/session scoping
3. **Ranking** — composite score from importance, recency, keyword match, access count
4. **Pagination** — `page` and `limit` parameters
5. **Semantic search** — extension point only (`SemanticSearchInterface.js`)

---

## Memory Scoring

Each memory document includes:

- `importanceScore` (0–1)
- `recencyScore` (computed at retrieval)
- `accessCount`
- `confidence`
- `category`, `tags`
- `createdAt`, `updatedAt`
- `expirationPolicy`, `expiresAt`

Ranking formula: `MemoryScorer.rankScore()`

---

## Storage Strategy

- Uses Dream Wave's existing Mongoose connection (`memory/db/connection.js`)
- **Separate collection names only** — never touches Dream Wave models
- In-memory fallback when MongoDB is unavailable
- Working memory is runtime-only (cleared on reset, not persisted)

---

## Memory Lifecycle

| Policy | Behavior |
|--------|----------|
| `never` | Permanent until archived/deleted |
| `session` | Expires after 24h |
| `daily` | Expires after 24h |
| `weekly` | Expires after 7 days |
| `monthly` | Expires after 30 days |

**Consolidation** (`MemoryConsolidator.js`):

- Merge duplicate memories
- Summarize long conversations
- Archive old sessions
- Expire temporary memories
- Daily/weekly summary generation (hooks ready)

---

## Security

- Every memory belongs to one `userId`
- `MemorySecurity.validateUserScope()` blocks cross-user access
- Content sanitization (length limits, control char removal)
- Encryption hooks prepared for sensitive fields
- Workspace permission hooks prepared for future shared workspaces

---

## API Endpoints

All under `/api/mj` — isolated from Dream Wave routes.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/memory` | Architecture snapshot + metrics |
| GET | `/memory/search?userId=&q=` | Keyword search |
| GET | `/memory/recent?userId=` | Recent memories |
| GET | `/memory/projects?userId=&projectId=` | Project-scoped memories |
| GET | `/memory/preferences?userId=` | User preferences |
| POST | `/memory/save` | Save new memory |
| POST | `/memory/update` | Update existing memory |
| POST | `/memory/archive` | Soft-archive memory |
| POST | `/memory/delete` | Hard-delete memory |

---

## Observability

`MemoryObservability` tracks:

- Memory retrieval time
- Memory save time
- Storage size per category
- Most accessed memories
- Memory growth
- Retrieval result counts

Access via `GET /api/mj/memory` → `metrics` field or `GET /api/mj/health` → `memory.metrics`.

---

## Extension Guide

### Vector DB (Future)

Implement `SemanticSearchInterface.search()` to return ranked results compatible with `_toResult()` format.

### Redis Cache (Future)

Add cache layer in `MemoryRetrievalService.search()` before MongoDB queries.

### Shared Workspaces (Future)

Extend `MemorySecurity.checkWorkspacePermission()` and add `workspaceId` to base schema.

### Custom Memory Categories

1. Add category to `memory/constants.js`
2. Add Mongoose model if new collection needed
3. Extend `MemoryStorageService.save()` switch
4. Extend `MemoryRetrievalService.search()` queries

---

## File Structure

```
memory/
├── MemoryEngine.js          # Orchestrator
├── constants.js             # Categories, collections, policies
├── pipeline/
│   └── MemoryPipeline.js    # Search → Rank → Inject → Store
├── retrieval/
│   ├── MemoryRetrievalService.js
│   └── SemanticSearchInterface.js
├── storage/
│   └── MemoryStorageService.js
├── scoring/
│   └── MemoryScorer.js
├── consolidation/
│   └── MemoryConsolidator.js
├── security/
│   └── MemorySecurity.js
├── observability/
│   └── MemoryObservability.js
├── models/
│   └── index.js             # Mongoose models + indexes
└── db/
    ├── connection.js
    └── baseSchema.js
```

See also: `MEMORY_SCHEMA.md`
