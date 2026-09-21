/**
 * MJ Memory Retrieval Service
 * @module mj/memory/retrieval/MemoryRetrievalService
 */

const { getModels } = require('../models')
const { isDbReady } = require('../db/connection')
const { MemoryScorer } = require('../scoring/MemoryScorer')
const { SemanticSearchInterface } = require('./SemanticSearchInterface')
const { MEMORY_CATEGORIES } = require('../constants')
const { MJLogger } = require('../../logger')
const { getMemoryObservability } = require('../observability/MemoryObservability')

class MemoryRetrievalService {
  /**
   * @param {import('../storage/MemoryStorageService').MemoryStorageService} [storageService]
   */
  constructor(storageService = null) {
    this._logger = MJLogger.child('Memory:Retrieval')
    this._scorer = new MemoryScorer()
    this._semantic = new SemanticSearchInterface()
    this._observability = getMemoryObservability()
    this._workingMemory = new Map()
    this._storage = storageService
  }

  setStorageService(storageService) {
    this._storage = storageService
  }

  /** In-memory working memory (session-scoped, TTL) */
  setWorking(sessionId, data, ttlMs = 3600000) {
    this._workingMemory.set(sessionId, {
      data,
      expiresAt: Date.now() + ttlMs,
    })
  }

  getWorking(sessionId) {
    const entry = this._workingMemory.get(sessionId)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this._workingMemory.delete(sessionId)
      return null
    }
    return entry.data
  }

  /**
   * Search memories across MJ collections.
   * @param {Object} options
   */
  async search(options = {}) {
    const start = Date.now()
    const {
      userId,
      query = '',
      category = null,
      projectId = null,
      sessionId = null,
      limit = 20,
      page = 1,
      includeArchived = false,
    } = options

    if (!userId) return { results: [], total: 0, page, limit }

    const results = []

    if (isDbReady()) {
      const models = getModels()
      const filter = { userId, archived: includeArchived ? undefined : false }
      if (category) filter.category = category
      if (projectId) filter.projectId = projectId
      if (sessionId) filter.sessionId = sessionId

      if (query) {
        const regex = new RegExp(query.split(/\s+/).filter(Boolean).join('|'), 'i')
        filter.$or = [
          { content: regex },
          { summary: regex },
          { tags: regex },
          { title: regex },
          { topic: regex },
          { name: regex },
        ]
      }

      const memDocs = await models.MJMemory.find(filter)
        .sort({ updatedAt: -1 })
        .limit(limit * 3)
        .lean()

      for (const doc of memDocs) {
        results.push(this._toResult(doc, 'mj_memory', query))
      }

      if (!category || category === MEMORY_CATEGORIES.CONVERSATION) {
        const convFilter = { userId, archived: false }
        if (sessionId) convFilter.sessionId = sessionId
        if (query) convFilter.$or = [{ summary: new RegExp(query, 'i') }]
        const convs = await models.MJConversation.find(convFilter).limit(limit).lean()
        for (const doc of convs) {
          results.push(this._toResult({ ...doc, content: doc.summary, category: MEMORY_CATEGORIES.CONVERSATION }, 'mj_conversations', query))
        }
      }

      if (!category || category === MEMORY_CATEGORIES.PROJECT) {
        const projFilter = { userId, archived: false }
        if (projectId) projFilter.projectId = projectId
        if (query) projFilter.$or = [{ name: new RegExp(query, 'i') }, { description: new RegExp(query, 'i') }]
        const projs = await models.MJProject.find(projFilter).limit(limit).lean()
        for (const doc of projs) {
          results.push(this._toResult({ ...doc, content: doc.description, category: MEMORY_CATEGORIES.PROJECT }, 'mj_projects', query))
        }
      }

      if (!category || category === MEMORY_CATEGORIES.PREFERENCE) {
        const prefs = await models.MJPreference.find({ userId, archived: false }).limit(limit).lean()
        for (const doc of prefs) {
          results.push(this._toResult({
            ...doc,
            content: `${doc.key}: ${JSON.stringify(doc.value)}`,
            category: MEMORY_CATEGORIES.PREFERENCE,
          }, 'mj_preferences', query))
        }
      }
    } else if (this._storage) {
      const fallback = this._storage.getFallbackEntries({ userId, category, projectId, sessionId, query, includeArchived })
      for (const doc of fallback) {
        results.push(this._toResult(doc, 'fallback', query))
      }
    }
    const semantic = await this._semantic.search(query, { userId })
    results.push(...semantic)

    results.sort((a, b) => b.rankScore - a.rankScore)
    const paginated = results.slice((page - 1) * limit, page * limit)

    this._observability.recordRetrieval(Date.now() - start, paginated.length)

    return {
      results: paginated,
      total: results.length,
      page,
      limit,
      retrievalTimeMs: Date.now() - start,
    }
  }

  _toResult(doc, collection, query) {
    const keywordScore = this._scorer.keywordScore(query, doc)
    const rankScore = this._scorer.rankScore(doc, { keywordScore })
    return {
      id: doc._id?.toString() || doc.id,
      collection,
      category: doc.category,
      content: doc.content || doc.summary || '',
      summary: doc.summary || '',
      tags: doc.tags || [],
      importanceScore: doc.importanceScore,
      recencyScore: this._scorer.recencyScore(doc.updatedAt),
      accessCount: doc.accessCount,
      confidence: doc.confidence,
      rankScore,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      metadata: doc.metadata,
    }
  }

  async getRecent(userId, limit = 10) {
    return this.search({ userId, query: '', limit, page: 1 })
  }

  async getByProject(userId, projectId, limit = 20) {
    return this.search({ userId, projectId, limit })
  }

  async getPreferences(userId) {
    if (!isDbReady()) {
      const prefs = this._storage
        ? this._storage.getFallbackEntries({ userId, category: MEMORY_CATEGORIES.PREFERENCE })
        : []
      return { preferences: prefs, total: prefs.length }
    }
    const models = getModels()
    const prefs = await models.MJPreference.find({ userId, archived: false }).lean()
    return { preferences: prefs, total: prefs.length }
  }

  async incrementAccess(memoryId, collection = 'mj_memory') {
    if (!isDbReady() || !memoryId) return
    const models = getModels()
    const modelMap = {
      mj_memory: models.MJMemory,
      mj_conversations: models.MJConversation,
      mj_projects: models.MJProject,
    }
    const Model = modelMap[collection]
    if (Model) {
      await Model.findByIdAndUpdate(memoryId, { $inc: { accessCount: 1 } })
    }
  }
}

module.exports = { MemoryRetrievalService }
