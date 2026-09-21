/**
 * MJ Central Processing Pipeline
 * Every request MUST flow through this pipeline — nothing bypasses it.
 *
 * User Input → Context Analyzer → Conversation Manager → Planner
 * → Memory Lookup → Reasoning Engine → Agent Selection
 * → Execution Queue → Response Builder → Frontend
 *
 * @module mj/core/ProcessingPipeline
 */

const { PIPELINE_STAGES, MJ_EVENTS, MJ_STATES } = require('../constants')
const { ContextAnalyzer } = require('../context')
const { ConversationManager } = require('../conversation')
const { Planner } = require('../planner')
const { MemoryEngine } = require('../memory')
const { ReasoningEngine } = require('../brain')
const { AgentSelector } = require('../agents/AgentSelector')
const { ExecutionQueue, ResponseBuilder } = require('../services')
const { createPipelineContext } = require('../types')
const { getEventBus } = require('../events')
const { MJLogger } = require('../logger')
const { getErrorHandler } = require('../errors')

class ProcessingPipeline {
  /**
   * @param {Object} dependencies
   */
  constructor(dependencies = {}) {
    this._logger = MJLogger.child('Pipeline')
    this._eventBus = getEventBus()
    this._errorHandler = getErrorHandler()

    this._contextAnalyzer = dependencies.contextAnalyzer || new ContextAnalyzer()
    this._conversationManager = dependencies.conversationManager || new ConversationManager()
    this._planner = dependencies.planner || new Planner()
    this._memoryEngine = dependencies.memoryEngine || new MemoryEngine()
    this._reasoningEngine = dependencies.reasoningEngine || new ReasoningEngine()
    this._agentSelector = dependencies.agentSelector || null
    this._executionQueue = dependencies.executionQueue || new ExecutionQueue()
    this._responseBuilder = dependencies.responseBuilder || new ResponseBuilder()
    this._stateMachine = dependencies.stateMachine || null
    this._agentRegistry = dependencies.agentRegistry || null
    this._agentOrchestrator = dependencies.agentOrchestrator || null

    if (this._agentRegistry && !this._agentSelector) {
      this._agentSelector = new AgentSelector(this._agentRegistry)
    }
  }

  /**
   * Set agent registry (called during bootstrap).
   * @param {import('../agents/AgentRegistry').AgentRegistry} registry
   */
  setAgentRegistry(registry) {
    this._agentRegistry = registry
    this._agentSelector = new AgentSelector(registry)
  }

  /**
   * Set state machine reference.
   * @param {import('../state/StateMachine').StateMachine} stateMachine
   */
  setStateMachine(stateMachine) {
    this._stateMachine = stateMachine
  }

  /**
   * Execute the full processing pipeline.
   * @param {Object} command - MJ command object
   * @param {Object} [options]
   * @returns {Promise<Object>} Pipeline result with response
   */
  async execute(command, options = {}) {
    const ctx = createPipelineContext(command, options)
    const stages = this._getStages()

    this._logger.info('Pipeline started', { correlationId: ctx.correlationId, commandId: command.id })
    this._eventBus.emitEvent(MJ_EVENTS.COMMAND_RECEIVED, {
      commandId: command.id,
      correlationId: ctx.correlationId,
    })

    if (this._stateMachine) {
      this._stateMachine.transition(MJ_STATES.THINKING)
    }

    try {
      for (const stage of stages) {
        ctx.currentStage = stage.name
        this._emitStageEvent(stage.name, ctx)
        await stage.handler(ctx)
      }

      if (this._stateMachine) {
        this._stateMachine.transition(MJ_STATES.COMPLETED)
        this._stateMachine.transition(MJ_STATES.IDLE)
      }

      this._logger.info('Pipeline completed', { correlationId: ctx.correlationId })
      return { success: true, context: ctx, response: ctx.response }
    } catch (error) {
      this._errorHandler.handle(error, { correlationId: ctx.correlationId, stage: ctx.currentStage })
      if (this._stateMachine) {
        this._stateMachine.forceTransition(MJ_STATES.ERROR)
      }
      return { success: false, context: ctx, error: error.message }
    }
  }

