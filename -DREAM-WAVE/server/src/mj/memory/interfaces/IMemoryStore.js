/**
 * Base Memory Store Interface
 * @module mj/memory/interfaces/IMemoryStore
 */

/**
 * @interface IMemoryStore
 * Contract for all MJ memory implementations.
 */
class IMemoryStore {
  /** @returns {string} */
  get type() {
    throw new Error('IMemoryStore.type must be implemented')
  }

  /** @param {string} id @param {*} entry @returns {Promise<void>} */
  async store(_id, _entry) {
    throw new Error('IMemoryStore.store must be implemented')
  }

  /** @param {string} id @returns {Promise<*>} */
  async retrieve(_id) {
    throw new Error('IMemoryStore.retrieve must be implemented')
  }

  /** @param {Object} query @returns {Promise<Array>} */
  async search(_query) {
    throw new Error('IMemoryStore.search must be implemented')
  }

  /** @param {string} [id] @returns {Promise<void>} */
  async clear(_id) {
    throw new Error('IMemoryStore.clear must be implemented')
  }

  /** @returns {Promise<number>} */
  async count() {
    throw new Error('IMemoryStore.count must be implemented')
  }
}

module.exports = { IMemoryStore }
