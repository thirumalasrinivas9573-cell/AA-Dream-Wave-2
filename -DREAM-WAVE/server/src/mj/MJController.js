/**
 * MJ Controller
 * Single entry point for the MJ Personal AI Operating System.
 * All external integrations MUST go through this controller.
 *
 * @module mj/MJController
 */

const { MJCore } = require('./core')
const { createCommand } = require('./types')
const { ValidationError } = require('./errors')
const { MJLogger } = require('./logger')
const { MJ_VERSION } = require('./constants')

class MJController {
  constructor() {
    this._logger = MJLogger.child('Controller')
    this._core = new MJCore()
  }

  /**
   * Start MJ.
   * @returns {Object}
   */
  start() {
    return this._core.start()
  }

  /**
   * Stop MJ.
   * @returns {Object}
   */
  stop() {
    return this._core.stop()
  }

  /**
   * Put MJ to sleep.
   * @returns {Object}
   */
  sleep() {
    return this._core.sleep()
  }

  /**
   * Wake MJ from sleep.
   * @returns {Object}
   */
  wake() {
    return this._core.wake()
  }

  /**
   * Process a user command through the central pipeline.
   * @param {string|Object} input - Raw input string or command object
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  async processCommand(input, options = {}) {
    if (this._core.isSleeping) {
      throw new ValidationError('MJ is sleeping. Call wake() first.')
    }

    if (!this._core.isRunning) {
      this.start()
    }

    const command = typeof input === 'string'
      ? createCommand(input, options)
      : input

    if (!command?.input) {
      throw new ValidationError('Command must have input')
    }

    const components = this._core.components
    components.lifecycleHooks.run('onCommand', command)

    this._logger.info('Processing command', { commandId: command.id })
    return components.pipeline.execute(command, options)
  }

  /**
   * Get current MJ state.
   * @returns {Object}
   */
  getState() {
    return this._core.getState()
  }

  /**
   * Get memory snapshot from all memory stores.
   * @returns {Promise<Object>}
   */
  async getMemory() {
    const components = this._core.components || this._core.initialize()
    return components.memoryEngine.getMemorySnapshot()
  }

  /** @returns {import('./memory/MemoryEngine').MemoryEngine} */
  _getMemoryEngine() {
    const components = this._core.components || this._core.initialize()
    return components.memoryEngine
  }

  async searchMemory(params) {
    return this._getMemoryEngine().retrieval.search(params)
  }

  async getRecentMemory(userId, limit = 10) {
    return this._getMemoryEngine().retrieval.getRecent(userId, limit)
  }

  async getProjectMemory(userId, projectId, limit = 20) {
    return this._getMemoryEngine().retrieval.getByProject(userId, projectId, limit)
  }

  async getPreferenceMemory(userId) {
    return this._getMemoryEngine().retrieval.getPreferences(userId)
  }

  async saveMemory(payload, actorUserId) {
    return this._getMemoryEngine().storage.save(payload, actorUserId)
  }

  async updateMemory(memoryId, updates, actorUserId, collection) {
    return this._getMemoryEngine().storage.update(memoryId, updates, actorUserId, collection)
  }

  async archiveMemory(memoryId, actorUserId, collection) {
    return this._getMemoryEngine().storage.archive(memoryId, actorUserId, collection)
  }

  async deleteMemory(memoryId, actorUserId, collection) {
    return this._getMemoryEngine().storage.delete(memoryId, actorUserId, collection)
  }

  getMemoryMetrics() {
    return this._getMemoryEngine().getObservabilityMetrics()
  }

  /** @returns {import('./voice/VoiceEngine').VoiceEngine} */
  _getVoiceEngine() {
    const components = this._core.components || this._core.initialize()
    if (!components._voiceWired) {
      components.voiceEngine.setProcessCommand((input, options) =>
        this.processCommand(input, options)
      )
      components._voiceWired = true
    }
    return components.voiceEngine
  }

  getVoiceStatus(userId) {
    return this._getVoiceEngine().getStatus(userId)
  }

  voiceWake(userId, options = {}) {
    return this._getVoiceEngine().wake(userId, options)
  }

  voiceSleep(sessionId) {
    return this._getVoiceEngine().sleep(sessionId)
  }

  voiceListen(userId, options = {}) {
    return this._getVoiceEngine().listen(userId, options)
  }

