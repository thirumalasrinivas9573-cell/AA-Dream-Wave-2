# MJ Orchestrator Developer Guide

## Quick Start

```bash
# List all agents
curl http://localhost:5001/api/mj/agents

# Get agent by ID
curl http://localhost:5001/api/mj/agents/agent_developer

# Execute single agent
curl -X POST http://localhost:5001/api/mj/agents/execute \
  -H "Content-Type: application/json" \
  -d '{"agentId":"agent_developer","task":{"title":"Review API design"}}'

# Run full orchestration via message
curl -X POST http://localhost:5001/api/mj/orchestrator/run \
  -H "Content-Type: application/json" \
  -d '{"message":"Build a React dashboard with backend API","userId":"u1"}'

# Orchestrator metrics
curl http://localhost:5001/api/mj/orchestrator/metrics
curl http://localhost:5001/api/mj/orchestrator/health
```

## Register Custom Agent

```bash
curl -X POST http://localhost:5001/api/mj/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "type": "custom_analyst",
    "name": "Custom Analyst Agent",
    "capabilities": ["analysis", "reports"],
    "supportedTasks": ["research"]
  }'
```

## Programmatic Access

```javascript
const { getMJ } = require('./src/mj/MJController')

const mj = getMJ()
mj.start()

// Execute via orchestrator
const result = await mj.runOrchestrator({
  plan: {
    tasks: [
      { id: 't1', title: 'Research competitors', agentType: 'research' },
      { id: 't2', title: 'Write summary', agentType: 'content_writer', dependencies: ['t1'] },
    ],
    mode: 'sequential',
  },
})

console.log(result.merged.summary)
```

## Extend an Agent

```javascript
const { SpecializedAgent } = require('./src/mj/agents/specialized/SpecializedAgent')

class MyAgent extends SpecializedAgent {
  async execute(task) {
    // Custom logic — still returns through MJ bus
    const base = await super.execute(task)
    return { ...base, output: 'Custom: ' + base.output }
  }
}
```

## Key Rules

1. **MJ is the executive** — never bypass the orchestrator
2. **No agent-to-agent messaging** — use `AgentCommunicationBus` via MJ only
3. **No auto-granted permissions** — request via `AgentPermissionManager`
4. **No filesystem/terminal/automation** in Sprint 6 — architecture hooks only

## Adding New Agent Types

1. Add type to `constants/MJConstants.js` → `AGENT_TYPES`
2. Add definition to `agents/definitions/AgentTypes.js`
3. Restart MJ — auto-registered via `AgentRegistry`

For custom behavior, extend `SpecializedAgent` and register via API or bootstrap.
