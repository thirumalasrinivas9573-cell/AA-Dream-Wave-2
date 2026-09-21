/**
 * Agent Communication Bus — all messaging flows through MJ (no direct A2A)
 * @module mj/orchestrator/bus/AgentCommunicationBus
 */

const { MESSAGE_TYPES, ORCHESTRATOR_EVENTS } = require('../constants')
const { getEventBus } = require('../../events')
const { MJLogger } = require('../../logger')

class AgentCommunicationBus {
  constructor() {
    this._logger = MJLogger.child('Orchestrator:Bus')
    this._eventBus = getEventBus()
    this._messages = []
    this._subscriptions = new Map()
  }

  /**
   * MJ routes a message — agents never send directly to each other.
   * @param {Object} msg - { from, to, type, payload, runId }
   */
  route(msg) {
    const envelope = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      from: msg.from || 'mj',
      to: msg.to,
      type: msg.type || MESSAGE_TYPES.REQUEST,
      payload: msg.payload || {},
      runId: msg.runId || null,
    }

    this._messages.push(envelope)
    if (this._messages.length > 1000) this._messages.shift()

    this._logger.debug('Message routed', {
      from: envelope.from,
      to: envelope.to,
      type: envelope.type,
    })

    if (envelope.type === MESSAGE_TYPES.HEARTBEAT) {
      this._eventBus.emitEvent(ORCHESTRATOR_EVENTS.AGENT_HEARTBEAT, envelope)
    }

    return envelope
  }

  /** MJ sends request to agent */
  sendToAgent(agentId, payload, runId) {
    return this.route({
      from: 'mj',
      to: agentId,
      type: MESSAGE_TYPES.REQUEST,
      payload,
      runId,
    })
  }

  /** Agent responds to MJ only */
  receiveFromAgent(agentId, payload, runId) {
    return this.route({
      from: agentId,
      to: 'mj',
      type: MESSAGE_TYPES.RESPONSE,
      payload,
      runId,
    })
  }

  broadcast(payload, runId) {
    return this.route({
      from: 'mj',
      to: '*',
      type: MESSAGE_TYPES.BROADCAST,
      payload,
      runId,
    })
  }

  progress(agentId, payload, runId) {
    return this.route({
      from: agentId,
      to: 'mj',
      type: MESSAGE_TYPES.PROGRESS,
      payload,
      runId,
    })
  }

  getHistory(runId, limit = 50) {
    let msgs = this._messages
    if (runId) msgs = msgs.filter(m => m.runId === runId)
    return msgs.slice(-limit)
  }

  clear() {
    this._messages = []
  }
}

module.exports = { AgentCommunicationBus }
