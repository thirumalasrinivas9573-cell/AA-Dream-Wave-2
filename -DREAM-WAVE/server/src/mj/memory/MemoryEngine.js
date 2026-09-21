/**
 * MJ Persistent Memory Engine
 * Orchestrates retrieval, storage, pipeline, and consolidation.
 * @module mj/memory/MemoryEngine
 */

const { MEMORY_TYPES } = require('../constants')
const { MEMORY_CATEGORIES } = require('./constants')
const memoryInterfaces = require('./interfaces')
const { MemoryRetrievalService } = require('./retrieval/MemoryRetrievalService')
const { MemoryStorageService } = require('./storage/MemoryStorageService')
const { MemoryPipeline } = require('./pipeline/MemoryPipeline')
const { MemoryConsolidator } = require('./consolidation/MemoryConsolidator')
const { getMemoryObservability } = require('./observability/MemoryObservability')
const { ensureIndexes } = require('./models')
const { isDbReady } = require('./db/connection')
const { MJLogger } = require('../logger')

class MemoryEngine {
  constructor() {
    this._logger = MJLogger.child('MemoryEngine')
    this._stores = new Map()
    this._storage = new MemoryStorageService()
    this._retrieval = new MemoryRetrievalService(this._storage)
    this._pipeline = new MemoryPipeline(this._retrieval, this._storage)
    this._consolidator = new MemoryConsolidator()
    this._observability = getMemoryObservability()
    this._initialized = false
    this._initializeStores()
  }

  async initialize() {
    if (this._initialized) return this
    if (isDbReady()) {
      await ensureIndexes()
      this._logger.info('MJ memory indexes ensured')
    }
    this._initialized = true
    return this
  }

  _initializeStores() {
    const storeClasses = {
      [MEMORY_TYPES.WORKING]: memoryInterfaces.WorkingMemory,
      [MEMORY_TYPES.LONG_TERM]: memoryInterfaces.LongTermMemory,
      [MEMORY_TYPES.CONVERSATION]: memoryInterfaces.ConversationMemory,
      [MEMORY_TYPES.TASK]: memoryInterfaces.TaskMemory,
      [MEMORY_TYPES.PROJECT]: memoryInterfaces.ProjectMemory,
      [MEMORY_TYPES.LEARNING]: memoryInterfaces.LearningMemory,
      [MEMORY_TYPES.PREFERENCE]: memoryInterfaces.PreferenceMemory,
      [MEMORY_TYPES.AGENT]: memoryInterfaces.AgentMemory,
      [MEMORY_TYPES.SYSTEM]: memoryInterfaces.SystemMemory,
    }

    for (const [type, StoreClass] of Object.entries(storeClasses)) {
      this._stores.set(type, new StoreClass())
    }
  }

  get retrieval() { return this._retrieval }
  get storage() { return this._storage }
  get pipeline() { return this._pipeline }
  get consolidator() { return this._consolidator }

  getStore(type) {
    return this._stores.get(type) || null
  }

  /**
   * Lookup memories for processing pipeline (uses MemoryPipeline).
   * @param {Object} query
   * @returns {Promise<Array>}
   */
  async lookup(query = {}) {
    const { command, context, correlationId } = query
    const { memoryContext, rankedMemories } = await this._pipeline.retrieveContext({
      command,
      context,
      correlationId,
    })
    this._lastContext = memoryContext
    this._lastRanked = rankedMemories
    return rankedMemories
  }

  /** Get last injected memory context */
  getLastMemoryContext() {
    return this._lastContext || null
  }

  /**
   * Persist after response generation.
   * @param {Object} params
   */
  async persist(params) {
    return this._pipeline.persistInteraction({
      ...params,
      rankedMemories: this._lastRanked || [],
    })
  }

  async getMemorySnapshot() {
    const categories = Object.values(MEMORY_CATEGORIES)
    const snapshot = {}
    for (const cat of categories) {
      snapshot[cat] = {
        type: cat,
        description: `${cat} memory layer`,
        count: 0,
        persistence: isDbReady(),
      }
    }

    if (isDbReady()) {
      try {
        const { getModels } = require('./models')
        const models = getModels()
        snapshot[MEMORY_CATEGORIES.KNOWLEDGE].count = await models.MJMemory.countDocuments({ archived: false })
        snapshot[MEMORY_CATEGORIES.CONVERSATION].count = await models.MJConversation.countDocuments({ archived: false })
        snapshot[MEMORY_CATEGORIES.PROJECT].count = await models.MJProject.countDocuments({ archived: false })
        snapshot[MEMORY_CATEGORIES.PREFERENCE].count = await models.MJPreference.countDocuments({ archived: false })
        snapshot[MEMORY_CATEGORIES.LEARNING].count = await models.MJLearning.countDocuments({ archived: false })
        snapshot[MEMORY_CATEGORIES.TASK].count = await models.MJTaskMemory.countDocuments({ archived: false })

        this._observability.updateStorageSize(snapshot)
      } catch (err) {
        this._logger.warning('Snapshot count failed', { message: err.message })
      }
    } else {
      const all = this._storage.getFallbackEntries({})
      snapshot[MEMORY_CATEGORIES.KNOWLEDGE].count = all.filter(m => m.category === MEMORY_CATEGORIES.KNOWLEDGE).length
      snapshot[MEMORY_CATEGORIES.CONVERSATION].count = all.filter(m => m.category === MEMORY_CATEGORIES.CONVERSATION).length
    }

    snapshot.working = snapshot.working || { count: this._storage.getFallbackCount(), persistence: false }

    return snapshot
  }

  /** Clear runtime working memory only — NOT MongoDB */
  async clearAll() {
    this._logger.info('Clear runtime working memory')
    this._lastContext = null
    this._lastRanked = []
    return { cleared: true, persistent: false, message: 'Runtime working memory cleared. Persistent data untouched.' }
  }

  getObservabilityMetrics() {
    return this._observability.getMetrics()
  }
}

module.exports = { MemoryEngine }
