# MJ Extension Guide

This guide explains how to extend MJ without breaking Dream Wave or the core architecture.

---

## Extension Points

| Extension Point | Location | Use Case |
|----------------|----------|----------|
| Lifecycle Hooks | `hooks/LifecycleHooks` | onStart, onStop, onCommand, onError |
| Event Bus | `events/EventBus` | Subscribe to any MJ event |
| Agent Registry | `agents/AgentRegistry` | Register custom agents |
| Memory Stores | `memory/interfaces/` | Implement IMemoryStore |
| Pipeline Stages | `core/ProcessingPipeline` | Add new pipeline stages |
| Error Handlers | `errors/ErrorHandler` | Custom error type handlers |
| Config Sections | `config/schemas/` | Add new config schemas |
| Middleware | `middleware/MJMiddleware` | Express integration |

---

## 1. Creating a Custom Agent

```javascript
const { BaseAgent } = require('./src/mj/agents')

class ResearchAgent extends BaseAgent {
  constructor() {
    super({
      id: 'agent_research_custom',
      type: 'research',
      name: 'Advanced Research Agent',
      capabilities: ['web_search', 'summarize', 'cite_sources'],
    })
  }

  async execute(task) {
    // Future: implement research logic
    return {
      success: true,
      agentType: this.type,
      taskId: task.id,
      result: null,
    }
  }

  async isAvailable() {
    return this._active
  }
}

// Register
MJ.registerAgent(new ResearchAgent())
MJ.agents.agentRegistry.activate('research')
```

**Contract:** Extend `BaseAgent` or implement `IAgent` fully.

---

## 2. Implementing a Memory Store

```javascript
const { IMemoryStore } = require('./src/mj/memory/interfaces')
const { MEMORY_TYPES } = require('./src/mj/constants')

class MongoLongTermMemory extends IMemoryStore {
  get type() { return MEMORY_TYPES.LONG_TERM }

  async store(id, entry) {
    // Future: persist to MongoDB
  }

  async retrieve(id) {
    // Future: fetch from MongoDB
  }

  async search(query) {
    // Future: vector/semantic search
  }

  async clear(id) {
    // Future: delete
  }

  async count() {
    // Future: count documents
  }
}
```

**Integration:** Replace store in `MemoryEngine._initializeStores()` during bootstrap override.

---

## 3. Adding Pipeline Stages

To add a stage (e.g., "Safety Filter") without bypassing the pipeline:

```javascript
// In ProcessingPipeline._getStages(), insert after CONTEXT_ANALYZER:

{
  name: 'safety_filter',
  handler: async (ctx) => {
    // Future: content moderation
    ctx.safetyPassed = true
  },
},
```

**Rule:** Never create alternate code paths that skip the pipeline.

---

## 4. Subscribing to Events

```javascript
const { getEventBus, MJ_EVENTS } = require('./src/mj/events')

const bus = getEventBus()

// React to plan creation
bus.onEvent(MJ_EVENTS.PLAN_CREATED, async (payload) => {
  const { planId, commandId } = payload.data
  // Future: persist plan, notify frontend
})

// React to errors
bus.onEvent(MJ_EVENTS.ERROR_OCCURRED, (payload) => {
  // Future: send to monitoring service
})
```

---

## 5. Adding Config Providers

```javascript
// config/schemas/index.js — add new schema
function myServiceConfig() {
  return {
    provider: 'my_service',
    apiKey: null,
    enabled: false,
  }
}

// config/MJConfig.js — add to _buildDefaults()
myService: schemas.myServiceConfig(),
```

---

## 6. Custom Error Types

```javascript
const { MJError } = require('./src/mj/errors')
const { ERROR_TYPES } = require('./src/mj/constants')

class RateLimitError extends MJError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      type: 'rate_limit',
      code: 'MJ_RATE_LIMIT',
      recoverable: true,
    })
    this.name = 'RateLimitError'
  }
}

// Register handler
const { getErrorHandler } = require('./src/mj/errors')
getErrorHandler().registerHandler('rate_limit', (error) => {
  // Future: implement backoff
})
```

---

## 7. Voice Integration (Future)

When implementing voice, hook into existing architecture:

```
Voice Input → MJ.processCommand(transcript)
  → State: listening → thinking
  → Pipeline (unchanged)
  → State: responding → speaking
  → Emit VOICE_STARTED / VOICE_STOPPED
```

Enable via:
```javascript
MJ.security.permissionManager.grant('microphone')
MJ.security.capabilityManager.set('voice', true)
```

---

## 8. Automation Integration (Future)

```
Automation Request → MJ.processCommand(command)
  → PermissionManager.request('automation')
  → CapabilityManager.isEnabled('automation')
  → Agent: automation agent selected
  → ExecutionQueue processes automation tasks
```

---

## 9. Multi-Agent Orchestration (Future)

The planner already supports:
- `DependencyGraph` for task ordering
- `ExecutionGraph` for stage tracking
- `ParallelExecutor` for concurrent agent execution
- `multiAgentReady: true` on plans

Future implementation:
```javascript
const results = await parallelExecutor.executeMultiAgent([
  { agentType: 'backend', task: task1 },
  { agentType: 'frontend', task: task2 },
])
```

---

## 10. Frontend Integration (Future)

Response from pipeline is standardized:

```javascript
{
  success: true,
  context: { /* full pipeline context */ },
  response: {
    id: 'res_...',
    commandId: 'cmd_...',
    content: '...',
    metadata: { planId, agentType, correlationId },
    success: true,
    timestamp: 1234567890
  }
}
```

Stream via `StreamService` for real-time UI updates.

---

## Anti-Patterns

| Don't | Do Instead |
|-------|-----------|
| Call OpenAI directly from a route | Route through ReasoningEngine in pipeline |
| Store memory in controller | Use MemoryEngine stores |
| Hardcode agent selection | Use AgentSelector with registry |
| Skip pipeline for "simple" commands | Always use processCommand() |
| Modify existing Dream Wave files | Create new files under src/mj/ |
| Import MJ in server.js now | Wait for dedicated mj route sprint |

---

## Checklist for New Extensions

- [ ] Implements existing interface (IAgent, IMemoryStore, etc.)
- [ ] Uses MJLogger with namespace
- [ ] Emits appropriate MJ events
- [ ] Handles errors via ErrorHandler
- [ ] Respects StateMachine transitions
- [ ] Does not modify existing Dream Wave code
- [ ] Documented in docs/ARCHITECTURE.md
