/**
 * MJ Gateway Orchestrator
 * Coordinates all MJ API endpoints through the gateway pipeline.
 * @module mj/gateway/GatewayOrchestrator
 */

const { getMJ } = require('../MJController')
const { MJ_VERSION, MJ_STATES } = require('../constants')
const { MJLogger } = require('../logger')
const { ApiRequestPipeline } = require('./ApiRequestPipeline')
const { buildApiResponse } = require('./ApiResponse')
const { GatewayValidationError, GatewayPipelineError, mapErrorToGateway } = require('./ApiErrors')

function resolveUserId(source = {}) {
  return source.userId || source['x-user-id'] || source['X-User-Id'] || null
}

class GatewayOrchestrator {
  constructor() {
    this._logger = MJLogger.child('Gateway')
    this._pipeline = new ApiRequestPipeline()
    this._bootstrapped = false
  }

  _ensureStarted() {
    if (!this._bootstrapped) {
      getMJ().start()
      this._bootstrapped = true
    }
  }

  /**
   * Wrap an endpoint handler through the gateway pipeline.
   * @param {string} endpoint
   * @param {Object} options
   * @returns {Function} Express async handler
   */
  createHandler(endpoint, options = {}) {
    return async (req, res) => {
      const startTime = Date.now()

      try {
        const pipelineContext = {
          requestId: req.mjRequestId,
          endpoint,
          method: req.method,
          body: req.body || {},
          params: req.params || {},
          query: req.query || {},
          _skipMjPipeline: options.skipMjPipeline || false,
          _validator: options.validator || null,
          _handler: options.handler || null,
          _responseBuilder: options.responseBuilder || null,
        }

        const response = await this._pipeline.execute(pipelineContext)
        const errorType = response.errors[0]?.type
        let statusCode = 200
        if (!response.success) {
          if (errorType === 'validation') statusCode = 400
          else if (errorType === 'pipeline') statusCode = 502
          else statusCode = 500
        }
        return res.status(statusCode).json(response)
      } catch (error) {
        const gatewayError = mapErrorToGateway(error)
        this._logger.error(`Unhandled gateway error on ${endpoint}`, { message: gatewayError.message })

        return res.status(gatewayError.statusCode).json(buildApiResponse({
          success: false,
          requestId: req.mjRequestId,
          executionTime: Date.now() - startTime,
          errors: [gatewayError.toClientJSON()],
          mjState: getMJ().getState(),
        }))
      }
    }
  }

  /** POST /api/mj/process */
  processHandler() {
    return this.createHandler('process', {
      validator: (body) => {
        if (!body.message || typeof body.message !== 'string' || !body.message.trim()) {
          return { valid: false, message: 'message is required and must be a non-empty string' }
        }
        if (body.message.length > 10000) {
          return { valid: false, message: 'message exceeds maximum length of 10000 characters' }
        }
        return { valid: true }
      },
      handler: async (ctx) => {
        this._ensureStarted()
        const mj = getMJ()

        const result = await mj.processCommand(ctx.body.message, {
          userId: ctx.body.userId || null,
          sessionId: ctx.body.sessionId || null,
          metadata: ctx.body.metadata || {},
          correlationId: ctx.requestId,
          context: {
            sessionId: ctx.body.sessionId || undefined,
            userId: ctx.body.userId || undefined,
          },
        })

        if (!result.success) {
          throw new GatewayPipelineError(result.error || 'Pipeline processing failed')
        }

        return {
          commandId: result.context?.command?.id,
          response: result.response,
          reasoning: result.response?.structured || result.context?.reasoningResult || null,
          plan: result.context?.plan ? {
            id: result.context.plan.id,
            taskCount: result.context.plan.tasks?.length || 0,
            source: result.context.plan.source || 'planner',
          } : null,
          agent: result.context?.selectedAgent || null,
          correlationId: ctx.requestId,
        }
      },
    })
  }

