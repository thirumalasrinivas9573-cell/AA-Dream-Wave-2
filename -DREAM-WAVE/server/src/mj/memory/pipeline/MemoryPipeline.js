/**
 * MJ Memory Pipeline
 * Every user request: Search → Rank → Inject → (AI) → Summarize → Store → Update
 * @module mj/memory/pipeline/MemoryPipeline
 */

const { MEMORY_PIPELINE_STAGES, MEMORY_CATEGORIES } = require('../constants')
const { MJLogger } = require('../../logger')
const { getMemoryObservability } = require('../observability/MemoryObservability')

class MemoryPipeline {
  /**
   * @param {import('../retrieval/MemoryRetrievalService').MemoryRetrievalService} retrieval
   * @param {import('../storage/MemoryStorageService').MemoryStorageService} storage
   */
  constructor(retrieval, storage) {
    this._retrieval = retrieval
    this._storage = storage
    this._logger = MJLogger.child('Memory:Pipeline')
    this._observability = getMemoryObservability()
  }

  /**
   * Pre-reasoning: search, rank, inject context.
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  async retrieveContext(params = {}) {
    const { command, context, correlationId } = params
    const userId = command?.userId || context?.userId
    const sessionId = context?.sessionId || command?.metadata?.sessionId
    const query = command?.input || ''

    const trace = { stages: [], correlationId }

    trace.stages.push(MEMORY_PIPELINE_STAGES.SEARCH)
    const searchResult = await this._retrieval.search({
      userId,
      query,
      sessionId,
      projectId: context?.projectId || command?.metadata?.projectId,
      limit: 15,
    })

    trace.stages.push(MEMORY_PIPELINE_STAGES.RANK)
    const ranked = searchResult.results || []

    trace.stages.push(MEMORY_PIPELINE_STAGES.INJECT)
    const working = sessionId ? this._retrieval.getWorking(sessionId) : null

    const memoryContext = {
      memories: ranked,
      totalFound: searchResult.total,
      retrievalTimeMs: searchResult.retrievalTimeMs,
      working,
      injectedSummary: this._buildInjectedSummary(ranked),
      sessionId,
      userId,
    }

    if (sessionId && userId) {
      this._retrieval.setWorking(sessionId, {
        activeInput: query,
        retrievedCount: ranked.length,
        timestamp: Date.now(),
      })
      await this._storage.ensureSession(userId, sessionId)
    }

    this._logger.debug('Memory context injected', {
      userId,
      found: ranked.length,
      correlationId,
    })

    return { memoryContext, trace, rankedMemories: ranked }
  }

  /**
   * Post-response: summarize, store, update.
   * @param {Object} params
   */
  async persistInteraction(params = {}) {
    const {
      command,
      context,
      reasoningResult,
      response,
      rankedMemories = [],
    } = params

    const userId = command?.userId || context?.userId
    const sessionId = context?.sessionId
    if (!userId) return { stored: false, reason: 'no_userId' }

    const trace = { stages: [] }

    trace.stages.push(MEMORY_PIPELINE_STAGES.SUMMARIZE)
    const summary = this._summarizeInteraction(command, reasoningResult, response)

    trace.stages.push(MEMORY_PIPELINE_STAGES.STORE)

    const stored = []

    stored.push(await this._storage.save({
      userId,
      sessionId,
      category: MEMORY_CATEGORIES.CONVERSATION,
      content: command?.input || '',
      summary,
      tags: [reasoningResult?.intent?.type, 'interaction'].filter(Boolean),
      importanceScore: 0.6,
      metadata: {
        intent: reasoningResult?.intent?.type,
        commandId: command?.id,
        responsePreview: (response?.content || reasoningResult?.response || '').slice(0, 300),
      },
    }, userId))

    if (reasoningResult?.goal?.primary) {
      stored.push(await this._storage.save({
        userId,
        sessionId,
        category: MEMORY_CATEGORIES.KNOWLEDGE,
        content: reasoningResult.goal.primary,
        summary: reasoningResult.reasoningSummary?.slice(0, 300) || '',
        tags: ['goal', reasoningResult?.intent?.type].filter(Boolean),
        importanceScore: 0.7,
        metadata: { source: 'reasoning_pipeline' },
      }, userId))
    }

    trace.stages.push(MEMORY_PIPELINE_STAGES.UPDATE)
    for (const mem of rankedMemories.slice(0, 3)) {
      if (mem.id) {
        await this._retrieval.incrementAccess(mem.id, mem.collection)
        this._observability.recordAccess(mem.id)
      }
    }

    this._logger.info('Memory persisted', { userId, stored: stored.length })
    return { stored: true, count: stored.length, trace }
  }

  _buildInjectedSummary(memories) {
    if (!memories.length) return null
    return memories.slice(0, 5).map((m, i) =>
      `[${i + 1}] (${m.category}) ${m.summary || m.content?.slice(0, 120)}`
    ).join('\n')
  }

  _summarizeInteraction(command, reasoningResult, response) {
    const parts = []
    if (command?.input) parts.push(`User: ${command.input.slice(0, 150)}`)
    if (reasoningResult?.intent?.type) parts.push(`Intent: ${reasoningResult.intent.type}`)
    if (reasoningResult?.goal?.primary) parts.push(`Goal: ${reasoningResult.goal.primary.slice(0, 100)}`)
    const resp = response?.content || reasoningResult?.response || ''
    if (resp) parts.push(`Response: ${resp.slice(0, 150)}`)
    return parts.join(' | ')
  }
}

module.exports = { MemoryPipeline, MEMORY_PIPELINE_STAGES }
