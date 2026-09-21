/**
 * Agent Permission Manager — centrally managed capability permissions
 * @module mj/orchestrator/permissions/AgentPermissionManager
 */

const { AGENT_PERMISSIONS } = require('../constants')
const { MJLogger } = require('../../logger')

class AgentPermissionManager {
  constructor() {
    this._logger = MJLogger.child('Orchestrator:Permissions')
    this._agentPermissions = new Map()
    this._pendingApprovals = []
  }

  /** Default: no powerful permissions granted */
  getDefaults() {
    return Object.values(AGENT_PERMISSIONS).reduce((acc, p) => {
      acc[p] = false
      return acc
    }, {})
  }

  getAgentPermissions(agentId) {
    if (!this._agentPermissions.has(agentId)) {
      this._agentPermissions.set(agentId, { ...this.getDefaults() })
    }
    return { ...this._agentPermissions.get(agentId) }
  }

  requestPermission(agentId, permission, context = {}) {
    this._pendingApprovals.push({
      id: `perm_${Date.now()}`,
      agentId,
      permission,
      context,
      requestedAt: Date.now(),
      status: 'pending',
    })
    this._logger.info('Permission requested', { agentId, permission })
    return { granted: false, pending: true, stub: true }
  }

  grant(agentId, permission) {
    const perms = this.getAgentPermissions(agentId)
    if (Object.prototype.hasOwnProperty.call(perms, permission)) {
      perms[permission] = true
      this._agentPermissions.set(agentId, perms)
      return { granted: true, permission }
    }
    return { granted: false, reason: 'unknown_permission' }
  }

  revoke(agentId, permission) {
    const perms = this.getAgentPermissions(agentId)
    if (Object.prototype.hasOwnProperty.call(perms, permission)) {
      perms[permission] = false
      this._agentPermissions.set(agentId, perms)
    }
    return { revoked: true }
  }

  check(agentId, permission) {
    const perms = this.getAgentPermissions(agentId)
    return { allowed: !!perms[permission], permission }
  }

  getPendingApprovals() {
    return [...this._pendingApprovals]
  }
}

module.exports = { AgentPermissionManager, AGENT_PERMISSIONS }
