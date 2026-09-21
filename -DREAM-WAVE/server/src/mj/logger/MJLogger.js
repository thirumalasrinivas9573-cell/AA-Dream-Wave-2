/**
 * MJ Enterprise Logger
 * Structured logging with domain-specific channels for MJ subsystems.
 * @module mj/logger/MJLogger
 */

const { LOG_LEVELS, MJ_MODULE_NAME } = require('../constants')

class MJLogger {
  /**
   * @param {string} [namespace]
   */
  constructor(namespace = MJ_MODULE_NAME) {
    this._namespace = namespace
    this._enabled = true
    this._minLevel = LOG_LEVELS.DEBUG
  }

  /**
   * Create a child logger with a sub-namespace.
   * @param {string} subNamespace
   * @returns {MJLogger}
   */
  child(subNamespace) {
    return new MJLogger(`${this._namespace}:${subNamespace}`)
  }

  /**
   * @param {string} level
   * @param {string} message
   * @param {Object} [meta]
   */
  _log(level, message, meta = {}) {
    if (!this._enabled) return

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      namespace: this._namespace,
      message,
      ...meta,
    }

    const formatted = `[${entry.timestamp}] [MJ:${level.toUpperCase()}] [${this._namespace}] ${message}`

    switch (level) {
      case LOG_LEVELS.CRITICAL:
      case LOG_LEVELS.ERROR:
        console.error(formatted, Object.keys(meta).length ? meta : '')
        break
      case LOG_LEVELS.WARNING:
        console.warn(formatted, Object.keys(meta).length ? meta : '')
        break
      default:
        console.log(formatted, Object.keys(meta).length ? meta : '')
    }

    return entry
  }

  info(message, meta) { return this._log(LOG_LEVELS.INFO, message, meta) }
  debug(message, meta) { return this._log(LOG_LEVELS.DEBUG, message, meta) }
  warning(message, meta) { return this._log(LOG_LEVELS.WARNING, message, meta) }
  critical(message, meta) { return this._log(LOG_LEVELS.CRITICAL, message, meta) }
  performance(message, meta) { return this._log(LOG_LEVELS.PERFORMANCE, message, meta) }
  ai(message, meta) { return this._log(LOG_LEVELS.AI, message, meta) }
  voice(message, meta) { return this._log(LOG_LEVELS.VOICE, message, meta) }
  automation(message, meta) { return this._log(LOG_LEVELS.AUTOMATION, message, meta) }
  research(message, meta) { return this._log(LOG_LEVELS.RESEARCH, message, meta) }
  planner(message, meta) { return this._log(LOG_LEVELS.PLANNER, message, meta) }
  error(message, meta) { return this._log(LOG_LEVELS.ERROR, message, meta) }

  /** @param {boolean} enabled */
  setEnabled(enabled) {
    this._enabled = enabled
  }
}

const defaultLogger = new MJLogger()

module.exports = { MJLogger, defaultLogger }
