/**
 * Voice Security — permissions, rate limiting hooks, key protection
 * @module mj/voice/security/VoiceSecurity
 */

const { ValidationError } = require('../../errors')
const { PERMISSION_TYPES } = require('../../constants')
const { MJLogger } = require('../../logger')

class VoiceSecurity {
  constructor(permissionManager = null) {
    this._logger = MJLogger.child('Voice:Security')
    this._permissionManager = permissionManager
    this._rateLimits = new Map()
  }

  setPermissionManager(pm) {
    this._permissionManager = pm
  }

  validateUserId(userId) {
    if (!userId) throw new ValidationError('userId is required for voice operations')
  }

  checkMicrophonePermission(userId) {
    if (!this._permissionManager) return { granted: true, stub: true }
    const granted = this._permissionManager.isGranted(PERMISSION_TYPES.MICROPHONE)
    if (!granted) {
      this._logger.warning('Microphone permission denied', { userId })
    }
    return { granted, permission: PERMISSION_TYPES.MICROPHONE }
  }

  checkVoiceProviderPermission(providerName) {
    return { allowed: true, provider: providerName, stub: true }
  }

  /** Simple in-memory rate limit — future: Redis */
  checkRateLimit(userId, action = 'voice', maxPerMinute = 60) {
    const key = `${userId}:${action}`
    const now = Date.now()
    const window = this._rateLimits.get(key) || { count: 0, resetAt: now + 60000 }

    if (now > window.resetAt) {
      window.count = 0
      window.resetAt = now + 60000
    }

    window.count++
    this._rateLimits.set(key, window)

    if (window.count > maxPerMinute) {
      throw new ValidationError('Voice rate limit exceeded')
    }

    return { allowed: true, remaining: maxPerMinute - window.count }
  }

  /** Strip API keys from outbound responses */
  sanitizeProviderConfig(config = {}) {
    const safe = { ...config }
    delete safe.apiKey
    delete safe.secret
    delete safe.token
    return safe
  }
}

module.exports = { VoiceSecurity }
