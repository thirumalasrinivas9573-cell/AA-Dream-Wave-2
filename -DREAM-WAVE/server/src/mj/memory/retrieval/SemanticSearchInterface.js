/**
 * Semantic Search Interface — extension point for future vector DB
 * @module mj/memory/retrieval/SemanticSearchInterface
 */

class SemanticSearchInterface {
  constructor() {
    this._enabled = false
    this._provider = null
  }

  /** Future: connect to Pinecone, Weaviate, etc. */
  connect(_config) {
    this._provider = 'stub'
    return { connected: false, message: 'Semantic search not implemented — use keyword search' }
  }

  /**
   * @param {string} _query
   * @param {Object} _options
   * @returns {Promise<Array>}
   */
  async search(_query, _options = {}) {
    return []
  }

  isEnabled() {
    return this._enabled
  }
}

module.exports = { SemanticSearchInterface }
