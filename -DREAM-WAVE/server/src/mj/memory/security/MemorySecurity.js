/**
 * MJ Memory Security — user isolation and validation
 * @module mj/memory/security/MemorySecurity
 */

const { ValidationError } = require('../../errors')
const { MJLogger } = require('../../logger')

class MemorySecurity {
  constructor() {
    this._logger = MJLogger.child('Memory:Security')
  }

  validateOperation(payload, actorUserId) {
    if (!payload?.userId) {
      throw new ValidationError('userId is required for memory operations')
    }
    this.validateUserScope(payload.userId, actorUserId)
  }

  validateUserScope(resourceUserId, actorUserId) {
    if (!resourceUserId) {
      throw new ValidationError('Memory resource has no userId')
    }
    if (actorUserId && resourceUserId !== actorUserId) {
      this._logger.warning('Memory access denied — user mismatch', {
        resourceUserId,
        actorUserId,
      })
      throw new ValidationError('Access denied — memory belongs to another user')
    }
  }

  sanitizeContent(content) {
    if (!content || typeof content !== 'string') return ''
    return content
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
      .slice(0, 50000)
  }

  /** Future: encrypt sensitive fields */
  encryptField(value) {
    return { value, encrypted: false, stub: true }
  }

  /** Future: shared workspace permission hooks */
  checkWorkspacePermission(_userId, _workspaceId, _action) {
    return { allowed: true, stub: true }
  }
}

module.exports = { MemorySecurity }
