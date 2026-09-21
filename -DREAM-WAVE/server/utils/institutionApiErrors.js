/** Consistent institution API error responses */

const ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE: 'DUPLICATE',
  IMPORT_FAILED: 'IMPORT_FAILED',
  EXPORT_FAILED: 'EXPORT_FAILED',
  SERVER_ERROR: 'SERVER_ERROR',
}

function apiError(message, statusCode = 400, code = ERROR_CODES.SERVER_ERROR, details = null) {
  const err = new Error(message)
  err.statusCode = statusCode
  err.code = code
  if (details) err.details = details
  return err
}

function sendApiError(res, error) {
  const status = error.statusCode || 500
  const code = error.code || (status === 403 ? ERROR_CODES.PERMISSION_DENIED : status === 404 ? ERROR_CODES.NOT_FOUND : status === 400 ? ERROR_CODES.VALIDATION_FAILED : ERROR_CODES.SERVER_ERROR)
  const body = {
    success: false,
    code,
    message: error.message || 'Request failed',
  }
  if (error.details) body.details = error.details
  res.status(status).json(body)
}

module.exports = {
  ERROR_CODES,
  apiError,
  sendApiError,
}