  _getStages() {
    return [
      {
        name: PIPELINE_STAGES.USER_INPUT,
        handler: async (ctx) => {
          this._logger.debug('Stage: User Input', { input: ctx.command.input?.slice(0, 50) })
        },
      },
      {
        name: PIPELINE_STAGES.CONTEXT_ANALYZER,
        handler: async (ctx) => {
          ctx.context = await this._contextAnalyzer.analyze(ctx.command, ctx.context)
        },
      },
      {
        name: PIPELINE_STAGES.CONVERSATION_MANAGER,
        handler: async (ctx) => {
          const result = await this._conversationManager.process(ctx.command, ctx.context)
          ctx.context = result.context
        },
      },
      {
        name: PIPELINE_STAGES.MEMORY_LOOKUP,
        handler: async (ctx) => {
          ctx.memories = await this._memoryEngine.lookup({
            command: ctx.command,
            context: ctx.context,
            correlationId: ctx.correlationId,
          })
          const memoryContext = this._memoryEngine.getLastMemoryContext()
          if (memoryContext) {
            ctx.context = { ...ctx.context, memoryContext }
          }
          this._eventBus.emitEvent(MJ_EVENTS.MEMORY_FOUND, {
            count: ctx.memories.length,
            correlationId: ctx.correlationId,
          })
        },
      },
      {
        name: PIPELINE_STAGES.REASONING_ENGINE,
        handler: async (ctx) => {
          if (this._stateMachine) this._stateMachine.transition(MJ_STATES.THINKING)
          ctx.reasoningResult = await this._reasoningEngine.process({
            command: ctx.command,
            context: ctx.context,
            memories: ctx.memories,
            correlationId: ctx.correlationId,
          })
        },
      },
      {
        name: PIPELINE_STAGES.PLANNER,
        handler: async (ctx) => {
          if (this._stateMachine) this._stateMachine.transition(MJ_STATES.PLANNING)
          ctx.plan = await this._planner.createPlan(ctx.command, {
            ...ctx.context,
            reasoning: ctx.reasoningResult,
          })
          if (ctx.reasoningResult?.executionPlan?.tasks?.length) {
            ctx.plan.tasks = ctx.reasoningResult.executionPlan.tasks
            ctx.plan.executionGraph = ctx.reasoningResult.executionPlan.executionGraph
            ctx.plan.source = 'reasoning_pipeline'
          }
        },
      },
      {
        name: PIPELINE_STAGES.AGENT_SELECTION,
        handler: async (ctx) => {
          if (this._agentOrchestrator) {
            const selected = this._agentOrchestrator.selectAgents(ctx.plan, ctx.reasoningResult)
            ctx.selectedAgents = selected
            ctx.selectedAgent = selected[0] || null
          } else if (ctx.reasoningResult?.recommendedAgents?.length) {
            ctx.selectedAgent = ctx.reasoningResult.recommendedAgents[0]
          } else if (this._agentSelector) {
            ctx.selectedAgent = this._agentSelector.select(ctx.plan, {
              ...ctx.context,
              reasoning: ctx.reasoningResult,
              recommendedAgents: ctx.reasoningResult?.recommendedAgents,
            })
          }
        },
      },
      {
        name: PIPELINE_STAGES.EXECUTION_QUEUE,
        handler: async (ctx) => {
          if (this._stateMachine) this._stateMachine.transition(MJ_STATES.EXECUTING)
          if (this._agentOrchestrator && ctx.plan?.tasks?.length) {
            ctx.orchestrationResult = await this._agentOrchestrator.run({
              command: ctx.command,
              context: ctx.context,
              reasoningResult: ctx.reasoningResult,
              plan: ctx.plan,
              runId: ctx.correlationId,
            })
            ctx.agentResults = ctx.orchestrationResult.execution
          } else if (ctx.plan?.tasks) {
            for (const task of ctx.plan.tasks) {
              this._executionQueue.enqueue(task)
            }
            await this._executionQueue.process(ctx.plan)
          }
        },
      },
      {
        name: PIPELINE_STAGES.RESPONSE_BUILDER,
        handler: async (ctx) => {
          if (this._stateMachine) this._stateMachine.transition(MJ_STATES.RESPONDING)
          ctx.response = this._responseBuilder.build(ctx)
          ctx.memoryPersist = await this._memoryEngine.persist({
            command: ctx.command,
            context: ctx.context,
            reasoningResult: ctx.reasoningResult,
            response: ctx.response,
          })
        },
      },
      {
        name: PIPELINE_STAGES.FRONTEND,
        handler: async (ctx) => {
          this._logger.debug('Stage: Frontend delivery ready', { responseId: ctx.response?.id })
        },
      },
    ]
  }

  _emitStageEvent(stageName, ctx) {
    this._eventBus.emitEvent(MJ_EVENTS.PIPELINE_STAGE, {
      stage: stageName,
      correlationId: ctx.correlationId,
    })
  }
}

module.exports = { ProcessingPipeline }
