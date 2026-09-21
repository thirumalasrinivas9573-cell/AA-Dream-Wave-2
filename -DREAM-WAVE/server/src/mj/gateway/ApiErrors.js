/**
 * MJ Gateway Typed Errors
 * Never expose stack traces to API clients.
 * @module mj/gateway/ApiErrors
 */

const GATEWAY_ERROR_TYPES = {
  VALIDATION: 'validation',
  INTERNAL: 'internal',
  PIPELINE: 'pipeline',
  PLANNER: 'planner',
  MEMORY: 'memory',
  AGENT: 'agent',
  UNKNOWN: 'unknown',
}

class GatewayError extends Error {
  constructor(message, options = {}) {
    super(message)
    this.name = 'GatewayError'
    this.type = options.type || GATEWAY_ERROR_TYPES.UNKNOWN
    this.code = options.code || 'MJ_GW_UNKNOWN'
    this.statusCode = options.statusCode || 500
    this.details = options.details || null
  }

  toClientJSON() {
    return {
      type: this.type,
      code: this.code,
      message: this.message,
      ...(this.details && { details: this.details }),
    }
  }
}

class GatewayValidationError extends GatewayError {
  constructor(message, details) {
    super(message, { type: GATEWAY_ERROR_TYPES.VALIDATION, code: 'MJ_GW_VALIDATION', statusCode: 400, details })
    this.name = 'GatewayValidationError'
  }
}

class GatewayInternalError extends GatewayError {
  constructor(message) {
    super(message, { type: GATEWAY_ERROR_TYPES.INTERNAL, code: 'MJ_GW_INTERNAL', statusCode: 500 })
    this.name = 'GatewayInternalError'
  }
}

class GatewayPipelineError extends GatewayError {
  constructor(message, details) {
    super(message, { type: GATEWAY_ERROR_TYPES.PIPELINE, code: 'MJ_GW_PIPELINE', statusCode: 502, details })
    this.name = 'GatewayPipelineError'
  }
}

class GatewayPlannerError extends GatewayError {
  constructor(message) {
    super(message, { type: GATEWAY_ERROR_TYPES.PLANNER, code: 'MJ_GW_PLANNER', statusCode: 500 })
    this.name = 'GatewayPlannerError'
  }
}

class GatewayMemoryError extends GatewayError {
  constructor(message) {
    super(message, { type: GATEWAY_ERROR_TYPES.MEMORY, code: 'MJ_GW_MEMORY', statusCode: 500 })
    this.name = 'GatewayMemoryError'
  }
}

class GatewayAgentError extends GatewayError {
  constructor(message) {
    super(message, { type: GATEWAY_ERROR_TYPES.AGENT, code: 'MJ_GW_AGENT', statusCode: 500 })
    this.name = 'GatewayAgentError'
  }
}

function mapErrorToGateway(error) {
  if (error instanceof GatewayError) return error

  const { ValidationError } = require('../errors')
  if (error instanceof ValidationError) {
    return new GatewayValidationError(error.message, error.context)
  }

  if (error.message?.includes('pipeline')) {
    return new GatewayPipelineError(error.message)
  }
  if (error.message?.includes('plan')) {
    return new GatewayPlannerError(error.message)
  }
  if (error.message?.includes('memory')) {
    return new GatewayMemoryError(error.message)
  }
  if (error.message?.includes('agent')) {
    return new GatewayAgentError(error.message)
  }

  return new GatewayError(error.message || 'An unexpected error occurred', {
    type: GATEWAY_ERROR_TYPES.UNKNOWN,
    code: 'MJ_GW_UNKNOWN',
    statusCode: 500,
  })
}

module.exports = {
  GATEWAY_ERROR_TYPES,
  GatewayError,
  GatewayValidationError,
  GatewayInternalError,
  GatewayPipelineError,
  GatewayPlannerError,
  GatewayMemoryError,
  GatewayAgentError,
  mapErrorToGateway,
}
