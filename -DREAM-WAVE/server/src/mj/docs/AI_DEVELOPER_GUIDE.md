# MJ AI Brain — Developer Guide

## Quick Start

```bash
# Set provider (uses existing Dream Wave OpenAI key)
export OPENAI_API_KEY=sk-your-key

# Start server
cd server && node server.js

# Test reasoning
curl -X POST http://localhost:5001/api/mj/process \
  -H "Content-Type: application/json" \
  -d '{"message":"Create a deployment plan for my Node.js app","userId":"u1"}'
```

## Programmatic Usage

```javascript
const MJ = require('./src/mj')

MJ.start()

const result = await MJ.processCommand('Help me learn Python for data science', {
  userId: 'user123',
  sessionId: 'session_abc',
})

// Structured reasoning output
const reasoning = result.context.reasoningResult
console.log(reasoning.intent)           // { type: 'learning', confidence: 0.85 }
console.log(reasoning.goal)             // { primary: '...', complexity: 'medium' }
console.log(reasoning.executionPlan)    // { tasks: [...], taskCount: 5 }
console.log(reasoning.recommendedAgents)// [{ type: 'teacher', reason: '...' }]
console.log(reasoning.response)         // COO-level response text
```

## Direct AI Brain Access

```javascript
const { getAIBrain } = require('./src/mj/brain')

const brain = getAIBrain().initialize()
const status = brain.getStatus()
console.log(status.providers)  // Available providers

// Run reasoning pipeline directly
const result = await brain.reasoningPipeline.execute({
  command: { id: 'cmd_1', input: 'Build a marketing campaign', userId: 'u1' },
  context: { sessionId: 's1' },
  memories: [],
  correlationId: 'corr_1',
})
```

## Adding a Custom Provider

```javascript
const { IAIProvider, MODEL_CAPABILITIES } = require('./src/mj/ai/interfaces')
const { getAIBrain } = require('./src/mj/brain')

class MyProvider extends IAIProvider {
  get name() { return 'my_provider' }
  get capabilities() { return [MODEL_CAPABILITIES.CHAT_COMPLETION] }
  isAvailable() { return true }

  async chatCompletion(messages, options) {
    // Your implementation
    return { content: '...', provider: this.name, usage: { totalTokens: 100 } }
  }

  async structuredJSON(messages) {
    const result = await this.chatCompletion(messages)
    return { ...result, data: JSON.parse(result.content) }
  }
}

getAIBrain().registry.register('my_provider', new MyProvider())
```

## Custom Prompts

```javascript
const { getPromptManager } = require('./src/mj/brain/prompts')

getPromptManager().register('custom', 'You are a specialized agent for {{domain}}...')
const prompt = getPromptManager().get('custom', { domain: 'healthcare' })
```

## Observability

```javascript
const { getAIObservability } = require('./src/mj/brain/observability/AIObservability')

const metrics = getAIObservability().getMetrics()
console.log(metrics.avgLatencyMs, metrics.providerUsage, metrics.errorRate)
```

## Token Tracking

```javascript
const { getTokenManager } = require('./src/mj/brain/tokens/TokenManager')

console.log(getTokenManager().getTotals())
// { inputTokens, outputTokens, totalTokens, estimatedCost }
```

## Config Override

```javascript
const { getConfig } = require('./src/mj/config')

getConfig().update('ai', {
  primaryProvider: 'gemini',
  fallbackProvider: 'openai',
})
```

## Testing Without API Keys

MJ works without any API keys using rule-based fallbacks:

```javascript
const result = await MJ.processCommand('Help me learn React')
// intent: 'learning' (rules, confidence: 0.8)
// tasks: 3 (rule-based decomposition)
// response: structured fallback with setup instructions
```

## Debugging

Enable debug logging — all MJ subsystems log with `[MJ:*]` prefix:

```
[MJ:ReasoningPipeline] Reasoning stage: intent_detection
[MJ:IntentEngine] Intent classified (rules) { intent: 'learning', confidence: 0.8 }
[MJ:ExecutionStrategy] Execution strategy built { type: 'immediate', agents: 2 }
```

Check health endpoint for AI Brain status:

```bash
curl http://localhost:5001/api/mj/health | jq '.payload.aiBrain'
```
