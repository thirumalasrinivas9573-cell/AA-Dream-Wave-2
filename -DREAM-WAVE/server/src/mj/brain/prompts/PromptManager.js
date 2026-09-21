/**
 * Centralized Prompt Manager
 * @module mj/brain/prompts/PromptManager
 */

const { PROMPTS } = require('./templates')
const { PROMPT_TYPES } = require('../../ai/constants')
const { MJLogger } = require('../../logger')

class PromptManager {
  constructor() {
    this._logger = MJLogger.child('PromptManager')
    this._custom = new Map()
  }

  /**
   * Get a prompt template by type.
   * @param {string} type
   * @param {Object} [variables]
   * @returns {string}
   */
  get(type, variables = {}) {
    const key = type.toLowerCase()
    let template = this._custom.get(key) || PROMPTS[key] || PROMPTS.system

    for (const [k, v] of Object.entries(variables)) {
      template = template.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v))
    }

    return template
  }

  /** @param {string} type @param {string} template */
  register(type, template) {
    this._custom.set(type.toLowerCase(), template)
    this._logger.debug(`Custom prompt registered: ${type}`)
  }

  /** Build messages array for AI provider */
  buildMessages(type, userContent, context = {}) {
    const systemPrompt = this.get(type, context)
    const messages = [{ role: 'system', content: systemPrompt }]

    if (context.conversationHistory?.length) {
      messages.push(...context.conversationHistory.slice(-6))
    }

    messages.push({ role: 'user', content: userContent })
    return messages
  }

  getTypes() {
    return Object.values(PROMPT_TYPES)
  }
}

let _instance = null

function getPromptManager() {
  if (!_instance) _instance = new PromptManager()
  return _instance
}

module.exports = { PromptManager, getPromptManager, PROMPT_TYPES }
