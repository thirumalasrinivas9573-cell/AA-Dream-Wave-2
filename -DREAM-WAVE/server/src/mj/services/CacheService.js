/**
 * MJ Cache Service
 * Architecture for response and context caching (stub).
 * @module mj/services/CacheService
 */

const { MJLogger } = require('../logger')

class CacheService {
  constructor(options = {}) {
    this._logger = MJLogger.child('CacheService')
    this._store = new Map()
    this._ttlMs = options.ttlMs ?? 300000
  }

  /** @param {string} key @param {*} value @param {number} [ttlMs] */
  set(key, value, ttlMs) {
    this._store.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this._ttlMs),
    })
  }

  /** @param {string} key @returns {*|null} */
  get(key) {
    const entry = this._store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this._store.delete(key)
      return null
    }
    return entry.value
  }

  /** @param {string} key */
  delete(key) {
    this._store.delete(key)
  }

  clear() {
    this._store.clear()
  }
}

module.exports = { CacheService }