  /** GET /api/mj/status */
  statusHandler() {
    return this.createHandler('status', {
      skipMjPipeline: true,
      handler: async () => {
        this._ensureStarted()
        const mj = getMJ()
        return {
          state: mj.getState(),
          agents: {
            registered: mj.getAllAgents().length,
            active: mj.getActiveAgents().length,
          },
          health: 'operational',
          version: mj.getVersion(),
          uptime: mj.getUptime(),
        }
      },
    })
  }

  /** GET /api/mj/health */
  healthHandler() {
    return this.createHandler('health', {
      skipMjPipeline: true,
      handler: async () => {
        this._ensureStarted()
        return getMJ().getHealth()
      },
    })
  }

  /** GET /api/mj/agents */
  agentsHandler() {
    return this.createHandler('agents', {
      skipMjPipeline: true,
      handler: async () => {
        this._ensureStarted()
        const mj = getMJ()
        return {
          architecture: 'multi_agent_orchestration',
          version: MJ_VERSION,
          agents: mj.getAllAgents(),
          total: mj.getAllAgents().length,
          active: mj.getActiveAgents().length,
        }
      },
    })
  }

  /** GET /api/mj/agents/:id */
  agentByIdHandler() {
    return this.createHandler('agents/:id', {
      skipMjPipeline: true,
      handler: async (ctx) => {
        this._ensureStarted()
        const agentId = ctx.params?.id || ctx.query?.id
        if (!agentId) throw new GatewayValidationError('agent id is required')
        const agent = getMJ().getAgentById(agentId)
        if (!agent) throw new GatewayValidationError('Agent not found')
        return { agent }
      },
    })
  }

  /** POST /api/mj/agents/register */
  agentRegisterHandler() {
    return this.createHandler('agents/register', {
      skipMjPipeline: true,
      validator: (body) => {
        if (!body.type || !body.name) return { valid: false, message: 'type and name are required' }
        return { valid: true }
      },
      handler: async (ctx) => {
        this._ensureStarted()
        const { SpecializedAgent } = require('../agents/specialized/SpecializedAgent')
        const agent = new SpecializedAgent({
          id: ctx.body.id || `agent_${ctx.body.type}_${Date.now()}`,
          type: ctx.body.type,
          name: ctx.body.name,
          description: ctx.body.description || '',
          capabilities: ctx.body.capabilities || [],
          supportedTasks: ctx.body.supportedTasks || [],
          priority: ctx.body.priority ?? 5,
        })
        return { agent: getMJ().registerAgent(agent), registered: true }
      },
    })
  }

  /** POST /api/mj/agents/unregister */
  agentUnregisterHandler() {
    return this.createHandler('agents/unregister', {
      skipMjPipeline: true,
      validator: (body) => {
        if (!body.type) return { valid: false, message: 'type is required' }
        return { valid: true }
      },
      handler: async (ctx) => {
        this._ensureStarted()
        return { unregistered: getMJ().unregisterAgent(ctx.body.type) }
      },
    })
  }

  /** POST /api/mj/agents/execute */
  agentExecuteHandler() {
    return this.createHandler('agents/execute', {
      skipMjPipeline: true,
      validator: (body) => {
        if (!body.agentId) return { valid: false, message: 'agentId is required' }
        return { valid: true }
      },
      handler: async (ctx) => {
        this._ensureStarted()
        const { agentId, task, context } = ctx.body
        return getMJ().executeAgent(agentId, task || {}, context || {})
      },
    })
  }

  /** POST /api/mj/orchestrator/run */
  orchestratorRunHandler() {
    return this.createHandler('orchestrator/run', {
      skipMjPipeline: true,
      validator: (body) => {
        if (!body.message && !body.plan) return { valid: false, message: 'message or plan is required' }
        return { valid: true }
      },
      handler: async (ctx) => {
        this._ensureStarted()
        const mj = getMJ()
        if (ctx.body.message) {
          const result = await mj.processCommand(ctx.body.message, {
            userId: ctx.body.userId,
            sessionId: ctx.body.sessionId,
            metadata: { orchestrator: true },
          })
          return {
            success: result.success,
            response: result.response,
            orchestration: result.context?.orchestrationResult || null,
            agents: result.context?.selectedAgents || [],
          }
        }
        return mj.runOrchestrator({ plan: ctx.body.plan, context: ctx.body.context || {} })
      },
    })
  }

