/**
 * MJ Gateway Standardized API Response Builder
 * @module mj/gateway/ApiResponse
 */

const { getMJ } = require('../MJController')

/**
 * Build standardized MJ API response envelope.
 * @param {Object} options
 * @returns {Object}
 */
function buildApiResponse(options = {}) {
  const {
    success = true,
    requestId = null,
    executionTime = 0,
    payload = null,
    errors = [],
    warnings = [],
    mjState = null,
  } = options

  let state = mjState
  if (!state) {
    try {
      state = getMJ().getState()
    } catch {
      state = { running: false, state: 'idle' }
    }
  }

  return {
    success,
    timestamp: Date.now(),
    requestId,
    executionTime,
    mjState: state,
    payload,
    errors,
    warnings,
  }
}

module.exports = { buildApiResponse }
