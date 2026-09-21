/**
 * Agent Interface Definitions
 * @module mj/agents/interfaces
 */

/**
 * @interface IAgent
 * Contract all MJ agents must implement.
 */
class IAgent {
  /** @returns {string} */
  get id() { throw new Error('IAgent.id must be implemented') }

  /** @returns {string} */
  get type() { throw new Error('IAgent.type must be implemented') }

  /** @returns {string} */
  get name() { throw new Error('IAgent.name must be implemented') }

  /** @returns {string[]} */
  get capabilities() { throw new Error('IAgent.capabilities must be implemented') }

  /** @param {Object} task @returns {Promise<Object>} */
  async execute(_task) { throw new Error('IAgent.execute must be implemented') }

  /** @returns {Promise<boolean>} */
  async isAvailable() { throw new Error('IAgent.isAvailable must be implemented') }

  /** @returns {Object} */
  toDescriptor() { throw new Error('IAgent.toDescriptor must be implemented') }
}

/**
 * Base agent stub — extend for concrete agent implementations.
 */
class BaseAgent extends IAgent {
  /**
   * @param {Object} config
   * @param {string} config.id
   * @param {string} config.type
   * @param {string} config.name
   * @param {string[]} [config.capabilities]
   */
  constructor(config) {
    super()
    this._id = config.id
    this._type = config.type
    this._name = config.name
    this._capabilities = config.capabilities || []
    this._active = false
  }

  get id() { return this._id }
  get type() { return this._type }
  get name() { return this._name }
  get capabilities() { return [...this._capabilities] }

  async execute(_task) {
    return { success: false, message: 'Agent execute not implemented' }
  }

  async isAvailable() {
    return this._active
  }

  toDescriptor() {
    return {
      id: this._id,
      type: this._type,
      name: this._name,
      capabilities: this._capabilities,
      active: this._active,
    }
  }

  activate() { this._active = true }
  deactivate() { this._active = false }
}

module.exports = { IAgent, BaseAgent }
