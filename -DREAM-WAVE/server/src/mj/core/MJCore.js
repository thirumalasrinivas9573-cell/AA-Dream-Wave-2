/**
 * MJ Core
 * Central orchestrator for MJ subsystems.
 * @module mj/core/MJCore
 */

const { bootstrapMJ } = require('./bootstrap')
const { MJ_STATES, MJ_EVENTS, MJ_VERSION } = require('../constants')
const { MJLogger } = require('../logger')

class MJCore {
  constructor() {
    this._logger = MJLogger.child('Core')
    this._components = null
    this._running = false
    this._sleeping = false
    this._startedAt = null
  }

  /** @returns {boolean} */
  get isRunning() {
    return this._running
  }

  /** @returns {boolean} */
  get isSleeping() {
    return this._sleeping
  }

  /** @returns {Object|null} */
  get components() {
    return this._components
  }

  /** Initialize MJ core subsystems. */
  initialize() {
    if (this._components) return this._components
    this._components = bootstrapMJ()
    return this._components
  }

  /** Start MJ. */
  start() {
    this.initialize()
    this._components.memoryEngine.initialize().catch(err => {
      this._logger.warning('Memory engine index init failed', { message: err.message })
    })
    this._running = true
    this._sleeping = false
    if (!this._startedAt) this._startedAt = Date.now()
    this._components.stateMachine.transition(MJ_STATES.IDLE)
    this._components.lifecycleHooks.run('onStart')
    this._components.eventBus.emitEvent(MJ_EVENTS.MJ_STARTED, { version: MJ_VERSION })
    this._logger.info(`MJ started (v${MJ_VERSION})`)
    return { running: true, version: MJ_VERSION }
  }

  /** Stop MJ. */
  stop() {
    if (!this._components) return { running: false }
    this._running = false
    this._components.lifecycleHooks.run('onStop')
    this._components.eventBus.emitEvent(MJ_EVENTS.MJ_STOPPED, {})
    this._components.stateMachine.forceTransition(MJ_STATES.IDLE)
    this._logger.info('MJ stopped')
    return { running: false }
  }

  /** Put MJ to sleep. */
  sleep() {
    if (!this._components) this.initialize()
    this._sleeping = true
    this._components.stateMachine.transition(MJ_STATES.SLEEPING)
    this._components.lifecycleHooks.run('onSleep')
    this._components.eventBus.emitEvent(MJ_EVENTS.MJ_SLEEP, {})
    this._logger.info('MJ sleeping')
    return { sleeping: true }
  }

  /** Wake MJ from sleep. */
  wake() {
    if (!this._components) this.initialize()
    if (!this._running) {
      this._running = true
      if (!this._startedAt) this._startedAt = Date.now()
    }
    this._sleeping = false
    let transition = this._components.stateMachine.transition(MJ_STATES.LISTENING)
    if (!transition.success) {
      transition = this._components.stateMachine.forceTransition(MJ_STATES.LISTENING)
    }
    this._components.lifecycleHooks.run('onWake')
    this._components.eventBus.emitEvent(MJ_EVENTS.MJ_WAKE, { state: MJ_STATES.LISTENING })
    this._logger.info('MJ awake — listening')
    return { sleeping: false, state: MJ_STATES.LISTENING, transition }
  }

  /**
   * Reset MJ runtime state only — never touches Dream Wave data.
   * @returns {Promise<Object>}
   */
  async reset() {
    if (!this._components) this.initialize()

    await this._components.memoryEngine.clearAll()
    this._components.agentOrchestrator?.reset()
    this._components.voiceEngine?.reset()
    this._components.cacheService?.clear()
    this._components.pipeline?._executionQueue?.clear()

    const conversationManager = this._components.pipeline?._conversationManager
    if (conversationManager?._sessions) {
      conversationManager._sessions.clear()
    }

    this._components.stateMachine.forceTransition(MJ_STATES.IDLE)
    this._sleeping = false

    this._logger.info('MJ runtime state reset')
    return {
      reset: true,
      state: MJ_STATES.IDLE,
      message: 'MJ runtime state reset. Dream Wave data untouched.',
    }
  }

  /** @returns {Object} Uptime information */
  getUptime() {
    if (!this._startedAt) return { ms: 0, seconds: 0, since: null }
    const ms = Date.now() - this._startedAt
    return { ms, seconds: Math.floor(ms / 1000), since: this._startedAt }
  }

  /** @returns {Object} Subsystem health snapshot */
  getHealth() {
    const c = this._components || this.initialize()
    return {
      system: {
        status: this._running ? 'running' : 'stopped',
        sleeping: this._sleeping,
        state: c.stateMachine.currentState,
        version: MJ_VERSION,
        uptime: this.getUptime(),
      },
      memory: {
        status: 'ready',
        metrics: c.memoryEngine.getObservabilityMetrics(),
        persistence: require('../memory/db/connection').isDbReady(),
      },
      planner: { status: 'ready' },
      conversation: { status: 'ready' },
      agents: {
        status: 'ready',
        registered: c.agentRegistry.getAll().length,
        active: c.agentRegistry.getActive().length,
      },
      eventBus: {
        status: 'ready',
        listenerCount: c.eventBus.eventNames().length,
      },
      aiBrain: c.aiBrain ? c.aiBrain.getStatus() : { initialized: false },
      voice: c.voiceEngine ? c.voiceEngine.getStatus() : { initialized: false },
      orchestrator: c.agentOrchestrator ? c.agentOrchestrator.getStatus() : { initialized: false },
    }
  }

  /** @returns {Object} Current state snapshot */
  getState() {
    if (!this._components) return { running: false, state: MJ_STATES.IDLE }
    return {
      running: this._running,
      sleeping: this._sleeping,
      state: this._components.stateMachine.currentState,
      previousState: this._components.stateMachine.previousState,
      version: MJ_VERSION,
    }
  }
}

module.exports = { MJCore }
