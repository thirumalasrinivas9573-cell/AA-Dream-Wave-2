/**
 * MJ Reasoning Pipeline
 * Every command MUST flow through this — no AI response bypasses it.
 *
 * Receive → Intent → Goal → Context → Memory → Constraints
 * → Task Decomposition → Agent Planning → Priority → Execution Strategy
 * → Response Generation → Structured JSON
 *
 * @module mj/brain/ReasoningPipeline
 */

const { REASONING_PIPELINE_STAGES, REASONING_STAGES } = require('../ai/constants')
const { IntentEngine } = require('./IntentEngine')
const { GoalAnalyzer } = require('./GoalAnalyzer')
const { ConstraintAnalyzer } = require('./ConstraintAnalyzer')
const { BrainTaskDecomposer } = require('./TaskDecomposer')
const { ExecutionStrategy } = require('./ExecutionStrategy')
const { PromptGuard } = require('./security/PromptGuard')
const { AICacheLayer } = require('./cache/AICacheLayer')
const { getPromptManager } = require('./prompts')
const { getTokenManager } = require('./tokens/TokenManager')
const { getAIObservability } = require('./observability/AIObservability')
const { AIResponseBuilder } = require('./response/AIResponseBuilder')
const { MJLogger } = require('../logger')

class ReasoningPipeline {
  /**
   * @param {import('../ai/FallbackManager').FallbackManager} fallbackManager
   */
  constructor(fallbackManager) {
    this._fallback = fallbackManager
    this._logger = MJLogger.child('ReasoningPipeline')
    this._intentEngine = new IntentEngine(fallbackManager)
    this._goalAnalyzer = new GoalAnalyzer(fallbackManager)
    this._constraintAnalyzer = new ConstraintAnalyzer()
    this._taskDecomposer = new BrainTaskDecomposer(fallbackManager)
    this._executionStrategy = new ExecutionStrategy()
    this._promptGuard = new PromptGuard()
    this._cache = new AICacheLayer()
    this._prompts = getPromptManager()
    this._tokens = getTokenManager()
    this._observability = getAIObservability()
    this._responseBuilder = new AIResponseBuilder()
  }