  /** GET /api/mj/orchestrator/status */
  orchestratorStatusHandler() {
    return this.createHandler('orchestrator/status', {
      skipMjPipeline: true,
      handler: async () => {
        this._ensureStarted()
        return getMJ().getOrchestratorStatus()
      },
    })
  }

  /** GET /api/mj/orchestrator/metrics */
  orchestratorMetricsHandler() {
    return this.createHandler('orchestrator/metrics', {
      skipMjPipeline: true,
      handler: async () => {
        this._ensureStarted()
        return getMJ().getOrchestratorMetrics()
      },
    })
  }

  /** GET /api/mj/orchestrator/health */
  orchestratorHealthHandler() {
    return this.createHandler('orchestrator/health', {
      skipMjPipeline: true,
      handler: async () => {
        this._ensureStarted()
        return getMJ().getOrchestratorHealth()
      },
    })
  }

  /** GET /api/mj/memory */
  memoryHandler() {
    return this.createHandler('memory', {
      skipMjPipeline: true,
      handler: async () => {
        this._ensureStarted()
        const mj = getMJ()
        const snapshot = await mj.getMemory()
        const stores = Object.entries(snapshot).map(([type, store]) => ({
          type,
          description: store.description,
          count: store.count,
          persistence: store.persistence ?? false,
          status: 'ready',
        }))
        const { isDbReady } = require('../memory/db/connection')
        return {
          architecture: 'persistent',
          version: MJ_VERSION,
          persistence: isDbReady(),
          stores,
          totalStores: stores.length,
          metrics: mj.getMemoryMetrics(),
        }
      },
    })
  }

  /** GET /api/mj/memory/search */
  memorySearchHandler() {
    return this.createHandler('memory/search', {
      skipMjPipeline: true,
      handler: async (ctx) => {
        this._ensureStarted()
        const userId = resolveUserId({ ...ctx.query, ...ctx.params, ...ctx.body })
        const q = ctx.query?.q || ctx.body?.q || ''
        if (!userId) throw new GatewayValidationError('userId is required')
        return getMJ().searchMemory({
          userId,
          query: q,
          category: ctx.query?.category || ctx.body?.category || null,
          projectId: ctx.query?.projectId || ctx.body?.projectId || null,
          sessionId: ctx.query?.sessionId || ctx.body?.sessionId || null,
          limit: parseInt(ctx.query?.limit || ctx.body?.limit || '20', 10),
          page: parseInt(ctx.query?.page || ctx.body?.page || '1', 10),
        })
      },
    })
  }

  /** GET /api/mj/memory/recent */
  memoryRecentHandler() {
    return this.createHandler('memory/recent', {
      skipMjPipeline: true,
      handler: async (ctx) => {
        this._ensureStarted()
        const userId = resolveUserId({ ...ctx.query, ...ctx.params, ...ctx.body })
        if (!userId) throw new GatewayValidationError('userId is required')
        const limit = parseInt(ctx.query?.limit || ctx.body?.limit || '10', 10)
        return getMJ().getRecentMemory(userId, limit)
      },
    })
  }

  /** GET /api/mj/memory/projects */
  memoryProjectsHandler() {
    return this.createHandler('memory/projects', {
      skipMjPipeline: true,
      handler: async (ctx) => {
        this._ensureStarted()
        const userId = resolveUserId({ ...ctx.query, ...ctx.params, ...ctx.body })
        const projectId = ctx.query?.projectId || ctx.body?.projectId
        if (!userId) throw new GatewayValidationError('userId is required')
        if (!projectId) throw new GatewayValidationError('projectId is required')
        return getMJ().getProjectMemory(userId, projectId)
      },
    })
  }

