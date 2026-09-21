/**
 * MJ Core Bootstrap
 * Initializes MJ subsystems without connecting to external services.
 * @module mj/core/bootstrap
 */

const { MJLogger } = require('../logger')
const { getConfig } = require('../config')
const { getEventBus } = require('../events')
const { getErrorHandler } = require('../errors')
const { StateMachine } = require('../state')
const { MemoryEngine } = require('../memory')
const { Planner } = require('../planner')
const { AgentRegistry } = require('../agents')
const { getAgentOrchestrator } = require('../orchestrator')
const { ProcessingPipeline } = require('./ProcessingPipeline')
const { CacheService, StreamService, ParallelExecutor } = require('../services')
const { PermissionManager, CapabilityManager } = require('../security')
const { LifecycleHooks } = require('../hooks')
const { getAIBrain } = require('../brain/AIBrain')
const { ReasoningEngine } = require('../brain/ReasoningEngine')
const { getVoiceEngine } = require('../voice')
const { PERMISSION_TYPES } = require('../constants')

/**
 * Bootstrap all MJ core components.
 * @returns {Object} MJ core component instances
 */
function bootstrapMJ() {
  const logger = MJLogger.child('Bootstrap')
  logger.info('Bootstrapping MJ Core Foundation...')

  const config = getConfig()
  config.load()

  const aiBrain = getAIBrain().initialize()
  const voiceEngine = getVoiceEngine().initialize(config.getAll())

  const components = {
    config,
    aiBrain,
    voiceEngine,
    eventBus: getEventBus(),
    errorHandler: getErrorHandler(),
    stateMachine: new StateMachine(),
    memoryEngine: new MemoryEngine(),
    planner: new Planner(),
    agentRegistry: new AgentRegistry(),
    agentOrchestrator: null,
    cacheService: new CacheService(),
    streamService: new StreamService(),
    parallelExecutor: new ParallelExecutor(),
    permissionManager: new PermissionManager(),
    capabilityManager: new CapabilityManager(),
    lifecycleHooks: new LifecycleHooks(),
    pipeline: null,
  }

  components.agentOrchestrator = getAgentOrchestrator(components.agentRegistry).initialize()

  components.pipeline = new ProcessingPipeline({
    stateMachine: components.stateMachine,
    memoryEngine: components.memoryEngine,
    planner: components.planner,
    agentRegistry: components.agentRegistry,
    agentOrchestrator: components.agentOrchestrator,
    reasoningEngine: new ReasoningEngine(aiBrain),
    voiceEngine: components.voiceEngine,
  })

  components.pipeline._agentSelector.setMatcher(components.agentOrchestrator.matcher)

  voiceEngine.setPermissionManager(components.permissionManager)
  components.permissionManager.grant(PERMISSION_TYPES.MICROPHONE)

  components.memoryEngine.initialize().catch(err => {
    logger.warning('Memory engine init deferred', { message: err.message })
  })

  logger.info('MJ Core Foundation bootstrapped (AI Brain + Memory + Voice + Orchestrator active)')
  return components
}

module.exports = { bootstrapMJ }
