/**
 * MJ Capability Manager
 * Manages system capabilities and feature gates (architecture only).
 * @module mj/security/CapabilityManager
 */

const { MJLogger } = require('../logger')

const DEFAULT_CAPABILITIES = {
  voice: false,
  automation: false,
  memory: true,
  multiAgent: true,
  streaming: false,
  learning: false,
  research: false,
  video: false,
  animation: false,
  desktopControl: false,
}

class CapabilityManager {
  constructor() {
    this._logger = MJLogger.child('CapabilityManager')
    this._capabilities = { ...DEFAULT_CAPABILITIES }
  }

  /** @param {string} capability @returns {boolean} */
  isEnabled(capability) {
    return this._capabilities[capability] ?? false
  }

  /** @param {string} capability @param {boolean} enabled */
  set(capability, enabled) {
    this._capabilities[capability] = enabled
    this._logger.debug(`Capability ${capability} → ${enabled}`)
  }

  /** @returns {Object} */
  getAll() {
    return { ...this._capabilities }
  }

  /** Enable capability when permission is granted. */
  enableWithPermission(capability, permissionManager, permissionType) {
    if (permissionManager.isGranted(permissionType)) {
      this.set(capability, true)
      return true
    }
    return false
  }
}

module.exports = { CapabilityManager }
