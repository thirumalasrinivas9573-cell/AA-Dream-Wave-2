/**
 * Centralized MJ Error Handler
 * @module mj/errors/ErrorHandler
 */

const { MJError } = require('./MJError')
const { FatalError } = require('./errorTypes')
const { MJ_EVENTS } = require('../constants')
const { getEventBus } = require('../events')
const { MJLogger } = require('../logger')

class ErrorHandler {
  constructor() {
    this._logger = MJLogger.child('ErrorHandler')
    this._eventBus = getEventBus()
    this._handlers = new Map()
  }

  /**
   * Register a custom handler for a specific error type.
   * @param {string} errorType
   * @param {Function} handler
   */
  registerHandler(errorType, handler) {
    this._handlers.set(errorType, handler)
  }

  /**
   * Handle an error centrally.
   * @param {Error|MJError} error
   * @param {Object} [context]
   * @returns {{ handled: boolean, recoverable: boolean, error: Object }}
   */
  handle(error, context = {}) {
    const mjError = error instanceof MJError
      ? error
      : new MJError(error.message, { cause: error, context })

    this._logger.error(mjError.message, {
      type: mjError.type,
      code: mjError.code,
      ...context,
    })

    this._eventBus.emitEvent(MJ_EVENTS.ERROR_OCCURRED, {
      error: mjError.toJSON(),
      context,
    })

    const customHandler = this._handlers.get(mjError.type)
    if (customHandler) {
      try {
        customHandler(mjError, context)
      } catch (handlerError) {
        this._logger.critical('Error handler failed', { handlerError: handlerError.message })
      }
    }

    return {
      handled: true,
      recoverable: mjError.recoverable,
      error: mjError.toJSON(),
    }
  }

  /**
   * Wrap an async function with centralized error handling.
   * @param {Function} fn
   * @param {Object} [context]
   * @returns {Function}
   */
  wrapAsync(fn, context = {}) {
    return async (...args) => {
      try {
        return await fn(...args)
      } catch (error) {
        this.handle(error, context)
        if (error instanceof FatalError || (error instanceof MJError && !error.recoverable)) {
          throw error
        }
        return null
      }
    }
  }
}

let _instance = null

function getErrorHandler() {
  if (!_instance) _instance = new ErrorHandler()
  return _instance
}

module.exports = { ErrorHandler, getErrorHandler }
