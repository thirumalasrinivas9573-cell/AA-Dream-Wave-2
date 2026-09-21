/**
 * MJ Token Manager
 * Tracks input/output tokens, cost estimates, execution time.
 * @module mj/brain/tokens/TokenManager
 */

const { MJLogger } = require('../../logger')

const COST_PER_1K = {
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
  default: { input: 0.001, output: 0.002 },
}

class TokenManager {
  constructor() {
    this._logger = MJLogger.child('TokenManager')
    this._sessions = new Map()
    this._totals = { inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCost: 0 }
  }

  /**
   * Start tracking for a request.
   * @param {string} requestId
   */
  startRequest(requestId) {
    this._sessions.set(requestId, {
      requestId,
      startedAt: Date.now(),
      calls: [],
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
    })
  }

  /**
   * Record token usage from an AI call.
   * @param {string} requestId
   * @param {Object} usage
   */
  record(requestId, usage = {}) {
    const session = this._sessions.get(requestId)
    if (!session) return

    const input = usage.inputTokens || 0
    const output = usage.outputTokens || 0
    const total = usage.totalTokens || input + output
    const cost = this._estimateCost(usage.model, input, output)

    session.calls.push({ ...usage, cost, timestamp: Date.now() })
    session.inputTokens += input
    session.outputTokens += output
    session.totalTokens += total
    session.estimatedCost += cost

    this._totals.inputTokens += input
    this._totals.outputTokens += output
    this._totals.totalTokens += total
    this._totals.estimatedCost += cost
  }

  _estimateCost(model, inputTokens, outputTokens) {
    const rates = COST_PER_1K[model] || COST_PER_1K.default
    return (inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output
  }

  /**
   * Finalize request tracking.
   * @param {string} requestId
   * @returns {Object}
   */
  finalize(requestId) {
    const session = this._sessions.get(requestId)
    if (!session) return null

    session.executionTimeMs = Date.now() - session.startedAt
    const summary = { ...session }
    this._sessions.delete(requestId)
    return summary
  }

  /** @returns {Object} Global totals */
  getTotals() {
    return { ...this._totals }
  }
}

let _instance = null

function getTokenManager() {
  if (!_instance) _instance = new TokenManager()
  return _instance
}

module.exports = { TokenManager, getTokenManager }
