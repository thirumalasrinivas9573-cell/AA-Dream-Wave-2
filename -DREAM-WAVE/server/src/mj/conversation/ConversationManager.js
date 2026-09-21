/**
 * MJ Conversation Manager
 * Manages dialogue sessions and conversation flow (stub).
 * @module mj/conversation/ConversationManager
 */

const { MJLogger } = require('../logger')

class ConversationManager {
  constructor() {
    this._logger = MJLogger.child('ConversationManager')
    this._sessions = new Map()
  }

  /**
   * Get or create a conversation session.
   * @param {string} sessionId
   * @returns {Object}
   */
  getSession(sessionId) {
    if (!this._sessions.has(sessionId)) {
      this._sessions.set(sessionId, {
        id: sessionId,
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    }
    return this._sessions.get(sessionId)
  }

  /**
   * Process command within conversation context (stub).
   * @param {Object} command
   * @param {Object} context
   * @returns {Promise<Object>}
   */
  async process(command, context) {
    const session = this.getSession(context.sessionId)
    session.messages.push({
      role: 'user',
      content: command.input,
      timestamp: Date.now(),
    })
    session.updatedAt = Date.now()

    this._logger.debug('Conversation processed (stub)', { sessionId: context.sessionId })
    return { session, context }
  }

  /** @param {string} sessionId */
  clearSession(sessionId) {
    this._sessions.delete(sessionId)
  }
}

module.exports = { ConversationManager }
