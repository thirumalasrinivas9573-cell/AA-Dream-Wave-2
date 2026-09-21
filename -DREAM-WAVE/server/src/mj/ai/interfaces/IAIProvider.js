/**
 * AI Provider Interface
 * @module mj/ai/interfaces/IAIProvider
 */

const { MODEL_CAPABILITIES } = require('../constants')

class IAIProvider {
  /** @returns {string} */
  get name() { throw new Error('IAIProvider.name required') }

  /** @returns {string[]} */
  get capabilities() { throw new Error('IAIProvider.capabilities required') }

  /** @returns {boolean} */
  isAvailable() { throw new Error('IAIProvider.isAvailable required') }

  /**
   * @param {Array} messages
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  async chatCompletion(_messages, _options) {
    throw new Error('IAIProvider.chatCompletion required')
  }

  /**
   * @param {Array} messages
   * @param {Object} [schema]
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  async structuredJSON(_messages, _schema, _options) {
    throw new Error('IAIProvider.structuredJSON required')
  }

  /** @param {string} _text @returns {Promise<Array>} */
  async embeddings(_text) {
    throw new Error('IAIProvider.embeddings not implemented')
  }

  /** @param {Array} _messages @returns {AsyncIterable} */
  async stream(_messages) {
    throw new Error('IAIProvider.stream not implemented')
  }

  supports(capability) {
    return this.capabilities.includes(capability)
  }
}

module.exports = { IAIProvider, MODEL_CAPABILITIES }
