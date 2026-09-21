/**
 * Typed MJ Error Classes
 * @module mj/errors/errorTypes
 */

const { MJError } = require('../MJError')
const { ERROR_TYPES } = require('../../constants')

class RecoverableError extends MJError {
  constructor(message, options = {}) {
    super(message, { ...options, type: ERROR_TYPES.RECOVERABLE, recoverable: true })
    this.name = 'RecoverableError'
  }
}

class FatalError extends MJError {
  constructor(message, options = {}) {
    super(message, { ...options, type: ERROR_TYPES.FATAL, recoverable: false })
    this.name = 'FatalError'
  }
}

class ValidationError extends MJError {
  constructor(message, options = {}) {
    super(message, { ...options, type: ERROR_TYPES.VALIDATION, recoverable: true })
    this.name = 'ValidationError'
  }
}

class AIError extends MJError {
  constructor(message, options = {}) {
    super(message, { ...options, type: ERROR_TYPES.AI, recoverable: true })
    this.name = 'AIError'
  }
}

class VoiceError extends MJError {
  constructor(message, options = {}) {
    super(message, { ...options, type: ERROR_TYPES.VOICE, recoverable: true })
    this.name = 'VoiceError'
  }
}

class AutomationError extends MJError {
  constructor(message, options = {}) {
    super(message, { ...options, type: ERROR_TYPES.AUTOMATION, recoverable: true })
    this.name = 'AutomationError'
  }
}

class DatabaseError extends MJError {
  constructor(message, options = {}) {
    super(message, { ...options, type: ERROR_TYPES.DATABASE, recoverable: true })
    this.name = 'DatabaseError'
  }
}

class NetworkError extends MJError {
  constructor(message, options = {}) {
    super(message, { ...options, type: ERROR_TYPES.NETWORK, recoverable: true })
    this.name = 'NetworkError'
  }
}

module.exports = {
  RecoverableError,
  FatalError,
  ValidationError,
  AIError,
  VoiceError,
  AutomationError,
  DatabaseError,
  NetworkError,
}