  voiceStop(sessionId) {
    return this._getVoiceEngine().stop(sessionId)
  }

  async processVoiceInput(params) {
    return this._getVoiceEngine().processVoiceInput(params)
  }

  async voiceSpeak(text, userId, options = {}) {
    return this._getVoiceEngine().speak(text, userId, options)
  }

  getVoiceSettings(userId) {
    return this._getVoiceEngine().getSettings(userId)
  }

  updateVoiceSettings(userId, updates) {
    return this._getVoiceEngine().updateSettings(userId, updates)
  }

  voiceReset() {
    return this._getVoiceEngine().reset()
  }

  /**
   * Clear all MJ memory stores.
   * @returns {Promise<Object>}
   */
  async clearMemory() {
    const components = this._core.components || this._core.initialize()
    return components.memoryEngine.clearAll()
  }

  /**
   * Register a custom agent.
   * @param {import('./agents/interfaces').IAgent} agent
   * @returns {Object}
   */
  registerAgent(agent) {
    const components = this._core.components || this._core.initialize()
    return components.agentRegistry.register(agent)
  }

  /**
   * Unregister an agent by type.
   * @param {string} agentType
   * @returns {boolean}
   */
  unregisterAgent(agentType) {
    const components = this._core.components || this._core.initialize()
    return components.agentRegistry.unregister(agentType)
  }

  /**
   * Get all active agents.
   * @returns {Array}
   */
  getActiveAgents() {
    const components = this._core.components || this._core.initialize()
    return components.agentRegistry.getActive()
  }

  /**
   * Get all registered agents.
   * @returns {Array}
   */
  getAllAgents() {
    const components = this._core.components || this._core.initialize()
    return components.agentRegistry.getAll()
  }

  /** @returns {import('./orchestrator/AgentOrchestrator').AgentOrchestrator} */
  _getOrchestrator() {
    const components = this._core.components || this._core.initialize()
    return components.agentOrchestrator
  }

  getAgentById(agentId) {
    const components = this._core.components || this._core.initialize()
    const agent = components.agentRegistry.getById(agentId) || components.agentRegistry.get(agentId)
    return agent ? agent.toDescriptor() : null
  }

  discoverAgents(query) {
    const components = this._core.components || this._core.initialize()
    return components.agentRegistry.discover(query)
  }

  async executeAgent(agentId, task, context = {}) {
    return this._getOrchestrator().executeAgent(agentId, task, context)
  }

  async runOrchestrator(params) {
    return this._getOrchestrator().run(params)
  }

  getOrchestratorStatus() {
    return this._getOrchestrator()?.getStatus() || { initialized: false }
  }

  getOrchestratorMetrics() {
    return this._getOrchestrator()?.getMetrics() || {}
  }

  getOrchestratorHealth() {
    return this._getOrchestrator()?.getHealth() || { status: 'unavailable' }
  }

  /**
   * Reset MJ runtime state only — never touches Dream Wave data.
   * @returns {Promise<Object>}
   */
  async reset() {
    return this._core.reset()
  }

  /**
   * Get subsystem health snapshot.
   * @returns {Object}
   */
  getHealth() {
    return this._core.getHealth()
  }

  /**
   * Get MJ uptime since last start.
   * @returns {Object}
   */
  getUptime() {
    return this._core.getUptime()
  }

  /**
   * Get AI Brain status.
   * @returns {Object}
   */
  getAIBrainStatus() {
    const components = this._core.components || this._core.initialize()
    return components.aiBrain?.getStatus() || { initialized: false }
  }

  /**
   * Get MJ version.
   * @returns {string}
   */
  getVersion() {
    return MJ_VERSION
  }

  /**
   * Get event bus for external subscriptions.
   * @returns {import('./events/EventBus').EventBus}
   */
  getEventBus() {
    const components = this._core.components || this._core.initialize()
    return components.eventBus
  }

  /**
   * Get lifecycle hooks for extensions.
   * @returns {import('./hooks/LifecycleHooks').LifecycleHooks}
   */
  getHooks() {
    const components = this._core.components || this._core.initialize()
    return components.lifecycleHooks
  }
}

/** Singleton MJ controller instance */
let _instance = null

/**
 * Get the singleton MJ controller.
 * @returns {MJController}
 */
function getMJ() {
  if (!_instance) {
    _instance = new MJController()
  }
  return _instance
}

module.exports = { MJController, getMJ }
