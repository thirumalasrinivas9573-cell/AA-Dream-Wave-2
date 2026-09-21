/**
 * @module mj/errors
 */
const { MJError } = require('./MJError')
const { ErrorHandler, getErrorHandler } = require('./ErrorHandler')
const errorTypes = require('./errorTypes')

module.exports = {
  MJError,
  ErrorHandler,
  getErrorHandler,
  ...errorTypes,
}
