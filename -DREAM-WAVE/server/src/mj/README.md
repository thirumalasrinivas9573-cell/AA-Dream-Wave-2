# MJ — Personal AI Operating System

**Version:** 0.3.0-alpha  
**Status:** AI Brain & Reasoning Engine (Sprint 3)  
**Location:** `server/src/mj/`  
**API Base:** `http://localhost:5001/api/mj`

MJ is the next-generation Personal AI Operating System for Dream Wave AI. This module is **isolated** from existing Dream Wave features — no changes to auth, MongoDB, Firebase, UI, or existing API routes.

---

## Quick Start

### API (Recommended)

```bash
# Process a message
curl -X POST http://localhost:5001/api/mj/process \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello MJ","sessionId":"sess_1","userId":"user_1"}'

# Check status
curl http://localhost:5001/api/mj/status
```

### Programmatic

```javascript
const MJ = require('./src/mj')

// Lifecycle
MJ.start()
MJ.wake()

// Process a command through the central pipeline
const result = await MJ.processCommand('Hello MJ')
console.log(result.response)

// State & memory
console.log(MJ.getState())
console.log(MJ.getMemory())

// Agents
console.log(MJ.getActiveAgents())

MJ.stop()
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/mj/process` | Process user message through MJ pipeline |
| GET | `/api/mj/status` | MJ state, agents, version, uptime |
| GET | `/api/mj/health` | Subsystem health check |
| GET | `/api/mj/agents` | All registered agents |
| GET | `/api/mj/memory` | Memory store statistics |
| POST | `/api/mj/wake` | Transition to listening state |
| POST | `/api/mj/sleep` | Transition to sleeping state |
| POST | `/api/mj/reset` | Reset MJ runtime (not Dream Wave data) |

Full API docs: [docs/API.md](./docs/API.md)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      MJController                           │
│              (Single Entry Point)                           │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                       MJCore                                │
│  StateMachine │ EventBus │ LifecycleHooks │ Config          │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                 ProcessingPipeline                          │
│                                                             │
│  User Input → Context Analyzer → Conversation Manager       │
│  → Planner → Memory Lookup → Reasoning Engine               │
│  → Agent Selection → Execution Queue → Response Builder     │
│  → Frontend                                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Folder Structure

| Folder | Purpose |
|--------|---------|
| `core/` | MJCore orchestrator, bootstrap, ProcessingPipeline |
| `brain/` | ReasoningEngine, BrainContext |
| `planner/` | Task decomposition, priority, graphs, retry/fallback |
| `memory/` | 9 memory store interfaces (no implementation) |
| `conversation/` | ConversationManager for dialogue sessions |
| `agents/` | AgentRegistry, AgentSelector, 18 agent definitions |
| `context/` | ContextAnalyzer for input/environment analysis |
| `events/` | EventBus, MJ event constants |
| `state/` | StateMachine with 14 states |
| `services/` | ExecutionQueue, ResponseBuilder, Cache, Stream, Parallel |
| `types/` | Command, Response, Plan, Pipeline context factories |
| `utils/` | Shared utilities |
| `config/` | Config schemas (OpenAI, Gemini, Voice, etc.) — no connections |
| `middleware/` | Future Express middleware stub |
| `logger/` | Enterprise structured logging |
| `constants/` | All MJ constants |
| `errors/` | Typed errors + centralized ErrorHandler |
| `interfaces/` | Public integration contracts |
| `hooks/` | Lifecycle extension hooks |
| `security/` | PermissionManager, CapabilityManager |
| `gateway/` | API Gateway — orchestrator, pipeline, middleware, errors |
| `ai/` | AI Provider layer — OpenAI, Gemini, fallback, interfaces |
| `brain/` | Reasoning pipeline, intent, goals, prompts, tokens, observability |
| `docs/` | Architecture, developer, extension guides, API reference |

---

## API Reference

| Method | Description |
|--------|-------------|
| `MJ.start()` | Start MJ subsystems |
| `MJ.stop()` | Stop MJ |
| `MJ.sleep()` | Put MJ to sleep |
| `MJ.wake()` | Wake MJ from sleep |
| `MJ.processCommand(input, options)` | Process through central pipeline |
| `MJ.getState()` | Current state snapshot |
| `MJ.getMemory()` | Memory store snapshot |
| `MJ.clearMemory()` | Clear all memory stores |
| `MJ.registerAgent(agent)` | Register custom agent |
| `MJ.unregisterAgent(type)` | Unregister agent |
| `MJ.getActiveAgents()` | List active agents |

---

## Documentation

- [AI Brain Architecture](./docs/AI_BRAIN.md) — Reasoning pipeline, providers, structured responses
- [AI Developer Guide](./docs/AI_DEVELOPER_GUIDE.md) — Setup, providers, debugging
- [API Documentation](./docs/API.md) — Endpoints, request/response examples
- [Developer Guide](./docs/DEVELOPER_GUIDE.md) — Setup, conventions, testing
- [Extension Guide](./docs/EXTENSION_GUIDE.md) — How to extend MJ
- [Roadmap](./docs/ROADMAP.md) — Future sprint plan

---

## Isolation Guarantee

- Mounted at `/api/mj` only — **one new route** added to `server.js`
- Does **not** use Dream Wave JWT auth middleware
- Does **not** connect to MongoDB, Firebase, or OpenAI
- Dream Wave existing routes continue working exactly as before
