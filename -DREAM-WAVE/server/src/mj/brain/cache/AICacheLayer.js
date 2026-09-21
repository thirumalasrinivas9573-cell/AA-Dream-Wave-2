/**
 * AI Cache Layer (architecture only — no Redis yet)
 * @module mj/brain/cache/AICacheLayer
 */

const { MJLogger } = require('../../logger')

class AICacheLayer {
  constructor() {
    this._logger = MJLogger.child('AICache')
    this._promptCache = new Map()
    this._responseCache = new Map()
    this._semanticCache = new Map()
    this._enabled = { prompt: true, response: true, semantic: false }
  }

  /** @param {string} key @param {*} value @param {number} [ttlMs] */
  setPrompt(key, value, ttlMs = 3600000) {
    if (!this._enabled.prompt) return
    this._promptCache.set(key, { value, expiresAt: Date.now() + ttlMs })
  }

  /** @param {string} key @returns {*|null} */
  getPrompt(key) {
    const entry = this._promptCache.get(key)
    if (!entry || Date.now() > entry.expiresAt) return null
    return entry.value
  }

  /** @param {string} key @param {*} value @param {number} [ttlMs] */
  setResponse(key, value, ttlMs = 300000) {
    if (!this._enabled.response) return
    this._responseCache.set(key, { value, expiresAt: Date.now() + ttlMs })
  }

  /** @param {string} key @returns {*|null} */
  getResponse(key) {
    const entry = this._responseCache.get(key)
    if (!entry || Date.now() > entry.expiresAt) return null
    return entry.value
  }

  /** Semantic cache — future vector similarity (stub) */
  setSemantic(_embedding, _value) {
    if (!this._enabled.semantic) return
    this._logger.debug('Semantic cache set (stub)')
  }

  getSemantic(_embedding) {
    return null
  }

  /** Future Redis integration point */
  connectRedis(_config) {
    this._logger.info('Redis cache connection (architecture stub — not connected)')
  }

  getStats() {
    return {
      promptCacheSize: this._promptCache.size,
      responseCacheSize: this._responseCache.size,
      semanticCacheSize: this._semanticCache.size,
      redisConnected: false,
    }
  }

  clear() {
    this._promptCache.clear()
    this._responseCache.clear()
    this._semanticCache.clear()
  }
}

module.exports = { AICacheLayer }
