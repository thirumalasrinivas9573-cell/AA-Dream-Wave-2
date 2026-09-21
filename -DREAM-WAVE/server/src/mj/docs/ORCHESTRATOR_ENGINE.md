# MJ Multi-Agent Orchestration Platform (Sprint 6)

**Version:** 0.6.0-alpha  
**Module:** `server/src/mj/orchestrator/`

## Overview

MJ operates as the **Chief Executive AI** — not an agent itself. MJ analyzes requests, plans work, selects specialists, supervises execution, validates results, merges outputs, and presents one final answer.

All agent communication flows through MJ. **No direct agent-to-agent communication.**

---

## Architecture

```
User Request
    ↓
Intent Detection (AI Brain)
    ↓
Goal Analysis
    ↓
Task Decomposition
    ↓
Capability Matching
    ↓
Agent Selection
    ↓
Execution Plan + Dependency Graph
    ↓
Task Execution Engine
    ↓
Result Validation
    ↓
Merge Results
    ↓
Final Response
```

---

## Core Components

| Component | Purpose |
|-----------|---------|
| `AgentOrchestrator` | Central executive coordinator |
| `WorkflowEngine` | Full multi-agent workflow pipeline |
| `TaskExecutionEngine` | Queue, retry, parallel/sequential execution |
| `CapabilityMatcher` | Match tasks to agent capabilities |
| `DependencyResolver` | Task dependency graphs |
| `AgentCommunicationBus` | MJ-routed messaging (no A2A) |
| `ResultAggregator` | Validate and merge agent outputs |
| `PerformanceEngine` | Execution metrics and utilization |
| `HealthMonitor` | Agent heartbeat and health |
| `AgentPermissionManager` | Centrally managed permissions |

---

## Default Agents (30)

Developer, Backend, Frontend, UI/UX Designer, Three.js, Animation, Research, Learning, Teacher, Resume, Marketing, SEO, Business Strategy, Finance, Legal Knowledge, Health Advisor, Security Assistant, Deployment, Testing, Documentation, Translation, R&D Report, Content Writer, Prompt Engineering, Data Analysis, Video, Automation, Mobile (future), Desktop (future), Robotics (future)

Each agent includes: ID, name, description, version, capabilities, priority, health, metrics, supported tasks, execution limits.

---

## Execution States

`queued` → `preparing` → `waiting` → `running` → `completed` | `failed` | `timed_out` | `cancelled` | `paused` | `retrying`

---

## Agent Communication Bus

Message types: `request`, `response`, `broadcast`, `progress`, `completion`, `failure`, `heartbeat`, `status`, `cancellation`

All messages route through MJ:
- MJ → Agent: `sendToAgent()`
- Agent → MJ: `receiveFromAgent()`

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/agents` | List all agents |
| GET | `/agents/:id` | Get agent by ID |
| POST | `/agents/register` | Register custom agent |
| POST | `/agents/unregister` | Unregister agent |
| POST | `/agents/execute` | Execute single agent task |
| POST | `/orchestrator/run` | Run full orchestration |
| GET | `/orchestrator/status` | Orchestrator status |
| GET | `/orchestrator/metrics` | Performance metrics |
| GET | `/orchestrator/health` | Agent health monitor |

---

## Permissions (Architecture)

Permissions are **not auto-granted**. Agents must request:
- Internet, Database, Filesystem, Terminal, Email, Calendar, Search, API, Local Automation

Managed by `AgentPermissionManager` with approval hooks.

---

## Security (Prepared)

- RBAC hooks
- Agent sandboxing architecture
- Capability isolation
- Audit logging via observability timeline
- Permission approval workflow
- Secret management (no keys in agent responses)

---

## File Structure

```
orchestrator/
├── AgentOrchestrator.js
├── constants.js
├── bus/AgentCommunicationBus.js
├── matching/CapabilityMatcher.js
├── execution/TaskExecutionEngine.js
├── execution/DependencyResolver.js
├── workflow/WorkflowEngine.js
├── aggregation/ResultAggregator.js
├── performance/PerformanceEngine.js
├── health/HealthMonitor.js
├── permissions/AgentPermissionManager.js
└── observability/OrchestratorObservability.js

agents/
├── AgentRegistry.js
├── AgentSelector.js
├── specialized/SpecializedAgent.js
└── definitions/AgentTypes.js
```

See also: `ORCHESTRATOR_DEVELOPER_GUIDE.md`
