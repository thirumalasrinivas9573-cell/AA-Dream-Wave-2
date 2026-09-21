/**
 * @module mj/core
 */
const { MJCore } = require('./MJCore')
const { ProcessingPipeline } = require('./ProcessingPipeline')
const { bootstrapMJ } = require('./bootstrap')

module.exports = { MJCore, ProcessingPipeline, bootstrapMJ }
