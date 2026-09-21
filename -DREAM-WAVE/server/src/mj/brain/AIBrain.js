/**
 * MJ AI Brain — orchestrates all AI reasoning subsystems
 * @module mj/brain/AIBrain
 */

const { ProviderRegistry } = require('../ai/ProviderRegistry')
const { FallbackManager } = require('../ai/FallbackManager')
const { ProviderSelector } = require('../ai/ProviderSelector')
const { ReasoningPipeline } = require('./ReasoningPipeline')
const { getConfig } = require('../config')
const { MJLogger } = require('../logger')

class AIBrain {
  constructor() {
    this._logger = MJLogger.child('AIBrain')
    this._initialized = false
    this._registry = null
    this._fallback = null
    this._selector = null
    this._reasoningPipeline = null
  }

  initialize() {
    if (this._initialized) return this

    const config = getConfig()
    const aiConfig = config.get('ai') || {}

    this._registry = new ProviderRegistry(aiConfig)
    this._fallback = new FallbackManager(this._registry, aiConfig)
    this._selector = new ProviderSelector(this._registry)
    this._reasoningPipeline = new ReasoningPipeline(this._fallback)

    this._initialized = true
    this._logger.info('AI Brain initialized', {
      providers: this._registry.getAll(),
      available: this._registry.getAvailable(),
      primary: aiConfig.primaryProvider,
    })

    return this
  }

  /** @returns {ReasoningPipeline} */
  get reasoningPipeline() {
    this.initialize()
    return this._reasoningPipeline
  }

  /** @returns {ProviderRegistry} */
  get registry() {
    this.initialize()
    return this._registry
  }

  /** @returns {FallbackManager} */
  get fallback() {
    this.initialize()
    return this._fallback
  }

  getStatus() {
    this.initialize()
    return {
      initialized: this._initialized,
      providers: this._registry.getAll().map(name => ({
        name,
        available: this._registry.get(name)?.isAvailable() || false,
      })),
      primary: this._selector.getPrimary(),
      fallback: this._selector.getFallback(),
      observability: this._reasoningPipeline.getObservability().getMetrics(),
      cache: this._reasoningPipeline.getCache().getStats(),
    }
  }
}

let _instance = null

function getAIBrain() {
  if (!_instance) _instance = new AIBrain()
  return _instance
}

module.exports = { AIBrain, getAIBrain }
