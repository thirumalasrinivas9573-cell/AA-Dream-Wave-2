/**
 * MJ Utility Functions
 * @module mj/utils
 */

/**
 * Generate a unique ID with optional prefix.
 * @param {string} [prefix]
 * @returns {string}
 */
function generateId(prefix = 'mj') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Delay execution (async sleep).
 * @param {number} ms
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Deep freeze an object (immutable config).
 * @param {Object} obj
 * @returns {Object}
 */
function deepFreeze(obj) {
  Object.freeze(obj)
  Object.getOwnPropertyNames(obj).forEach(prop => {
    if (obj[prop] !== null && typeof obj[prop] === 'object' && !Object.isFrozen(obj[prop])) {
      deepFreeze(obj[prop])
    }
  })
  return obj
}

/**
 * Safely pick defined properties from an object.
 * @param {Object} obj
 * @param {string[]} keys
 * @returns {Object}
 */
function pick(obj, keys) {
  return keys.reduce((acc, key) => {
    if (obj[key] !== undefined) acc[key] = obj[key]
    return acc
  }, {})
}

module.exports = { generateId, delay, deepFreeze, pick }