  /** GET /api/mj/memory/preferences */
  memoryPreferencesHandler() {
    return this.createHandler('memory/preferences', {
      skipMjPipeline: true,
      handler: async (ctx) => {
        this._ensureStarted()
        const userId = resolveUserId({ ...ctx.query, ...ctx.params, ...ctx.body })
        if (!userId) throw new GatewayValidationError('userId is required')
        return getMJ().getPreferenceMemory(userId)
      },
    })
  }

  /** POST /api/mj/memory/save */
  memorySaveHandler() {
    return this.createHandler('memory/save', {
      skipMjPipeline: true,
      validator: (body) => {
        if (!body.userId) return { valid: false, message: 'userId is required' }
        if (!body.content && !body.value) return { valid: false, message: 'content or value is required' }
        return { valid: true }
      },
      handler: async (ctx) => {
        this._ensureStarted()
        const actorUserId = ctx.body.userId
        const saved = await getMJ().saveMemory(ctx.body, actorUserId)
        return { memory: saved, saved: true }
      },
    })
  }

  /** POST /api/mj/memory/update */
  memoryUpdateHandler() {
    return this.createHandler('memory/update', {
      skipMjPipeline: true,
      validator: (body) => {
        if (!body.userId) return { valid: false, message: 'userId is required' }
        if (!body.memoryId) return { valid: false, message: 'memoryId is required' }
        return { valid: true }
      },
      handler: async (ctx) => {
        this._ensureStarted()
        const { memoryId, userId, collection, ...updates } = ctx.body
        const updated = await getMJ().updateMemory(memoryId, updates, userId, collection || 'mj_memory')
        return { memory: updated, updated: !!updated }
      },
    })
  }

  /** POST /api/mj/memory/archive */
  memoryArchiveHandler() {
    return this.createHandler('memory/archive', {
      skipMjPipeline: true,
      validator: (body) => {
        if (!body.userId) return { valid: false, message: 'userId is required' }
        if (!body.memoryId) return { valid: false, message: 'memoryId is required' }
        return { valid: true }
      },
      handler: async (ctx) => {
        this._ensureStarted()
        const { memoryId, userId, collection } = ctx.body
        const archived = await getMJ().archiveMemory(memoryId, userId, collection || 'mj_memory')
        return { memory: archived, archived: !!archived }
      },
    })
  }

  /** POST /api/mj/memory/delete */
  memoryDeleteHandler() {
    return this.createHandler('memory/delete', {
      skipMjPipeline: true,
      validator: (body) => {
        if (!body.userId) return { valid: false, message: 'userId is required' }
        if (!body.memoryId) return { valid: false, message: 'memoryId is required' }
        return { valid: true }
      },
      handler: async (ctx) => {
        this._ensureStarted()
        const { memoryId, userId, collection } = ctx.body
        return getMJ().deleteMemory(memoryId, userId, collection || 'mj_memory')
      },
    })
  }

  /** GET /api/mj/voice/status */
  voiceStatusHandler() {
    return this.createHandler('voice/status', {
      skipMjPipeline: true,
      handler: async (ctx) => {
        this._ensureStarted()
        const userId = resolveUserId({ ...ctx.query, ...ctx.body })
        return getMJ().getVoiceStatus(userId)
      },
    })
  }

  /** POST /api/mj/voice/wake */
  voiceWakeHandler() {
    return this.createHandler('voice/wake', {
      skipMjPipeline: true,
      validator: (body) => {
        if (!body.userId) return { valid: false, message: 'userId is required' }
        return { valid: true }
      },
      handler: async (ctx) => {
        this._ensureStarted()
        return getMJ().voiceWake(ctx.body.userId, {
          sessionId: ctx.body.sessionId,
        })
      },
    })
  }