  /**
   * Execute full reasoning pipeline.
   * @param {Object} params
   * @returns {Promise<Object>} Structured AI response
   */
  async execute(params = {}) {
    const { command, context, memories, correlationId } = params
    const requestId = correlationId || command?.id

    const trace = this._observability.startPipeline(requestId)
    this._tokens.startRequest(requestId)
    const warnings = []
    const reasoningTrace = []

    const result = {
      requestId,
      stages: {},
    }

    try {
      // 1. Receive Request
      await this._stage(REASONING_PIPELINE_STAGES.RECEIVE_REQUEST, trace, result, async () => {
        const guard = this._promptGuard.validate(command?.input || '')
        if (!guard.safe) warnings.push(...guard.warnings)
        result.sanitizedInput = guard.sanitized
        result.stages.receive = { inputLength: guard.sanitized.length }
      })

      const input = result.sanitizedInput

      // 2. Intent Detection
      await this._stage(REASONING_PIPELINE_STAGES.INTENT_DETECTION, trace, result, async () => {
        result.intent = await this._intentEngine.classify(input, context)
        this._recordUsage(requestId, result.intent.usage)
        reasoningTrace.push({ stage: REASONING_STAGES.UNDERSTAND, detail: `Intent: ${result.intent.intent}` })
      })

      // 3. Goal Identification
      await this._stage(REASONING_PIPELINE_STAGES.GOAL_IDENTIFICATION, trace, result, async () => {
        result.goal = await this._goalAnalyzer.analyze(input, result.intent, context)
        this._recordUsage(requestId, result.goal.usage)
        reasoningTrace.push({ stage: REASONING_STAGES.PLAN, detail: result.goal.primaryGoal })
      })

      // 4. Context Analysis
      await this._stage(REASONING_PIPELINE_STAGES.CONTEXT_ANALYSIS, trace, result, async () => {
        result.context = {
          ...context,
          sessionId: context?.sessionId,
          userId: command?.userId || context?.userId,
          intent: result.intent.intent,
        }
      })

      // 5. Memory Lookup
      await this._stage(REASONING_PIPELINE_STAGES.MEMORY_LOOKUP, trace, result, async () => {
        result.memories = memories || []
        reasoningTrace.push({ stage: REASONING_STAGES.RESEARCH, detail: `${result.memories.length} memories found` })
      })

      // 6. Constraint Analysis
      await this._stage(REASONING_PIPELINE_STAGES.CONSTRAINT_ANALYSIS, trace, result, async () => {
        result.constraints = this._constraintAnalyzer.analyze({
          command, context, goal: result.goal, memories: result.memories,
          metadata: command?.metadata,
        })
        if (result.constraints.blockers?.length) {
          warnings.push(...result.constraints.blockers)
        }
        reasoningTrace.push({ stage: REASONING_STAGES.EVALUATE, detail: 'Constraints evaluated' })
      })

      // 7. Task Decomposition
      await this._stage(REASONING_PIPELINE_STAGES.TASK_DECOMPOSITION, trace, result, async () => {
        const decomposed = await this._taskDecomposer.decompose(result.goal, result.intent, context)
        result.tasks = decomposed.tasks
        result.executionGraph = decomposed.executionGraph
        this._recordUsage(requestId, decomposed.usage)
        reasoningTrace.push({ stage: REASONING_STAGES.PLAN, detail: `${result.tasks.length} tasks created` })
      })

      // 8. Agent Planning + 9. Priority + 10. Execution Strategy
      await this._stage(REASONING_PIPELINE_STAGES.AGENT_PLANNING, trace, result, async () => {
        result.executionPlan = this._executionStrategy.build({
          goal: result.goal,
          intent: result.intent,
          tasks: result.tasks,
          executionGraph: result.executionGraph,
          constraints: result.constraints,
        })
        this._observability.recordAgentSelection(result.executionPlan.recommendedAgents)
        reasoningTrace.push({ stage: REASONING_STAGES.COMPARE, detail: 'Agent strategy compared' })
      })

      await this._stage(REASONING_PIPELINE_STAGES.PRIORITY_CALCULATION, trace, result, async () => {
        result.tasks = (result.tasks || []).map((t, i) => ({
          ...t,
          priority: t.priority || (result.tasks.length - i),
        }))
      })

      await this._stage(REASONING_PIPELINE_STAGES.EXECUTION_STRATEGY, trace, result, async () => {
        result.stages.executionStrategy = result.executionPlan
      })

      // 11. Response Generation — MJ thinks before answering
      await this._stage(REASONING_PIPELINE_STAGES.RESPONSE_GENERATION, trace, result, async () => {
        reasoningTrace.push({ stage: REASONING_STAGES.VERIFY, detail: 'Verifying plan before response' })

        const cacheKey = `resp:${input.slice(0, 100)}`
        const cached = this._cache.getResponse(cacheKey)
        if (cached) {
          result.aiResponse = cached
          result.stages.responseGeneration = { cached: true }
          return
        }

        const promptType = this._mapIntentToPrompt(result.intent.intent)
        const messages = this._prompts.buildMessages(promptType, this._buildResponsePrompt(input, result), context)

        const aiResult = await this._fallback.execute('chatCompletion', messages, {
          temperature: 0.7,
          maxTokens: 2048,
        })

        this._recordUsage(requestId, aiResult.usage)

        const outputGuard = this._promptGuard.validateOutput(aiResult.content || '')
        if (outputGuard.warnings?.length) warnings.push(...outputGuard.warnings)

        result.aiResponse = {
          content: outputGuard.content || this._buildFallbackResponse(result),
          provider: aiResult.usedProvider,
          fallbackUsed: aiResult.fallbackUsed,
          model: aiResult.model,
        }

        if (outputGuard.content) {
          this._cache.setResponse(cacheKey, result.aiResponse)
        }

        reasoningTrace.push({ stage: REASONING_STAGES.RESPOND, detail: 'Response generated' })
      })

      // 12. Return Structured JSON
      await this._stage(REASONING_PIPELINE_STAGES.RETURN_STRUCTURED, trace, result, async () => {
        const tokenSummary = this._tokens.finalize(requestId)
        this._observability.recordRequest({
          latencyMs: trace.totalMs,
          totalTokens: tokenSummary?.totalTokens,
          provider: result.aiResponse?.provider,
        })

        result.structured = this._responseBuilder.build({
          requestId,
          intent: result.intent,
          goal: result.goal,
          reasoningTrace,
          executionPlan: result.executionPlan,
          tasks: result.tasks,
          executionGraph: result.executionGraph,
          aiResponse: result.aiResponse,
          tokenSummary,
          warnings,
          metadata: {
            provider: result.aiResponse?.provider,
            fallbackUsed: result.aiResponse?.fallbackUsed,
            pipelineTrace: this._observability.endPipeline(trace),
          },
        })
      })

      return result.structured
    } catch (error) {
      this._logger.error('Reasoning pipeline failed', { requestId, message: error.message })
      this._observability.recordRequest({ error: true })

      return this._responseBuilder.buildError({
        requestId,
        error: error.message,
        warnings,
        partial: result,
      })
    }
  }

