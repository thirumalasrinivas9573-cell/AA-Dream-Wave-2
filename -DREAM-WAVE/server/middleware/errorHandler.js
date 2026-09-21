const logger = require('../utils/logger');
const { classifyFailure } = require('../utils/retry');
const { recordErrorClass } = require('../utils/metrics');

class AppError extends Error {
  constructor(message, statusCode = 500, options = {}) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = options.isOperational !== false;
    this.failureClass = options.failureClass || classifyFailure(this, statusCode);
    this.code = options.code || '';
  }
}

const notFound = (req, _res, next) => {
  next(new AppError(`Not found — ${req.originalUrl}`, 404, { failureClass: 'not_found' }));
};

const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Server error';
  let failureClass = err.failureClass || classifyFailure(err, statusCode);

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
    failureClass = 'validation';
    err.isOperational = true;
  }
  if (err.code === 11000) {
    statusCode = 400;
    message = 'Duplicate field value entered';
    failureClass = 'validation';
    err.isOperational = true;
  }
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid resource identifier';
    failureClass = 'validation';
    err.isOperational = true;
  }
  if (
    err.name === 'BSONError' ||
    err.name === 'BSONTypeError' ||
    (typeof err.message === 'string' && err.message.includes('input must be a 24 character hex string'))
  ) {
    statusCode = 400;
    message = 'Invalid resource identifier';
    failureClass = 'validation';
    err.isOperational = true;
  }
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    failureClass = 'auth';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    failureClass = 'auth';
  }
  if (err.name === 'MulterError') {
    statusCode = 400;
    message = err.message;
    failureClass = 'upload';
    err.isOperational = true;
  }
  if (
    typeof message === 'string' &&
    (/file type not allowed/i.test(message) ||
      /only image files are allowed/i.test(message) ||
      /only video, audio/i.test(message) ||
      /file too large/i.test(message))
  ) {
    statusCode = 400;
    failureClass = 'upload';
    err.isOperational = true;
  }
  if (typeof message === 'string' && message.startsWith('CORS blocked')) {
    statusCode = 403;
    message = 'Origin not allowed';
    failureClass = 'auth';
  }

  recordErrorClass(failureClass);

  const isProd = process.env.NODE_ENV === 'production';
  const logMeta = {
    statusCode,
    failureClass,
    path: req.originalUrl,
    method: req.method,
    requestId: req.requestId,
    userId: req.user?._id ? String(req.user._id) : undefined,
    code: err.code || undefined,
  };

  if (statusCode >= 500 || !err.isOperational) {
    logger.error(message, { ...logMeta, stack: err.stack });
  } else {
    logger.warn(message, logMeta);
  }

  res.status(statusCode).json({
    success: false,
    message: isProd && statusCode >= 500 ? 'Internal server error' : message,
    failureClass,
    ...(req.requestId ? { requestId: req.requestId } : {}),
    ...(!isProd && statusCode >= 500 ? { stack: err.stack } : {}),
  });
};

module.exports = { AppError, notFound, errorHandler };
