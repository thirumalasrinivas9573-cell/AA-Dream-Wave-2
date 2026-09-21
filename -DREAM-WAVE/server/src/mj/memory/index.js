/**
 * @module mj/memory
 */
const { MemoryEngine } = require('./MemoryEngine')
const { MEMORY_CATEGORIES, MJ_COLLECTIONS, EXPIRATION_POLICIES } = require('./constants')
const memoryInterfaces = require('./interfaces')
const { MemoryPipeline } = require('./pipeline/MemoryPipeline')
const { MemoryRetrievalService } = require('./retrieval/MemoryRetrievalService')
const { MemoryStorageService } = require('./storage/MemoryStorageService')
const { MemoryConsolidator } = require('./consolidation/MemoryConsolidator')
const { getMemoryObservability } = require('./observability/MemoryObservability')

module.exports = {
  MemoryEngine,
  MemoryPipeline,
  MemoryRetrievalService,
  MemoryStorageService,
  MemoryConsolidator,
  getMemoryObservability,
  MEMORY_CATEGORIES,
  MJ_COLLECTIONS,
  EXPIRATION_POLICIES,
  ...memoryInterfaces,
}