  async _stage(name, trace, result, fn) {
    this._observability.recordStage(trace, name)
    this._logger.debug(`Reasoning stage: ${name}`, { requestId: result.requestId })
    result.stages[name] = { startedAt: Date.now() }
    await fn()
    result.stages[name].completedAt = Date.now()
  }

  _recordUsage(requestId, usage) {
    if (usage) this._tokens.record(requestId, usage)
  }

  _mapIntentToPrompt(intent) {
    const map = {
      coding: 'developer', research: 'research', learning: 'learning',
      planning: 'planning', reports: 'report', resume: 'resume',
    }
    return map[intent] || 'system'
  }

  _buildResponsePrompt(input, result) {
    return `As MJ AI Chief Operating Officer, respond to this request strategically.

USER REQUEST: "${input}"

ANALYSIS:
- Intent: ${result.intent?.intent} (confidence: ${result.intent?.confidence})
- Primary Goal: ${result.goal?.primaryGoal}
- Complexity: ${result.goal?.estimatedComplexity}
- Tasks: ${result.tasks?.length || 0} sub-tasks identified
- Recommended Agents: ${result.executionPlan?.recommendedAgents?.map(a => a.type).join(', ')}

Provide an executive-level response that:
1. Acknowledges the goal
2. Outlines your strategic approach
3. Lists key action steps
4. Recommends next actions

Do NOT give a shallow chatbot reply. Think like a COO.`
  }

  _buildFallbackResponse(result) {
    return `I've analyzed your request as a **${result.intent?.intent}** task with ${result.intent?.confidence ? Math.round(result.intent.confidence * 100) : 0}% confidence.

**Primary Goal:** ${result.goal?.primaryGoal || 'Process your request'}

**Execution Plan:** ${result.tasks?.length || 0} tasks identified with ${result.executionPlan?.recommendedAgents?.length || 0} recommended specialist agents.

**Recommended Agents:** ${result.executionPlan?.recommendedAgents?.map(a => a.type).join(', ') || 'developer'}

**Estimated Time:** ~${result.executionPlan?.estimatedTimeMinutes || 15} minutes

Configure an AI provider (OPENAI_API_KEY or GEMINI_API_KEY) for full intelligent responses.`
  }

  getObservability() { return this._observability }
  getCache() { return this._cache }
}

module.exports = { ReasoningPipeline, REASONING_PIPELINE_STAGES }
