/**
 * Base MJ Error
 * @module mj/errors/MJError
 */

const { ERROR_TYPES } = require('../constants')

class MJError extends Error {
  /**
   * @param {string} message
   * @param {Object} [options]
   * @param {string} [options.type]
   * @param {string} [options.code]
   * @param {boolean} [options.recoverable]
   * @param {Object} [options.context]
   * @param {Error} [options.cause]
   */
  constructor(message, options = {}) {
    super(message)
    this.name = 'MJError'
    this.type = options.type || ERROR_TYPES.RECOVERABLE
    this.code = options.code || 'MJ_UNKNOWN'
    this.recoverable = options.recoverable ?? true
    this.context = options.context || {}
    this.timestamp = Date.now()
    if (options.cause) this.cause = options.cause
    Error.captureStackTrace?.(this, this.constructor)
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      code: this.code,
      recoverable: this.recoverable,
      context: this.context,
      timestamp: this.timestamp,
    }
  }
}

module.exports = { MJError }
