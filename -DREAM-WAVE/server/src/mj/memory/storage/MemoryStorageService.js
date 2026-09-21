/**
 * MJ Memory Storage Service — save, update, archive, delete
 * @module mj/memory/storage/MemoryStorageService
 */

const { getModels } = require('../models')
const { isDbReady } = require('../db/connection')
const { MemoryScorer } = require('../scoring/MemoryScorer')
const { MEMORY_CATEGORIES, EXPIRATION_POLICIES } = require('../constants')
const { MJLogger } = require('../../logger')
const { MemorySecurity } = require('../security/MemorySecurity')
const { getMemoryObservability } = require('../observability/MemoryObservability')

class MemoryStorageService {
  constructor() {
    this._logger = MJLogger.child('Memory:Storage')
    this._scorer = new MemoryScorer()
    this._security = new MemorySecurity()
    this._observability = getMemoryObservability()
    this._fallbackStore = []
  }

  async save(payload, actorUserId) {
    const start = Date.now()
    this._security.validateOperation(payload, actorUserId)

    const doc = {
      userId: payload.userId,
      sessionId: payload.sessionId || null,
      category: payload.category || MEMORY_CATEGORIES.KNOWLEDGE,
      content: this._security.sanitizeContent(payload.content),
      summary: payload.summary || payload.content?.slice(0, 200) || '',
      tags: payload.tags || [],
      importanceScore: payload.importanceScore ?? this._scorer.defaultImportance(payload.category),
      recencyScore: 1,
      confidence: payload.confidence ?? 0.8,
      expirationPolicy: payload.expirationPolicy || EXPIRATION_POLICIES.NEVER,
      expiresAt: this._computeExpiry(payload.expirationPolicy),
      projectId: payload.projectId || null,
      metadata: payload.metadata || {},
    }

    if (!isDbReady()) {
      const entry = { ...doc, id: `mem_${Date.now()}`, createdAt: new Date(), updatedAt: new Date() }
      this._fallbackStore.push(entry)
      this._observability.recordSave(Date.now() - start)
      return entry
    }

    const models = getModels()
    let saved

    switch (payload.category) {
      case MEMORY_CATEGORIES.CONVERSATION:
        saved = await models.MJConversation.create({
          ...doc,
          messages: payload.messages || [{ role: 'user', content: doc.content }],
          messageCount: 1,
        })
        break
      case MEMORY_CATEGORIES.PROJECT:
        saved = await models.MJProject.create({
          ...doc,
          projectId: payload.projectId || `proj_${Date.now()}`,
          name: payload.name || 'Untitled Project',
          description: doc.content,
          sprint: payload.sprint || null,
        })
        break
      case MEMORY_CATEGORIES.PREFERENCE:
        saved = await models.MJPreference.create({
          ...doc,
          key: payload.key || 'general',
          value: payload.value,
          preferenceType: payload.preferenceType || 'general',
        })
        break
      case MEMORY_CATEGORIES.LEARNING:
        saved = await models.MJLearning.create({
          ...doc,
          topic: payload.topic || doc.content.slice(0, 100),
          skillLevel: payload.skillLevel || 'beginner',
        })
        break
      case MEMORY_CATEGORIES.TASK:
        saved = await models.MJTaskMemory.create({
          ...doc,
          title: payload.title || doc.content.slice(0, 100),
          status: payload.status || 'pending',
          deadline: payload.deadline || null,
        })
        break
      default:
        saved = await models.MJMemory.create(doc)
    }

    this._observability.recordSave(Date.now() - start)
    return saved.toObject ? saved.toObject() : saved
  }

  async update(memoryId, updates, actorUserId, collection = 'mj_memory') {
    this._security.validateUserScope(updates.userId || actorUserId, actorUserId)

    if (!isDbReady()) {
      const idx = this._fallbackStore.findIndex(m => m.id === memoryId)
      if (idx >= 0) {
        this._fallbackStore[idx] = { ...this._fallbackStore[idx], ...updates, updatedAt: new Date() }
        return this._fallbackStore[idx]
      }
      return null
    }

    const models = getModels()
    const modelMap = {
      mj_memory: models.MJMemory,
      mj_conversations: models.MJConversation,
      mj_projects: models.MJProject,
      mj_preferences: models.MJPreference,
      mj_learning: models.MJLearning,
      mj_tasks: models.MJTaskMemory,
    }

    const Model = modelMap[collection] || models.MJMemory
    const existing = await Model.findById(memoryId)
    if (!existing) return null
    this._security.validateUserScope(existing.userId, actorUserId)

    if (updates.content) updates.content = this._security.sanitizeContent(updates.content)
    updates.recencyScore = 1

    return Model.findByIdAndUpdate(memoryId, { $set: updates }, { new: true }).lean()
  }

  async archive(memoryId, actorUserId, collection = 'mj_memory') {
    return this.update(memoryId, { archived: true }, actorUserId, collection)
  }

  async delete(memoryId, actorUserId, collection = 'mj_memory') {
    if (!isDbReady()) {
      this._fallbackStore = this._fallbackStore.filter(m => m.id !== memoryId)
      return { deleted: true }
    }

    const models = getModels()
    const modelMap = {
      mj_memory: models.MJMemory,
      mj_conversations: models.MJConversation,
      mj_projects: models.MJProject,
      mj_preferences: models.MJPreference,
      mj_learning: models.MJLearning,
      mj_tasks: models.MJTaskMemory,
    }

    const Model = modelMap[collection] || models.MJMemory
    const existing = await Model.findById(memoryId)
    if (!existing) return { deleted: false }
    this._security.validateUserScope(existing.userId, actorUserId)

    await Model.findByIdAndDelete(memoryId)
    return { deleted: true }
  }

  async ensureSession(userId, sessionId) {
    if (!isDbReady() || !userId || !sessionId) return null
    const models = getModels()
    return models.MJSession.findOneAndUpdate(
      { sessionId },
      { userId, lastActiveAt: new Date(), $inc: { messageCount: 1 } },
      { upsert: true, new: true }
    )
  }

  _computeExpiry(policy) {
    if (!policy || policy === EXPIRATION_POLICIES.NEVER) return null
    const now = Date.now()
    const map = {
      [EXPIRATION_POLICIES.SESSION]: 86400000,
      [EXPIRATION_POLICIES.DAILY]: 86400000,
      [EXPIRATION_POLICIES.WEEKLY]: 604800000,
      [EXPIRATION_POLICIES.MONTHLY]: 2592000000,
    }
    return map[policy] ? new Date(now + map[policy]) : null
  }

  getFallbackCount() {
    return this._fallbackStore.length
  }

  getFallbackEntries(filters = {}) {
    const { userId, category, projectId, sessionId, query, includeArchived } = filters
    let entries = userId ? this._fallbackStore.filter(m => m.userId === userId) : [...this._fallbackStore]
    if (!includeArchived) entries = entries.filter(m => !m.archived)
    if (category) entries = entries.filter(m => m.category === category)
    if (projectId) entries = entries.filter(m => m.projectId === projectId)
    if (sessionId) entries = entries.filter(m => m.sessionId === sessionId)
    if (query) {
      const regex = new RegExp(query.split(/\s+/).filter(Boolean).join('|'), 'i')
      entries = entries.filter(m =>
        regex.test(m.content || '') ||
        regex.test(m.summary || '') ||
        (m.tags || []).some(t => regex.test(t))
      )
    }
    return entries.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
  }
}

module.exports = { MemoryStorageService }
