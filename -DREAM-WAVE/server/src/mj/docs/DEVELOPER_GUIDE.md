# MJ Developer Guide

## Prerequisites

- Node.js >= 16
- Dream Wave server dependencies installed (`cd server && npm install`)

## Module Location

```
server/src/mj/
```

## Import Patterns

### Singleton (Recommended)

```javascript
const MJ = require('./src/mj')

await MJ.processCommand('test')
```

### Controller Instance

```javascript
const { MJController } = require('./src/mj')

const mj = new MJController()
mj.start()
```

### Subsystem Access

```javascript
const MJ = require('./src/mj')

// Direct subsystem access for advanced use
const { EventBus, getEventBus } = MJ.events
const { StateMachine, MJ_STATES } = MJ.state
const { MemoryEngine } = MJ.memory
const { Planner } = MJ.planner
```

## Lifecycle

```javascript
const MJ = require('./src/mj')

// 1. Start
MJ.start()  // Bootstraps all subsystems, emits mj:started

// 2. Process commands
const result = await MJ.processCommand('Hello', { userId: 'user123' })

// 3. Sleep/Wake (future voice integration)
MJ.sleep()
MJ.wake()

// 4. Stop
MJ.stop()   // Emits mj:stopped
```

## Event Subscriptions

```javascript
const MJ = require('./src/mj')
const { MJ_EVENTS } = MJ.constants

MJ.start()

const bus = MJ.controller.getEventBus()

const unsubscribe = bus.onEvent(MJ_EVENTS.PLAN_CREATED, (payload) => {
  console.log('Plan created:', payload.data)
})

// Wildcard listener
bus.onAll((payload) => {
  console.log('Event:', payload.type)
})
```

## Lifecycle Hooks

```javascript
const MJ = require('./src/mj')

MJ.start()

MJ.controller.getHooks().register('onCommand', (command) => {
  console.log('Command received:', command.id)
})

MJ.controller.getHooks().register('onStart', () => {
  console.log('MJ is ready')
})
```

## Custom Agent Registration

```javascript
const { BaseAgent } = require('./src/mj/agents')

class MyCustomAgent extends BaseAgent {
  constructor() {
    super({
      id: 'agent_custom',
      type: 'custom',
      name: 'My Custom Agent',
      capabilities: ['custom_action'],
    })
    this.activate()
  }

  async execute(task) {
    return { success: true, result: 'custom stub' }
  }
}

MJ.registerAgent(new MyCustomAgent())
```

## Error Handling

```javascript
const { ValidationError, getErrorHandler } = require('./src/mj/errors')

try {
  await MJ.processCommand('')
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Validation failed:', error.message)
  }
}

// Custom error handler
getErrorHandler().registerHandler('ai', (error, context) => {
  console.log('AI error handled:', error.code)
})
```

## Logging

```javascript
const { MJLogger, MJLoggerClass } = require('./src/mj/logger')

// Use default logger instance
MJLogger.info('Hello')
MJLogger.ai('AI operation', { model: 'gpt-4' })
MJLogger.planner('Planning task')

// Create namespaced logger
const log = new MJLoggerClass('MyExtension')
log.debug('Debug message')
```

## Config (Future)

```javascript
const { getConfig } = require('./src/mj/config')

const config = getConfig()
config.load({
  openai: { enabled: true, model: 'gpt-4' },
  memory: { enabled: true },
})

console.log(config.get('openai'))
```

## Testing MJ in Isolation

```bash
cd server
node -e "
const MJ = require('./src/mj');
MJ.start();
MJ.processCommand('test').then(r => {
  console.log(JSON.stringify(r, null, 2));
  MJ.stop();
});
"
```

## Conventions

1. **No bypassing the pipeline** — All user input goes through `ProcessingPipeline`
2. **Events over direct coupling** — Use EventBus for cross-subsystem communication
3. **Interfaces first** — Implement `IAgent`, `IMemoryStore` contracts
4. **Stubs are OK** — This sprint is architecture only; stubs return empty/safe defaults
5. **No external connections** — Do not wire MongoDB, OpenAI, or Firebase in foundation code
6. **Namespace logging** — Use `MJLogger.child('YourComponent')` for all new components

## File Naming

| Type | Pattern | Example |
|------|---------|---------|
| Class | PascalCase | `AgentRegistry.js` |
| Constants | PascalCase | `MJConstants.js` |
| Index | `index.js` | Re-exports |
| Interfaces | `I` prefix | `IAgent`, `IMemoryStore` |

## Adding a New Subsystem

1. Create folder under `server/src/mj/your-subsystem/`
2. Add `index.js` with exports
3. Register in `core/bootstrap.js` if needed
4. Wire into `ProcessingPipeline` if it's a pipeline stage
5. Export from `server/src/mj/index.js`
6. Document in `docs/ARCHITECTURE.md`

## Dream Wave Integration (Future Sprint)

When ready to expose MJ via API:

```javascript
// server/routes/mj.js (NEW FILE — do not modify existing routes)
const express = require('express')
const router = express.Router()
const MJ = require('../src/mj')

router.post('/command', async (req, res) => {
  const result = await MJ.processCommand(req.body.input, { userId: req.user?.id })
  res.json(result)
})

module.exports = router
```

Then in `server.js`, add ONE new line:
```javascript
app.use('/api/mj', require('./routes/mj'))
```

This is a future sprint task — **not done in foundation sprint**.
