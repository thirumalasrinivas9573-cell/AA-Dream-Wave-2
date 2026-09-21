/**
 * @module mj/ai/interfaces
 */
const { IAIProvider, MODEL_CAPABILITIES } = require('./IAIProvider')
const modelCapabilities = require('./IModelCapabilities')

module.exports = { IAIProvider, MODEL_CAPABILITIES, ...modelCapabilities }