  /** POST /api/mj/voice/sleep */
  voiceSleepHandler() {
    return this.createHandler('voice/sleep', {
      skipMjPipeline: true,
      handler: async (ctx) => {
        this._ensureStarted()
        return getMJ().voiceSleep(ctx.body?.sessionId)
      },
    })
  }

  /** POST /api/mj/voice/listen */
  voiceListenHandler() {
    return this.createHandler('voice/listen', {
      skipMjPipeline: true,
      validator: (body) => {
        if (!body.userId) return { valid: false, message: 'userId is required' }
        if (!body.transcript && !body.audio) {
          return { valid: false, message: 'transcript or audio is required' }
        }
        return { valid: true }
      },
      handler: async (ctx) => {
        this._ensureStarted()
        return getMJ().processVoiceInput({
          userId: ctx.body.userId,
          sessionId: ctx.body.sessionId,
          transcript: ctx.body.transcript,
          audio: ctx.body.audio,
          metadata: ctx.body.metadata || {},
        })
      },
    })
  }

  /** POST /api/mj/voice/stop */
  voiceStopHandler() {
    return this.createHandler('voice/stop', {
      skipMjPipeline: true,
      handler: async (ctx) => {
        this._ensureStarted()
        return getMJ().voiceStop(ctx.body?.sessionId)
      },
    })
  }

  /** GET /api/mj/voice/settings */
  voiceSettingsGetHandler() {
    return this.createHandler('voice/settings', {
      skipMjPipeline: true,
      handler: async (ctx) => {
        this._ensureStarted()
        const userId = resolveUserId({ ...ctx.query, ...ctx.body })
        if (!userId) throw new GatewayValidationError('userId is required')
        return { settings: getMJ().getVoiceSettings(userId) }
      },
    })
  }

  /** PUT /api/mj/voice/settings */
  voiceSettingsPutHandler() {
    return this.createHandler('voice/settings', {
      skipMjPipeline: true,
      validator: (body) => {
        if (!body.userId) return { valid: false, message: 'userId is required' }
        return { valid: true }
      },
      handler: async (ctx) => {
        this._ensureStarted()
        const { userId, ...updates } = ctx.body
        return { settings: getMJ().updateVoiceSettings(userId, updates) }
      },
    })
  }

  /** POST /api/mj/voice/speak */
  voiceSpeakHandler() {
    return this.createHandler('voice/speak', {
      skipMjPipeline: true,
      validator: (body) => {
        if (!body.userId) return { valid: false, message: 'userId is required' }
        if (!body.text || typeof body.text !== 'string') {
          return { valid: false, message: 'text is required' }
        }
        return { valid: true }
      },
      handler: async (ctx) => {
        this._ensureStarted()
        const { userId, text, sessionId } = ctx.body
        return getMJ().voiceSpeak(text, userId, { sessionId })
      },
    })
  }

  /** POST /api/mj/wake */
  wakeHandler() {
    return this.createHandler('wake', {
      skipMjPipeline: true,
      handler: async () => {
        this._ensureStarted()
        const result = getMJ().wake()
        return {
          ...result,
          state: MJ_STATES.LISTENING,
          message: 'MJ transitioned to listening state',
        }
      },
    })
  }

  /** POST /api/mj/sleep */
  sleepHandler() {
    return this.createHandler('sleep', {
      skipMjPipeline: true,
      handler: async () => {
        this._ensureStarted()
        const result = getMJ().sleep()
        return {
          ...result,
          state: MJ_STATES.SLEEPING,
          message: 'MJ transitioned to sleeping state',
        }
      },
    })
  }

  /** POST /api/mj/reset */
  resetHandler() {
    return this.createHandler('reset', {
      skipMjPipeline: true,
      handler: async () => getMJ().reset(),
    })
  }
}

let _instance = null

function getGateway() {
  if (!_instance) _instance = new GatewayOrchestrator()
  return _instance
}

module.exports = { GatewayOrchestrator, getGateway }
