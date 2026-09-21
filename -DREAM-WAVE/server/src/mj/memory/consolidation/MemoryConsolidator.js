/**
 * MJ Memory Consolidator — background lifecycle services (architecture)
 * @module mj/memory/consolidation/MemoryConsolidator
 */

const { getModels } = require('../models')
const { isDbReady } = require('../db/connection')
const { EXPIRATION_POLICIES } = require('../constants')
const { MJLogger } = require('../../logger')

class MemoryConsolidator {
  constructor() {
    this._logger = MJLogger.child('Memory:Consolidator')
  }

  /** Merge duplicate memories by content similarity (stub) */
  async mergeDuplicates(userId) {
    this._logger.info('Merge duplicates (stub)', { userId })
    return { merged: 0, stub: true }
  }

  /** Summarize long conversations */
  async summarizeConversations(userId, sessionId) {
    if (!isDbReady()) return { summarized: 0 }
    const models = getModels()
    const filter = { userId, archived: false }
    if (sessionId) filter.sessionId = sessionId

    const convs = await models.MJConversation.find({
      ...filter,
      messageCount: { $gt: 10 },
      summary: { $in: ['', null] },
    }).limit(5)

    for (const conv of convs) {
      const summary = conv.messages.slice(-5).map(m => m.content).join(' ').slice(0, 500)
      conv.summary = summary || 'Conversation summary pending AI summarization'
      await conv.save()
    }

    return { summarized: convs.length }
  }

  /** Archive old sessions */
  async archiveOldSessions(maxAgeDays = 30) {
    if (!isDbReady()) return { archived: 0 }
    const models = getModels()
    const cutoff = new Date(Date.now() - maxAgeDays * 86400000)
    const result = await models.MJSession.updateMany(
      { lastActiveAt: { $lt: cutoff }, archived: false },
      { archived: true, endedAt: new Date() }
    )
    return { archived: result.modifiedCount }
  }

  /** Expire temporary memories */
  async expireTemporary() {
    if (!isDbReady()) return { expired: 0 }
    const models = getModels()
    const now = new Date()
    const result = await models.MJMemory.deleteMany({
      expiresAt: { $lte: now, $ne: null },
      expirationPolicy: { $ne: EXPIRATION_POLICIES.NEVER },
    })
    return { expired: result.deletedCount }
  }

  /** Generate daily summary (stub) */
  async generateDailySummary(userId) {
    this._logger.info('Daily summary (stub)', { userId })
    return { summary: null, stub: true }
  }

  /** Generate weekly summary (stub) */
  async generateWeeklySummary(userId) {
    this._logger.info('Weekly summary (stub)', { userId })
    return { summary: null, stub: true }
  }

  /** Run all consolidation tasks */
  async runMaintenance(userId) {
    const results = {
      duplicates: await this.mergeDuplicates(userId),
      conversations: await this.summarizeConversations(userId),
      sessions: await this.archiveOldSessions(),
      expired: await this.expireTemporary(),
    }
    this._logger.info('Memory maintenance complete', results)
    return results
  }
}

module.exports = { MemoryConsolidator }
