/**
 * MJ Gateway Request Pipeline
 * Every API request MUST pass through this pipeline — no endpoint bypasses it.
 *
 * Validation → Logging → Context Builder → Planner → Memory
 * → Agent Manager → Execution Queue → Response Builder → API Response
 *
 * @module mj/gateway/ApiRequestPipeline
 */

const { MJLogger } = require('../logger')
const { getMJ } = require('../MJController')
const { buildApiResponse } = require('./ApiResponse')
const { mapErrorToGateway, GatewayValidationError } = require('./ApiErrors')

const GATEWAY_STAGES = {
  VALIDATION: 'validation',
  LOGGING: 'logging',
  CONTEXT_BUILDER: 'context_builder',
  PLANNER: 'planner',
  MEMORY: 'memory',
  AGENT_MANAGER: 'agent_manager',
  EXECUTION_QUEUE: 'execution_queue',
  RESPONSE_BUILDER: 'response_builder',
  API_RESPONSE: 'api_response',
}

class ApiRequestPipeline {
  constructor() {
    this._logger = MJLogger.child('GatewayPipeline')
  }

  /**
   * Execute the full gateway pipeline for a request.
   * @param {Object} reqContext - { requestId, body, params, endpoint, handler }
   * @returns {Promise<Object>} Standardized API response
   */
  async execute(reqContext) {
    const startTime = Date.now()
    const warnings = []
    const stages = []

    const ctx = {
      requestId: reqContext.requestId,
      endpoint: reqContext.endpoint,
      method: reqContext.method,
      body: reqContext.body || {},
      params: reqContext.params || {},
      query: reqContext.query || {},
      gatewayContext: null,
      mjResult: null,
      payload: null,
      warnings,
      stages,
      _skipMjPipeline: reqContext._skipMjPipeline || false,
      _validator: reqContext._validator || null,
      _handler: reqContext._handler || null,
      _responseBuilder: reqContext._responseBuilder || null,
    }

    try {
      await this._runStage(GATEWAY_STAGES.VALIDATION, ctx, () => this._validate(ctx))
      await this._runStage(GATEWAY_STAGES.LOGGING, ctx, () => this._logRequest(ctx))
      await this._runStage(GATEWAY_STAGES.CONTEXT_BUILDER, ctx, () => this._buildContext(ctx))
      await this._runStage(GATEWAY_STAGES.PLANNER, ctx, () => this._plannerStage(ctx))
      await this._runStage(GATEWAY_STAGES.MEMORY, ctx, () => this._memoryStage(ctx))
      await this._runStage(GATEWAY_STAGES.AGENT_MANAGER, ctx, () => this._agentStage(ctx))
      await this._runStage(GATEWAY_STAGES.EXECUTION_QUEUE, ctx, () => this._executionStage(ctx))
      await this._runStage(GATEWAY_STAGES.RESPONSE_BUILDER, ctx, () => this._responseBuilderStage(ctx))
      await this._runStage(GATEWAY_STAGES.API_RESPONSE, ctx, () => this._apiResponseStage(ctx))

      const executionTime = Date.now() - startTime
      this._logger.performance(`Request ${ctx.requestId} completed`, {
        endpoint: ctx.endpoint,
        executionTime,
        stages: stages.length,
      })

      return buildApiResponse({
        success: true,
        requestId: ctx.requestId,
        executionTime,
        payload: ctx.payload,
        warnings,
        mjState: getMJ().getState(),
      })
    } catch (error) {
      const gatewayError = mapErrorToGateway(error)
      const executionTime = Date.now() - startTime

      this._logger.error(`Request ${ctx.requestId} failed`, {
        endpoint: ctx.endpoint,
        type: gatewayError.type,
        message: gatewayError.message,
        stage: stages[stages.length - 1] || 'unknown',
      })

      return buildApiResponse({
        success: false,
        requestId: ctx.requestId,
        executionTime,
        payload: null,
        errors: [gatewayError.toClientJSON()],
        warnings,
        mjState: getMJ().getState(),
      })
    }
  }

  async _runStage(name, ctx, fn) {
    const stageStart = Date.now()
    ctx.stages.push(name)
    this._logger.debug(`Stage: ${name}`, { requestId: ctx.requestId, endpoint: ctx.endpoint })
    await fn()
    const duration = Date.now() - stageStart
    if (duration > 100) {
      ctx.warnings.push({ stage: name, message: `Stage exceeded 100ms (${duration}ms)` })
    }
  }

  _validate(ctx) {
    if (ctx._validator) {
      const result = ctx._validator(ctx.body, ctx.params)
      if (!result.valid) {
        throw new GatewayValidationError(result.message, result.details)
      }
    }
  }

  _logRequest(ctx) {
    const safeBody = { ...ctx.body }
    delete safeBody.apiKey
    delete safeBody.token
    delete safeBody.password

    this._logger.info('Gateway request', {
      requestId: ctx.requestId,
      endpoint: ctx.endpoint,
      method: ctx.method,
      hasBody: Object.keys(safeBody).length > 0,
    })
  }

  _buildContext(ctx) {
    ctx.gatewayContext = {
      requestId: ctx.requestId,
      sessionId: ctx.body.sessionId || null,
      userId: ctx.body.userId || null,
      metadata: ctx.body.metadata || {},
      timestamp: Date.now(),
      endpoint: ctx.endpoint,
    }
  }

  async _plannerStage(ctx) {
    if (ctx._skipMjPipeline) return
    // Planner readiness check for process endpoint
    const mj = getMJ()
    if (!mj.getState().running) {
      mj.start()
    }
  }

  async _memoryStage(ctx) {
    if (ctx._skipMjPipeline) return
    ctx._memorySnapshot = await getMJ().getMemory()
  }

  async _agentStage(ctx) {
    if (ctx._skipMjPipeline) return
    ctx._agents = getMJ().getAllAgents()
  }

  async _executionStage(ctx) {
    if (ctx._handler) {
      ctx.mjResult = await ctx._handler(ctx)
    }
  }

  _responseBuilderStage(ctx) {
    if (ctx._responseBuilder) {
      ctx.payload = ctx._responseBuilder(ctx)
    } else if (ctx.mjResult !== undefined) {
      ctx.payload = ctx.mjResult
    }
  }

  _apiResponseStage(ctx) {
    // Final envelope built by execute() return
  }
}

module.exports = { ApiRequestPipeline, GATEWAY_STAGES }
