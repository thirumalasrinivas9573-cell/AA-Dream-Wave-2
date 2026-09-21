/**
 * MJ Permission Manager
 * Future device, automation, microphone, and camera permissions (architecture only).
 * @module mj/security/PermissionManager
 */

const { PERMISSION_TYPES } = require('../constants')
const { MJLogger } = require('../logger')

class PermissionManager {
  constructor() {
    this._logger = MJLogger.child('PermissionManager')
    this._permissions = new Map()
    this._initializeDefaults()
  }

  _initializeDefaults() {
    for (const type of Object.values(PERMISSION_TYPES)) {
      this._permissions.set(type, { granted: false, requestedAt: null, grantedAt: null })
    }
  }

  /**
   * Request a permission (stub).
   * @param {string} permissionType
   * @param {Object} [context]
   * @returns {Promise<{ granted: boolean, type: string }>}
   */
  async request(permissionType, context = {}) {
    this._logger.debug('Permission requested (stub)', { permissionType, context })
    return { granted: false, type: permissionType, stub: true }
  }

  /**
   * Check if permission is granted.
   * @param {string} permissionType
   * @returns {boolean}
   */
  isGranted(permissionType) {
    return this._permissions.get(permissionType)?.granted ?? false
  }

  /**
   * Grant permission (stub — future: user consent flow).
   * @param {string} permissionType
   */
  grant(permissionType) {
    this._permissions.set(permissionType, {
      granted: true,
      requestedAt: Date.now(),
      grantedAt: Date.now(),
    })
  }

  /** Revoke permission. */
  revoke(permissionType) {
    this._permissions.set(permissionType, { granted: false, requestedAt: null, grantedAt: null })
  }

  /** @returns {Object} All permission states */
  getAll() {
    return Object.fromEntries(this._permissions)
  }
}

module.exports = { PermissionManager }
