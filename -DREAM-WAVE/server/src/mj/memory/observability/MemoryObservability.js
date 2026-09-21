/**
 * MJ Memory Observability
 * @module mj/memory/observability/MemoryObservability
 */

const { MJLogger } = require('../../logger')

class MemoryObservability {
  constructor() {
    this._logger = MJLogger.child('Memory:Observability')
    this._metrics = {
      retrievals: 0,
      saves: 0,
      totalRetrievalMs: 0,
      totalSaveMs: 0,
      storageSize: 0,
      accessCounts: {},
      retrievalAccuracy: null,
    }
  }

  recordRetrieval(durationMs, resultCount) {
    this._metrics.retrievals++
    this._metrics.totalRetrievalMs += durationMs
    this._logger.performance('Memory retrieval', { durationMs, resultCount })
  }

  recordSave(durationMs) {
    this._metrics.saves++
    this._metrics.totalSaveMs += durationMs
  }

  recordAccess(memoryId) {
    this._metrics.accessCounts[memoryId] = (this._metrics.accessCounts[memoryId] || 0) + 1
  }

  updateStorageSize(counts) {
    this._metrics.storageSize = counts
  }

  getMetrics() {
    return {
      ...this._metrics,
      avgRetrievalMs: this._metrics.retrievals
        ? Math.round(this._metrics.totalRetrievalMs / this._metrics.retrievals)
        : 0,
      avgSaveMs: this._metrics.saves
        ? Math.round(this._metrics.totalSaveMs / this._metrics.saves)
        : 0,
      topAccessed: Object.entries(this._metrics.accessCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id, count]) => ({ id, count })),
    }
  }
}

let _instance = null

function getMemoryObservability() {
  if (!_instance) _instance = new MemoryObservability()
  return _instance
}

module.exports = { MemoryObservability, getMemoryObservability }
